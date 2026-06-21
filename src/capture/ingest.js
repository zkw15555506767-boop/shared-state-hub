import { DEFAULT_DB_PATH, insertEvent } from "../store.js";
import { validateEvent } from "../model.js";
import { truncateText } from "./redact.js";

let eventCounter = 0;

export function ingestCapture(input, options = {}) {
  const dbPath = options.dbPath ?? process.env.HUB_DB ?? DEFAULT_DB_PATH;
  const mode = options.mode ?? process.env.HUB_CAPTURE_MODE ?? "summary";
  const event = captureToEvent(input, { mode });
  const errors = validateEvent(event);
  if (errors.length) throw new Error(errors.join("; "));
  insertEvent(event, dbPath);
  return event;
}

export function captureToEvent(input, options = {}) {
  const mode = options.mode ?? "summary";
  const timestamp = input.timestamp ?? new Date().toISOString();
  const source = {
    client: input.client,
    sessionId: input.sessionId,
    connectorLevel: input.connectorLevel ?? "capture",
    cwd: input.cwd
  };
  const taskId = input.taskId ?? process.env.HUB_CAPTURE_TASK_ID ?? "task_shared_state_hub";
  const basePayload = buildPayload(input, mode);

  return {
    id: input.id ?? nextEventId(input.client, input.kind, timestamp),
    type: kindToEventType(input.kind),
    taskId,
    timestamp,
    source,
    payload: basePayload,
    evidence: input.files?.length ? { files: input.files } : undefined,
    visibility: input.visibility ?? "task",
    risk: input.risk ?? "low"
  };
}

function buildPayload(input, mode) {
  const summary = truncateText(input.summary ?? input.text ?? input.kind ?? "Captured event", 360);
  const payload = {
    summary,
    captureKind: input.kind,
    captureMode: mode,
    sourcePath: input.sourcePath,
    sourceOffset: input.sourceOffset
  };

  if (input.intent) payload.userIntent = truncateText(input.intent, 600);
  if (input.files?.length) payload.files = input.files;

  if (mode === "prompt" || mode === "full") {
    payload.content = truncateText(input.text, mode === "full" ? 5000 : 1800);
  }

  if (input.tool) payload.tool = input.tool;
  if (input.status) payload.status = input.status;

  return removeUndefined(payload);
}

function kindToEventType(kind) {
  const map = {
    user_prompt: "user.prompt_submitted",
    assistant_message: "context.added",
    tool_started: "tool.started",
    tool_completed: "tool.completed",
    file_read: "file.read",
    file_edited: "file.edited",
    session_started: "agent.session_started",
    session_stopped: "agent.session_stopped",
    task_update: "task.updated"
  };
  return map[kind] ?? "context.added";
}

function nextEventId(client, kind, timestamp) {
  eventCounter += 1;
  const safeClient = String(client ?? "capture").replace(/[^a-z0-9_-]+/gi, "_");
  const safeKind = String(kind ?? "event").replace(/[^a-z0-9_-]+/gi, "_");
  const time = String(Date.parse(timestamp) || Date.now());
  return `evt_capture_${safeClient}_${safeKind}_${time}_${eventCounter}`;
}

function removeUndefined(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined && item !== null && item !== "")
  );
}
