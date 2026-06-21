#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { getArchiveStats, pruneEventArchives } from "./archive.js";
import { compactLegacyRawEvents, getEventStorageStats, insertEvent, listEvents } from "./store.js";

const root = path.join(os.tmpdir(), `shared-state-hub-storage-fixture-${process.pid}`);
const dbPath = path.join(root, "hub.db");
const event = {
  id: "evt_storage_current",
  type: "context.added",
  taskId: "task_storage",
  timestamp: "2026-06-21T10:00:00.000Z",
  source: { client: "fixture", sessionId: "session-1", connectorLevel: "capture", cwd: "/tmp/project", agentId: "agent-1" },
  payload: { summary: "Keep the same state", content: "Longer content remains available from the indexed event." },
  evidence: { files: ["src/store.js"] },
  visibility: "task",
  risk: "low"
};

insertEvent(event, dbPath);
assert.deepEqual(listEvents({ taskId: event.taskId, dbPath }), [event]);

const firstStats = getEventStorageStats({ dbPath });
assert.equal(firstStats.rawJsonBytes, 2);
assert.equal(getArchiveStats({ archiveDir: firstStats.archiveDir }).files, 1);

const legacyEvent = {
  ...event,
  id: "evt_storage_legacy",
  timestamp: "2026-03-01T10:00:00.000Z",
  source: { ...event.source, sessionId: "session-2" }
};
insertEvent(legacyEvent, dbPath);
execFileSync("sqlite3", [
  dbPath,
  `UPDATE events SET raw_json = ${sqlString(JSON.stringify(legacyEvent))}, source_json = NULL, archive_path = NULL, archive_offset = NULL, archive_length = NULL WHERE id = ${sqlString(legacyEvent.id)};`
]);

const before = listEvents({ taskId: event.taskId, dbPath });
const compacted = compactLegacyRawEvents({ dbPath });
const after = listEvents({ taskId: event.taskId, dbPath });
assert.equal(compacted.compactedEvents, 1);
assert.deepEqual(after, before);

const pruned = pruneEventArchives({ archiveDir: firstStats.archiveDir, retentionDays: 30 });
assert.equal(pruned.deletedFiles, 1);
assert.deepEqual(listEvents({ taskId: event.taskId, dbPath }), before);

fs.rmSync(root, { recursive: true, force: true });
console.log("OK: local storage tiering fixture passed");

function sqlString(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}
