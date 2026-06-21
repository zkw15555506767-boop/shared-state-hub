#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { ingestCapture } from "./ingest.js";
import { updateConnectorStatus } from "./status.js";
import { truncateText } from "./redact.js";

const codexRoot = process.env.CODEX_HOME ?? path.join(os.homedir(), ".codex");
const sessionsRoot = process.env.CODEX_SESSIONS_DIR ?? path.join(codexRoot, "sessions");
const taskId = process.env.HUB_CAPTURE_TASK_ID ?? "task_shared_state_hub";
const mode = process.env.HUB_CAPTURE_MODE ?? "summary";
const pollMs = Number(process.env.HUB_CAPTURE_POLL_MS ?? 1500);
const once = process.argv.includes("--once");
const sinceStart = process.argv.includes("--since-start");
const offsets = new Map();
const seenIds = new Set();

updateConnectorStatus("codex-app", {
  status: "starting",
  taskId,
  mode,
  sessionsRoot
});

if (!fs.existsSync(sessionsRoot)) {
  updateConnectorStatus("codex-app", {
    status: "missing_sessions_dir",
    error: `Missing ${sessionsRoot}`
  });
  process.exit(0);
}

if (sinceStart) {
  for (const filePath of listJsonlFiles(sessionsRoot)) {
    offsets.set(filePath, fs.statSync(filePath).size);
  }
}

await scanOnce();

if (once) {
  updateConnectorStatus("codex-app", { status: "stopped", reason: "once" });
  process.exit(0);
}

updateConnectorStatus("codex-app", {
  status: "running",
  taskId,
  mode,
  sessionsRoot
});

setInterval(() => {
  scanOnce().catch((error) => {
    updateConnectorStatus("codex-app", {
      status: "error",
      error: error.message
    });
  });
}, pollMs);

async function scanOnce() {
  let captured = 0;

  for (const filePath of listJsonlFiles(sessionsRoot)) {
    captured += readNewLines(filePath)
      .map((line) => parseCodexLine(line, filePath))
      .filter(Boolean)
      .map((capture) => {
        try {
          ingestCapture(capture, { mode });
          return 1;
        } catch (error) {
          updateConnectorStatus("codex-app", {
            status: "error",
            error: error.message,
            sourcePath: filePath
          });
          return 0;
        }
      })
      .reduce((sum, value) => sum + value, 0);
  }

  updateConnectorStatus("codex-app", {
    status: once ? "scanned" : "running",
    lastScanAt: new Date().toISOString(),
    lastCapturedCount: captured,
    mode,
    taskId
  });
}

function parseCodexLine(line, sourcePath) {
  let record;
  try {
    record = JSON.parse(line);
  } catch {
    return undefined;
  }

  const payload = record.payload ?? {};
  const timestamp = record.timestamp ?? payload.timestamp ?? new Date().toISOString();
  const sessionId = inferSessionId(sourcePath);
  const cwd = payload.cwd;
  const sourceOffset = offsets.get(sourcePath);

  if (record.type === "session_meta") {
    return withDedupe({
      client: "codex",
      kind: "session_started",
      sessionId: payload.id ?? sessionId,
      timestamp,
      cwd: payload.cwd,
      taskId,
      summary: `Codex App session started${payload.cwd ? ` in ${payload.cwd}` : ""}`,
      sourcePath,
      sourceOffset
    });
  }

  if (record.type === "event_msg" && payload.type === "user_message") {
    const text = extractText(payload.message ?? payload.text_elements ?? payload.text);
    if (!text) return undefined;
    return withDedupe({
      client: "codex",
      kind: "user_prompt",
      sessionId,
      timestamp,
      cwd,
      taskId,
      summary: `Codex user prompt: ${truncateText(text, 260)}`,
      text,
      intent: text,
      sourcePath,
      sourceOffset
    });
  }

  if (record.type === "response_item" && payload.type === "message" && payload.role === "assistant") {
    const text = extractText(payload.content);
    if (!text) return undefined;
    return withDedupe({
      client: "codex",
      kind: "assistant_message",
      sessionId,
      timestamp,
      cwd,
      taskId,
      summary: `Codex assistant update: ${truncateText(text, 260)}`,
      text,
      sourcePath,
      sourceOffset
    });
  }

  if (record.type === "response_item" && payload.type === "function_call") {
    return withDedupe({
      client: "codex",
      kind: "tool_started",
      sessionId,
      timestamp,
      cwd,
      taskId,
      summary: `Codex started tool ${payload.name ?? "unknown"}`,
      tool: payload.name,
      sourcePath,
      sourceOffset
    });
  }

  if (record.type === "response_item" && payload.type === "function_call_output") {
    return withDedupe({
      client: "codex",
      kind: "tool_completed",
      sessionId,
      timestamp,
      cwd,
      taskId,
      summary: `Codex completed tool call ${payload.call_id ?? ""}`.trim(),
      status: "completed",
      sourcePath,
      sourceOffset
    });
  }

  if (record.type === "event_msg" && payload.type === "agent_message") {
    const text = payload.message;
    if (!text) return undefined;
    return withDedupe({
      client: "codex",
      kind: "assistant_message",
      sessionId,
      timestamp,
      cwd,
      taskId,
      summary: `Codex status: ${truncateText(text, 260)}`,
      text,
      sourcePath,
      sourceOffset
    });
  }

  return undefined;
}

function readNewLines(filePath) {
  const stat = fs.statSync(filePath);
  const start = offsets.get(filePath) ?? 0;
  if (stat.size < start) offsets.set(filePath, 0);
  if (stat.size === start) return [];

  const fd = fs.openSync(filePath, "r");
  const size = stat.size - (offsets.get(filePath) ?? 0);
  const buffer = Buffer.alloc(size);
  fs.readSync(fd, buffer, 0, size, offsets.get(filePath) ?? 0);
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
    .slice(0, 80);
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
        if (item?.type === "output_text" && item.text) return item.text;
        return "";
      })
      .filter(Boolean)
      .join("\n");
  }
  if (typeof value === "object" && value.text) return value.text;
  return "";
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
