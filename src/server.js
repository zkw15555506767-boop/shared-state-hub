import http from "node:http";
import { URL } from "node:url";
import { DEFAULT_DB_PATH, initDatabase, insertEvent, insertEvents, listEvents, listTaskIds, upsertSnapshot } from "./store.js";
import { validateEvent, validateEvents } from "./model.js";
import { getVisibleEvents, reduceEvents } from "./reducer.js";
import { generateJoinContext } from "./join-context.js";
import { renderDashboard, renderTaskDetail, renderTaskSettings } from "./ui.js";
import { readCaptureStatus } from "./capture/status.js";

export function startServer(options = {}) {
  const port = Number(options.port ?? process.env.HUB_PORT ?? 43177);
  const host = options.host ?? process.env.HUB_HOST ?? "127.0.0.1";
  const dbPath = options.dbPath ?? process.env.HUB_DB ?? DEFAULT_DB_PATH;

  initDatabase(dbPath);

  const server = http.createServer(async (request, response) => {
    try {
      await routeRequest({ request, response, dbPath });
    } catch (error) {
      writeJson(response, 500, {
        error: "internal_error",
        message: error.message
      });
    }
  });

  server.listen(port, host, () => {
    console.log(`Shared State Hub listening on http://${host}:${port}`);
    console.log(`Database: ${dbPath}`);
  });

  return server;
}

