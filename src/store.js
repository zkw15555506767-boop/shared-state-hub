import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { archiveEventEnvelope } from "./archive.js";
import { getAppPaths } from "./app-paths.js";

export const DEFAULT_DATA_DIR = path.join(os.homedir(), ".shared-state-hub");
export const DEFAULT_DB_PATH = path.join(DEFAULT_DATA_DIR, "hub.db");

const SCHEMA_SQL = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  task_id TEXT,
  timestamp TEXT NOT NULL,
  source_client TEXT NOT NULL,
  source_session_id TEXT,
  source_connector_level TEXT,
  source_cwd TEXT,
  source_json TEXT,
  payload_json TEXT NOT NULL,
  evidence_json TEXT,
  visibility TEXT NOT NULL DEFAULT 'task',
  risk TEXT NOT NULL DEFAULT 'low',
  raw_json TEXT NOT NULL,
  archive_path TEXT,
  archive_offset INTEGER,
  archive_length INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_events_task_time ON events(task_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_events_source_session ON events(source_client, source_session_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);

CREATE TABLE IF NOT EXISTS snapshots (
  task_id TEXT PRIMARY KEY,
  state_json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

const MAX_SQLITE_OUTPUT_BYTES = 64 * 1024 * 1024;

export function initDatabase(dbPath = DEFAULT_DB_PATH) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  runSql(dbPath, SCHEMA_SQL);
  ensureEventColumns(dbPath);
  return dbPath;
}

export function insertEvent(event, dbPath = DEFAULT_DB_PATH) {
  initDatabase(dbPath);
  if (eventExists(event.id, dbPath)) return false;
  const archive = archiveEventEnvelope(event, archiveOptions(dbPath));

  const sql = `
INSERT OR IGNORE INTO events (
  id,
  type,
  task_id,
  timestamp,
  source_client,
  source_session_id,
  source_connector_level,
  source_cwd,
  source_json,
  payload_json,
  evidence_json,
  visibility,
  risk,
  raw_json,
  archive_path,
  archive_offset,
  archive_length
) VALUES (
  ${sqlString(event.id)},
  ${sqlString(event.type)},
  ${sqlNullable(event.taskId)},
  ${sqlString(event.timestamp)},
  ${sqlString(event.source.client)},
  ${sqlNullable(event.source.sessionId)},
  ${sqlNullable(event.source.connectorLevel)},
  ${sqlNullable(event.source.cwd)},
  ${sqlString(JSON.stringify(event.source ?? {}))},
  ${sqlString(JSON.stringify(event.payload ?? {}))},
  ${sqlNullable(event.evidence ? JSON.stringify(event.evidence) : null)},
  ${sqlString(event.visibility ?? "task")},
  ${sqlString(event.risk ?? "low")},
  '{}',
  ${sqlString(archive.path)},
  ${archive.offset},
  ${archive.length}
);
`;

  runSql(dbPath, sql);
  return true;
}

export function insertEvents(events, dbPath = DEFAULT_DB_PATH) {
  initDatabase(dbPath);

  for (const event of events) {
    insertEvent(event, dbPath);
  }
}

export function listEvents({ taskId, dbPath = DEFAULT_DB_PATH, limit } = {}) {
  initDatabase(dbPath);

  const where = taskId ? `WHERE task_id = ${sqlString(taskId)}` : "";
  const safeLimit = normalizeLimit(limit);
  const sql = safeLimit
    ? `SELECT * FROM (
        SELECT ${eventSelectColumns()}
        FROM events ${where}
        ORDER BY timestamp DESC, created_at DESC
        LIMIT ${safeLimit}
      ) ORDER BY timestamp ASC, created_at ASC;`
    : `SELECT ${eventSelectColumns()} FROM events ${where} ORDER BY timestamp ASC, created_at ASC;`;
  const rows = JSON.parse(runSql(dbPath, sql, { json: true }) || "[]");

  return rows.map(hydrateEvent);
}

export function listTaskIds({ dbPath = DEFAULT_DB_PATH } = {}) {
  initDatabase(dbPath);
  const output = runSql(
    dbPath,
    "SELECT DISTINCT task_id FROM events WHERE task_id IS NOT NULL AND task_id != '' ORDER BY task_id ASC;"
  );
  return output
    .split("\n")
    .map((value) => value.trim())
    .filter(Boolean);
}

export function upsertSnapshot(taskId, state, dbPath = DEFAULT_DB_PATH) {
  initDatabase(dbPath);

  const sql = `
INSERT INTO snapshots (task_id, state_json, updated_at)
VALUES (${sqlString(taskId)}, ${sqlString(JSON.stringify(state))}, datetime('now'))
ON CONFLICT(task_id) DO UPDATE SET
  state_json = excluded.state_json,
  updated_at = datetime('now');
`;

  runSql(dbPath, sql);
}

export function compactLegacyRawEvents({ dbPath = DEFAULT_DB_PATH } = {}) {
  initDatabase(dbPath);
  const rows = JSON.parse(
    runSql(
      dbPath,
      `SELECT ${eventSelectColumns()} FROM events WHERE raw_json IS NOT NULL AND raw_json != '' AND raw_json != '{}';`,
      { json: true }
    ) || "[]"
  );
  const updates = [];

  for (const row of rows) {
    const event = hydrateEvent(row);
    const archive = archiveEventEnvelope(event, archiveOptions(dbPath));
    updates.push(`
      UPDATE events SET
        source_json = ${sqlString(JSON.stringify(event.source ?? {}))},
        raw_json = '{}',
        archive_path = ${sqlString(archive.path)},
        archive_offset = ${archive.offset},
        archive_length = ${archive.length}
      WHERE id = ${sqlString(event.id)};
    `);
  }

  if (updates.length) runSql(dbPath, `BEGIN;${updates.join("\n")}COMMIT;`);
  return { compactedEvents: updates.length };
}

export function getEventStorageStats({ dbPath = DEFAULT_DB_PATH } = {}) {
  initDatabase(dbPath);
  const row = JSON.parse(
    runSql(
      dbPath,
      "SELECT COUNT(*) AS event_count, COALESCE(SUM(LENGTH(raw_json)), 0) AS raw_json_bytes, COALESCE(SUM(LENGTH(payload_json)), 0) AS payload_bytes FROM events;",
      { json: true }
    ) || "[]"
  )[0] ?? {};
  return {
    dbPath,
    dbBytes: fs.existsSync(dbPath) ? fs.statSync(dbPath).size : 0,
    eventCount: Number(row.event_count ?? 0),
    rawJsonBytes: Number(row.raw_json_bytes ?? 0),
    payloadBytes: Number(row.payload_bytes ?? 0),
    archiveDir: archiveOptions(dbPath).archiveDir
  };
}

export function vacuumDatabase({ dbPath = DEFAULT_DB_PATH } = {}) {
  initDatabase(dbPath);
  runSql(dbPath, "VACUUM;");
  return getEventStorageStats({ dbPath });
}

function runSql(dbPath, sql, options = {}) {
  const args = options.json ? ["-json", dbPath, sql] : options.csv ? ["-csv", dbPath, sql] : [dbPath, sql];
  return execFileSync("sqlite3", args, {
    encoding: "utf8",
    maxBuffer: options.maxBuffer ?? MAX_SQLITE_OUTPUT_BYTES
  });
}

function ensureEventColumns(dbPath) {
  const existing = runSql(dbPath, "PRAGMA table_info(events);")
    .split("\n")
    .map((line) => line.split("|")[1])
    .filter(Boolean);
  const columns = {
    source_json: "TEXT",
    archive_path: "TEXT",
    archive_offset: "INTEGER",
    archive_length: "INTEGER"
  };

  for (const [name, definition] of Object.entries(columns)) {
    if (!existing.includes(name)) runSql(dbPath, `ALTER TABLE events ADD COLUMN ${name} ${definition};`);
  }
}

function eventExists(eventId, dbPath) {
  return runSql(dbPath, `SELECT 1 FROM events WHERE id = ${sqlString(eventId)} LIMIT 1;`).trim() === "1";
}

function archiveOptions(dbPath) {
  const paths = getAppPaths();
  const archiveDir = process.env.HUB_ARCHIVE_DIR ??
    (path.resolve(dbPath) === path.resolve(paths.databasePath)
      ? paths.archiveDir
      : path.join(path.dirname(dbPath), "archive"));
  return { archiveDir };
}

function eventSelectColumns() {
  return "id, type, task_id, timestamp, source_client, source_session_id, source_connector_level, source_cwd, source_json, payload_json, evidence_json, visibility, risk, raw_json, archive_path, archive_offset, archive_length, created_at";
}

function hydrateEvent(row) {
  const legacy = parseJson(row.raw_json, {});
  const source = parseJson(row.source_json, legacy.source ?? {});
  const payload = parseJson(row.payload_json, legacy.payload ?? {});
  const evidence = parseJson(row.evidence_json, legacy.evidence);

  const normalizedSource = {
    ...source,
    client: row.source_client ?? source.client,
    sessionId: row.source_session_id ?? source.sessionId,
    connectorLevel: row.source_connector_level ?? source.connectorLevel,
    cwd: row.source_cwd ?? source.cwd
  };

  for (const key of Object.keys(normalizedSource)) {
    if (normalizedSource[key] === null || normalizedSource[key] === undefined) delete normalizedSource[key];
  }

  return removeUndefined({
    ...legacy,
    id: row.id,
    type: row.type,
    taskId: row.task_id ?? legacy.taskId,
    timestamp: row.timestamp,
    source: normalizedSource,
    payload,
    evidence,
    visibility: row.visibility,
    risk: row.risk
  });
}

function parseJson(value, fallback) {
  if (!value || value === "{}") return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function removeUndefined(value) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined && item !== null));
}

function normalizeLimit(value) {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return undefined;
  return Math.min(parsed, 5_000);
}

function sqlNullable(value) {
  if (value === undefined || value === null) return "NULL";
  return sqlString(value);
}

function sqlString(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}
