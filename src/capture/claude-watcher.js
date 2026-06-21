#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { ingestCapture } from "./ingest.js";
import { updateConnectorStatus } from "./status.js";
import { truncateText } from "./redact.js";

const claudeProjectsRoot =
  process.env.CLAUDE_PROJECTS_DIR ?? path.join(os.homedir(), ".claude", "projects");
const taskId = process.env.HUB_CAPTURE_TASK_ID ?? "task_shared_state_hub";
const mode = process.env.HUB_CAPTURE_MODE ?? "summary";
const pollMs = Number(process.env.HUB_CAPTURE_POLL_MS ?? 1500);
const once = process.argv.includes("--once");
const sinceStart = process.argv.includes("--since-start");
const offsets = new Map();
const seenIds = new Set();

updateConnectorStatus("claude-code-watcher", {
  status: "starting",
  taskId,
  mode,
  projectsRoot: claudeProjectsRoot
});

if (!fs.existsSync(claudeProjectsRoot)) {
  updateConnectorStatus("claude-code-watcher", {
    status: "missing_projects_dir",
    error: `Missing ${claudeProjectsRoot}`
  });
  process.exit(0);
}

if (sinceStart) {
  for (const filePath of listJsonlFiles(claudeProjectsRoot)) {
    offsets.set(filePath, fs.statSync(filePath).size);
  }
}

await scanOnce();

if (once) {
  updateConnectorStatus("claude-code-watcher", { status: "stopped", reason: "once" });
  process.exit(0);
}

updateConnectorStatus("claude-code-watcher", {
  status: "running",
  taskId,
  mode,
  projectsRoot: claudeProjectsRoot
});

setInterval(() => {
  scanOnce().catch((error) => {
    updateConnectorStatus("claude-code-watcher", {
      status: "error",
      error: error.message
    });
  });
}, pollMs);

async function scanOnce() {
  let captured = 0;

  for (const filePath of listJsonlFiles(claudeProjectsRoot)) {
    const lines = readNewLines(filePath);
    for (const line of lines) {
      const capture = parseClaudeLine(line, filePath);
      if (!capture) continue;
      try {
        ingestCapture(capture, { mode });
        captured += 1;
      } catch (error) {
        updateConnectorStatus("claude-code-watcher", {
          status: "error",
          error: error.message,
          sourcePath: filePath
        });
      }
    }
  }

  updateConnectorStatus("claude-code-watcher", {
    status: once ? "scanned" : "running",
    lastScanAt: new Date().toISOString(),
    lastCapturedCount: captured,
    mode,
    taskId
  });
}

function parseClaudeLine(line, sourcePath) {
  let record;
  try {
    record = JSON.parse(line);
  } catch {
    return undefined;
  }

  const timestamp = record.timestamp ?? new Date().toISOString();
  const sessionId = record.sessionId ?? inferSessionId(sourcePath);
  const cwd = record.cwd;

  if (record.type === "user" && record.message?.role === "user") {
    const text = extractText(record.message.content);
    if (!text) return undefined;
    return withDedupe({
      client: "claude-code",
      kind: "user_prompt",
      sessionId,
      timestamp,
      cwd,
      taskId,
      summary: `Claude Code user prompt: ${truncateText(text, 260)}`,
      text,
      intent: text,
      sourcePath
    });
  }

  if (record.type === "assistant" && record.message?.role === "assistant") {
    const text = extractAssistantText(record.message.content);
    if (!text) return undefined;
    return withDedupe({
      client: "claude-code",
      kind: "assistant_message",
      sessionId,
      timestamp,
      cwd,
      taskId,
      summary: `Claude Code assistant update: ${truncateText(text, 260)}`,
      text,
      sourcePath
    });
  }

  if (record.type === "user" && record.toolUseResult) {
    return withDedupe({
      client: "claude-code",
      kind: "tool_completed",
      sessionId,
      timestamp,
      cwd,
      taskId,
      summary: "Claude Code completed a tool call",
      status: record.toolUseResult?.is_error ? "failed" : "completed",
      sourcePath
    });
  }

  if (record.type === "system" && record.subtype) {
    return withDedupe({
      client: "claude-code",
      kind: record.subtype === "session_end" ? "session_stopped" : "task_update",
      sessionId,
      timestamp,
      cwd,
      taskId,
      summary: `Claude Code system event: ${record.subtype}`,
      sourcePath
    });
  }

  return undefined;
}

function readNewLines(filePath) {
  const stat = fs.statSync(filePath);
  const start = offsets.get(filePath) ?? 0;
  if (stat.size < start) offsets.set(filePath, 0);
  if (stat.size === (offsets.get(filePath) ?? 0)) return [];

  const currentStart = offsets.get(filePath) ?? 0;
  const fd = fs.openSync(filePath, "r");
  const size = stat.size - currentStart;
  const buffer = Buffer.alloc(size);
  fs.readSync(fd, buffer, 0, size, currentStart);
  fs.closeSync(fd);
  offsets.set(filePath, stat.size);
  return buffer.toString("utf8").split("\n").filter(Boolean);
}

function listJsonlFiles(root) {
  const files = [];
  walk(root, files);
  return files
    .filter((filePath) => filePath.endsWith(".jsonl"))
    .sort((left, right) => fs.statSync(right).mtimeMs - fs.statSync(left).mtimeMs)
    .slice(0, 100);
}

function walk(directory, files) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(fullPath, files);
    else files.push(fullPath);
  }
}

function extractText(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item;
        if (item?.text) return item.text;
        if (item?.type === "text" && item.text) return item.text;
        return "";
      })
      .filter(Boolean)
      .join("\n");
  }
  if (typeof value === "object" && value.text) return value.text;
  return "";
}

function extractAssistantText(value) {
  if (!Array.isArray(value)) return extractText(value);
  return value
    .filter((item) => item?.type === "text" || item?.text)
    .map((item) => item.text ?? "")
    .filter(Boolean)
    .join("\n");
}

function inferSessionId(filePath) {
  return path.basename(filePath, ".jsonl");
}

function withDedupe(capture) {
  const key = `${capture.sourcePath}:${capture.timestamp}:${capture.kind}:${capture.summary}`;
  if (seenIds.has(key)) return undefined;
  seenIds.add(key);
  return capture;
}