export async function routeRequest({ request, response, dbPath }) {
  const url = new URL(request.url, "http://localhost");
  const pathname = url.pathname;

  if (request.method === "GET" && pathname === "/health") {
    writeJson(response, 200, {
      ok: true,
      version: "0.0.1",
      dbPath
    });
    return;
  }

  if (request.method === "GET" && pathname === "/capture/status") {
    writeJson(response, 200, readCaptureStatus());
    return;
  }

  if (request.method === "GET" && pathname === "/") {
    const lang = url.searchParams.get("lang") ?? "zh";
    const tasks = readActiveTasks(dbPath);
    writeHtml(response, 200, renderDashboard(tasks, { lang, captureStatus: readCaptureStatus() }));
    return;
  }

  if (request.method === "POST" && pathname === "/events") {
    const body = await readBody(request);
    const events = Array.isArray(body) ? body : [body];
    const errors = validateEvents(events);

    if (errors.length) {
      writeJson(response, 400, { error: "invalid_events", details: errors });
      return;
    }

    insertEvents(events, dbPath);
    writeJson(response, 201, { recorded: events.length });
    return;
  }

  if (request.method === "GET" && pathname === "/events") {
    const taskId = url.searchParams.get("task") ?? undefined;
    const includeRedacted = url.searchParams.get("includeRedacted") === "true";
    const limit = readLimit(url.searchParams.get("limit"), 100);
    const events = listEvents({ taskId, dbPath, limit });
    writeJson(response, 200, {
      events: includeRedacted ? events : getVisibleEvents(events),
      limit
    });
    return;
  }

  if (request.method === "GET" && pathname === "/tasks/active") {
    const tasks = readActiveTasks(dbPath);
    writeJson(response, 200, { tasks });
    return;
  }

  const liveStateMatch = pathname.match(/^\/tasks\/([^/]+)\/live-state$/);
  if (request.method === "GET" && liveStateMatch) {
    const taskId = decodeURIComponent(liveStateMatch[1]);
    const state = reduceEvents(listEvents({ taskId, dbPath }));
    if (state.task.id !== "task_unknown") upsertSnapshot(state.task.id, state, dbPath);
    writeJson(response, 200, { state });
    return;
  }

  const taskPageMatch = pathname.match(/^\/tasks\/([^/]+)$/);
  if (request.method === "GET" && taskPageMatch) {
    const lang = url.searchParams.get("lang") ?? "zh";
    const taskId = decodeURIComponent(taskPageMatch[1]);
    const events = listEvents({ taskId, dbPath });
    const state = reduceEvents(events);
    writeHtml(response, 200, renderTaskDetail(state, events, { lang, captureStatus: readCaptureStatus() }));
    return;
  }

  const taskSettingsMatch = pathname.match(/^\/tasks\/([^/]+)\/settings$/);
  if (request.method === "GET" && taskSettingsMatch) {
    const lang = url.searchParams.get("lang") ?? "zh";
    const taskId = decodeURIComponent(taskSettingsMatch[1]);
    const events = listEvents({ taskId, dbPath });
    const state = reduceEvents(events);
    writeHtml(response, 200, renderTaskSettings(state, events, { lang, captureStatus: readCaptureStatus() }));
    return;
  }

  const updateTaskMatch = pathname.match(/^\/tasks\/([^/]+)\/update$/);
  if (request.method === "POST" && updateTaskMatch) {
    const taskId = decodeURIComponent(updateTaskMatch[1]);
    const body = await readBody(request);
    const event = buildTaskUpdatedEvent(taskId, body);
    const errors = validateEvent(event);

    if (errors.length) {
      writeJson(response, 400, { error: "invalid_task_update", details: errors });
      return;
    }

    insertEvent(event, dbPath);
    redirectAfterWrite(response, body.returnTo ?? `/tasks/${encodeURIComponent(taskId)}`);
    return;
  }

  const quickRecordMatch = pathname.match(/^\/tasks\/([^/]+)\/(context|decision|pitfall|artifact)$/);
  if (request.method === "POST" && quickRecordMatch) {
    const taskId = decodeURIComponent(quickRecordMatch[1]);
    const recordKind = quickRecordMatch[2];
    const body = await readBody(request);
    const event = buildQuickRecordEvent(taskId, recordKind, body);
    const errors = validateEvent(event);

    if (errors.length) {
      writeJson(response, 400, { error: "invalid_quick_record", details: errors });
      return;
    }

    insertEvent(event, dbPath);
    redirectAfterWrite(response, body.returnTo ?? `/tasks/${encodeURIComponent(taskId)}`);
    return;
  }

  const joinContextMatch = pathname.match(/^\/tasks\/([^/]+)\/join-context$/);
  if (request.method === "GET" && joinContextMatch) {
    const taskId = decodeURIComponent(joinContextMatch[1]);
    const budget = url.searchParams.get("budget") ?? "standard";
    const state = reduceEvents(listEvents({ taskId, dbPath }));
    writeText(response, 200, generateJoinContext(state, { budget }));
    return;
  }

  if (request.method === "POST" && pathname === "/claims") {
    const body = await readBody(request);
    const event = {
      id: body.id ?? `evt_claim_${Date.now()}`,
      type: "task.claimed",
      taskId: body.taskId,
      timestamp: body.timestamp ?? new Date().toISOString(),
      source: readSource(body, body.source),
      payload: {
        claimId: body.claimId,
        resourceType: body.resourceType,
        resource: body.resource,
        purpose: body.purpose,
        expiresAt: body.expiresAt
      },
      visibility: body.visibility ?? "task",
      risk: body.risk ?? "low"
    };
    const errors = validateEvent(event);

    if (errors.length) {
      writeJson(response, 400, { error: "invalid_claim", details: errors });
      return;
    }

    insertEvent(event, dbPath);
    writeJson(response, 201, { event });
    return;
  }

  const releaseClaimMatch = pathname.match(/^\/claims\/([^/]+)\/release$/);
  if (request.method === "POST" && releaseClaimMatch) {
    const body = await readBody(request);
    const claimId = decodeURIComponent(releaseClaimMatch[1]);
    const event = {
      id: body.id ?? `evt_release_${Date.now()}`,
      type: "task.released",
      taskId: body.taskId,
      timestamp: body.timestamp ?? new Date().toISOString(),
      source: readSource(body, body.source),
      payload: { claimId },
      visibility: body.visibility ?? "task",
      risk: body.risk ?? "low"
    };
    const errors = validateEvent(event);

    if (errors.length) {
      writeJson(response, 400, { error: "invalid_release", details: errors });
      return;
    }

    insertEvent(event, dbPath);
    if (body.returnTo) {
      redirectAfterWrite(response, body.returnTo);
    } else {
      writeJson(response, 201, { event });
    }
    return;
  }

  const redactEventMatch = pathname.match(/^\/events\/([^/]+)\/redact$/);
  if (request.method === "POST" && redactEventMatch) {
    const targetEventId = decodeURIComponent(redactEventMatch[1]);
    const body = await readBody(request);
    const event = buildRedactedEvent(targetEventId, body);
    const errors = validateEvent(event);

    if (errors.length) {
      writeJson(response, 400, { error: "invalid_redaction", details: errors });
      return;
    }

    insertEvent(event, dbPath);
    if (body.returnTo) {
      redirectAfterWrite(response, body.returnTo);
    } else {
      writeJson(response, 201, { event });
    }
    return;
  }

  writeJson(response, 404, { error: "not_found" });
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
    });
    request.on("end", () => {
      try {
        resolve(parseBody(body, request.headers?.["content-type"] ?? ""));
      } catch (error) {
        reject(new Error(`invalid request body: ${error.message}`));
      }
    });
    request.on("error", reject);
  });
}

function readActiveTasks(dbPath) {
  return listTaskIds({ dbPath }).map((taskId) => reduceEvents(listEvents({ taskId, dbPath })).task);
}

