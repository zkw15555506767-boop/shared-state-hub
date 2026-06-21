import fs from "node:fs";
import path from "node:path";
import { getAppPaths } from "./app-paths.js";

export const DEFAULT_ARCHIVE_RETENTION_DAYS = 30;

export function archiveEventEnvelope(event, options = {}) {
  const archiveDir = options.archiveDir ?? getAppPaths().archiveDir;
  const eventDate = toDateKey(event.timestamp);
  const month = eventDate.slice(0, 7);
  const taskName = safeFilePart(event.taskId ?? "unassigned");
  const filePath = path.join(archiveDir, month, `${eventDate}-${taskName}.jsonl`);
  const record = `${JSON.stringify({ version: 1, archivedAt: new Date().toISOString(), event })}\n`;

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const offset = fs.existsSync(filePath) ? fs.statSync(filePath).size : 0;
  fs.appendFileSync(filePath, record);

  return {
    path: filePath,
    offset,
    length: Buffer.byteLength(record)
  };
}

export function getArchiveStats(options = {}) {
  const archiveDir = options.archiveDir ?? getAppPaths().archiveDir;
  const files = listArchiveFiles(archiveDir);
  return {
    archiveDir,
    files: files.length,
    bytes: files.reduce((total, filePath) => total + fs.statSync(filePath).size, 0)
  };
}

export function pruneEventArchives(options = {}) {
  const archiveDir = options.archiveDir ?? getAppPaths().archiveDir;
  const retentionDays = normalizeRetentionDays(options.retentionDays);
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - retentionDays);
  const cutoffKey = toDateKey(cutoff.toISOString());
  let deletedFiles = 0;
  let deletedBytes = 0;

  for (const filePath of listArchiveFiles(archiveDir)) {
    const dateKey = path.basename(filePath).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey) || dateKey >= cutoffKey) continue;
    deletedBytes += fs.statSync(filePath).size;
    fs.rmSync(filePath);
    deletedFiles += 1;
  }

  return { archiveDir, retentionDays, deletedFiles, deletedBytes };
}

function listArchiveFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  const files = [];
  walk(directory, files);
  return files.filter((filePath) => filePath.endsWith(".jsonl"));
}

function walk(directory, files) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(filePath, files);
    else if (entry.isFile()) files.push(filePath);
  }
}

function toDateKey(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString().slice(0, 10) : date.toISOString().slice(0, 10);
}

function safeFilePart(value) {
  return String(value).replace(/[^a-z0-9_-]+/gi, "_").slice(0, 80) || "unassigned";
}

function normalizeRetentionDays(value) {
  const parsed = Number(value ?? DEFAULT_ARCHIVE_RETENTION_DAYS);
  if (!Number.isInteger(parsed) || parsed < 1) return DEFAULT_ARCHIVE_RETENTION_DAYS;
  return Math.min(parsed, 3650);
}
