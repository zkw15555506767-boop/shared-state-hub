#!/usr/bin/env node
import fs from "node:fs";
import { ingestCapture } from "./ingest.js";
import { updateConnectorStatus } from "./status.js";
import { truncateText } from "./redact.js";

const taskId = process.env.HUB_CAPTURE_TASK_ID ?? "task_shared_state_hub";
const mode = process.env.HUB_CAPTURE_MODE ?? "summary";

const stdin = fs.readFileSync(0, "utf8");
let input = {};
try {
  input = stdin.trim() ? JSON.parse(stdin) : {};
} catch {
  input = {
    raw: stdin
  };
}

try {
  const capture = hookInputToCapture(input);
  if (!capture) {
    updateConnectorStatus("claude-code-hook", {
      status: "ignored",
      lastHookName: getHookName(input),
      taskId,
      mode
    });
    process.exit(0);
  }

  const event = ingestCapture(capture, { mode });
  updateConnectorStatus("claude-code-hook", {
    status: "captured",
    lastCapturedAt: new Date().toISOString(),
    lastHookName: getHookName(input),
    lastEventId: event.id,
    taskId,
    mode
  });
} catch (error) {
  updateConnectorStatus("claude-code-hook", {
    status: "error",
    error: error.message,
    lastHookName: getHookName(input),
    taskId,
    mode
  });
}

function hookInputToCapture(value) {
  const hookName = getHookName(value);
  const sessionId = value.session_id ?? value.sessionId ?? value.conversation_id;
  const cwd = value.cwd ?? value.workspace ?? process.cwd();
  const timestamp = value.timestamp ?? new Date().toISOString();

  if (hookName === "UserPromptSubmit") {
    const prompt = value.prompt ?? value.user_prompt ?? value.message ?? value.text ?? value.raw;
    if (!prompt) return undefined;
    return {
      client: "claude-code",
      kind: "user_prompt",
      sessionId,
      timestamp,
      cwd,
      taskId,
      summary: `Claude Code user prompt: ${truncateText(prompt, 260)}`,
      text: prompt,
      intent: prompt,
      sourcePath: value.transcript_path
    };
  }

  if (hookName === "SessionStart") {
    return {
      client: "claude-code",
      kind: "session_started",
      sessionId,
      timestamp,
      cwd,
      taskId,
      summary: `Claude Code session started${cwd ? ` in ${cwd}` : ""}`,
      sourcePath: value.transcript_path
    };
  }

  if (hookName === "Stop" || hookName === "SessionEnd") {
    return {
      client: "claude-code",
      kind: "task_update",
      sessionId,
      timestamp,
      cwd,
      taskId,
      summary: `Claude Code ${hookName === "Stop" ? "completed a turn" : "ended a session"}`,
      sourcePath: value.transcript_path
    };
  }

  if (hookName === "PreToolUse") {
    const tool = value.tool_name ?? value.toolName ?? value.name;
    return {
      client: "claude-code",
      kind: "tool_started",
      sessionId,
      timestamp,
      cwd,
      taskId,
      summary: `Claude Code started tool ${tool ?? "unknown"}`,
      tool,
      sourcePath: value.transcript_path
    };
  }

  if (hookName === "PostToolUse" || hookName === "PostToolUseFailure") {
    const tool = value.tool_name ?? value.toolName ?? value.name;
    const failed = hookName === "PostToolUseFailure" || value.error;
    return {
      client: "claude-code",
      kind: "tool_completed",
      sessionId,
      timestamp,
      cwd,
      taskId,
      summary: `Claude Code ${failed ? "failed" : "completed"} tool ${tool ?? "unknown"}`,
      tool,
      status: failed ? "failed" : "completed",
      sourcePath: value.transcript_path,
      risk: failed ? "medium" : "low"
    };
  }

  return undefined;
}

function getHookName(value) {
  return value.hook_event_name ?? value.hookEventName ?? value.eventName ?? value.event ?? value.type;
}