function readLimit(value, fallback) {
  if (value === null || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, 500);
}

function parseBody(body, contentType) {
  if (!body) return {};

  if (contentType.includes("application/x-www-form-urlencoded")) {
    return Object.fromEntries(new URLSearchParams(body));
  }

  return JSON.parse(body);
}

function buildTaskUpdatedEvent(taskId, body) {
  const payload = compactObject({
    title: emptyToUndefined(body.title),
    phase: emptyToUndefined(body.phase),
    status: emptyToUndefined(body.status),
    summary: emptyToUndefined(body.summary),
    nextSteps: splitLines(body.nextSteps ?? body.nextStep),
    blockers: splitLines(body.blockers ?? body.blocker),
    openQuestions: splitLines(body.openQuestions ?? body.openQuestion)
  });

  return {
    id: body.id ?? `evt_task_update_${Date.now()}`,
    type: "task.updated",
    taskId,
    timestamp: body.timestamp ?? new Date().toISOString(),
    source: {
      ...readSource(body)
    },
    payload,
    visibility: body.visibility ?? "task",
    risk: body.risk ?? "low"
  };
}

function buildRedactedEvent(targetEventId, body) {
  return {
    id: body.id ?? `evt_redact_${Date.now()}`,
    type: "event.redacted",
    taskId: body.taskId,
    timestamp: body.timestamp ?? new Date().toISOString(),
    source: {
      ...readSource(body)
    },
    payload: {
      targetEventId,
      reason: body.reason ?? "Redacted by user"
    },
    visibility: body.visibility ?? "task",
    risk: body.risk ?? "medium"
  };
}

function buildQuickRecordEvent(taskId, recordKind, body) {
  const eventByKind = {
    context: {
      type: "context.added",
      payload: compactObject({
        summary: emptyToUndefined(body.summary),
        content: emptyToUndefined(body.content),
        files: splitLines(body.files)
      }),
      evidence: splitLines(body.files) ? { files: splitLines(body.files) } : undefined,
      visibility: body.visibility ?? "task",
      risk: body.risk ?? "low"
    },
    decision: {
      type: "decision.recorded",
      payload: compactObject({
        decision: emptyToUndefined(body.decision ?? body.summary),
        summary: emptyToUndefined(body.summary)
      }),
      visibility: body.visibility ?? "project",
      risk: body.risk ?? "low"
    },
    pitfall: {
      type: "pitfall.recorded",
      payload: compactObject({
        pitfall: emptyToUndefined(body.pitfall ?? body.summary),
        summary: emptyToUndefined(body.summary)
      }),
      visibility: body.visibility ?? "project",
      risk: body.risk ?? "medium"
    },
    artifact: {
      type: "artifact.created",
      payload: compactObject({
        summary: emptyToUndefined(body.summary),
        artifactType: emptyToUndefined(body.artifactType),
        path: emptyToUndefined(body.path),
        url: emptyToUndefined(body.url),
        files: splitLines(body.files)
      }),
      evidence: splitLines(body.files) ? { files: splitLines(body.files) } : undefined,
      visibility: body.visibility ?? "task",
      risk: body.risk ?? "low"
    }
  }[recordKind];

  return {
    id: body.id ?? `evt_${recordKind}_${Date.now()}`,
    taskId,
    timestamp: body.timestamp ?? new Date().toISOString(),
    source: readSource(body),
    ...eventByKind
  };
}

function readSource(body, explicitSource) {
  if (explicitSource && typeof explicitSource === "object") return explicitSource;

  return {
    client: body.sourceClient ?? body.client ?? "shared-state-hub-ui",
    sessionId: emptyToUndefined(body.sourceSessionId),
    connectorLevel: body.connectorLevel ?? "ui",
    cwd: emptyToUndefined(body.cwd)
  };
}

function splitLines(value) {
  if (!value) return undefined;
  const items = String(value)
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

function emptyToUndefined(value) {
  if (value === undefined || value === null) return undefined;
  const normalized = String(value).trim();
  return normalized ? normalized : undefined;
}

function compactObject(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined && item !== null)
  );
}

function writeJson(response, statusCode, value) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8"
  });
  response.end(`${JSON.stringify(value, null, 2)}\n`);
}

function writeText(response, statusCode, value) {
  response.writeHead(statusCode, {
    "content-type": "text/markdown; charset=utf-8"
  });
  response.end(value);
}

function writeHtml(response, statusCode, value) {
  response.writeHead(statusCode, {
    "content-type": "text/html; charset=utf-8"
  });
  response.end(value);
}

function redirectAfterWrite(response, location) {
  response.writeHead(303, {
    location
  });
  response.end("");
}
