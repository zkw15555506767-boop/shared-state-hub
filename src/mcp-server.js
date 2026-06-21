#!/usr/bin/env node
import readline from "node:readline";
import { DEFAULT_DB_PATH, initDatabase, insertEvent, listEvents } from "./store.js";
import { validateEvent } from "./model.js";
import { reduceEvents } from "./reducer.js";
import { generateJoinContext } from "./join-context.js";

const dbPath = process.env.HUB_DB ?? DEFAULT_DB_PATH;
initDatabase(dbPath);
let generatedIdCounter = 0;

const tools = [
  {
    name: "get_join_context",
    description: "Get a budgeted Join Context for an agent joining a task.",
    inputSchema: {
      type: "object",
      properties: {
        taskId: { type: "string" },
        budget: { type: "string", enum: ["tiny", "standard", "deep"] }
      },
      required: ["taskId"]
    }
  },
  {
    name: "get_live_state",
    description: "Get the current Live State for a task.",
    inputSchema: {
      type: "object",
      properties: {
        taskId: { type: "string" }
      },
      required: ["taskId"]
    }
  },
  {
    name: "record_event",
    description: "Record a Hub event into the append-only event log.",
    inputSchema: {
      type: "object",
      properties: {
        event: { type: "object" }
      },
      required: ["event"]
    }
  },
  {
    name: "update_task",
    description: "Append a task.updated event with phase, status, next steps, blockers, or open questions.",
    inputSchema: {
      type: "object",
      properties: {
        taskId: { type: "string" },
        source: { type: "object" },
        title: { type: "string" },
        phase: { type: "string" },
        status: { type: "string" },
        summary: { type: "string" },
        nextSteps: { type: "array", items: { type: "string" } },
        blockers: { type: "array", items: { type: "string" } },
        openQuestions: { type: "array", items: { type: "string" } }
      },
      required: ["taskId", "source"]
    }
  },
  {
    name: "add_context",
    description: "Append task/project context that should be visible in future Join Context output.",
    inputSchema: {
      type: "object",
      properties: {
        taskId: { type: "string" },
        source: { type: "object" },
        summary: { type: "string" },
        content: { type: "string" },
        files: { type: "array", items: { type: "string" } },
        visibility: { type: "string", enum: ["private", "task", "project", "global"] }
      },
      required: ["taskId", "source"]
    }
  },
  {
    name: "record_decision",
    description: "Record an important decision for future agents.",
    inputSchema: {
      type: "object",
      properties: {
        taskId: { type: "string" },
        source: { type: "object" },
        decision: { type: "string" },
        summary: { type: "string" },
        visibility: { type: "string", enum: ["task", "project", "global"] }
      },
      required: ["taskId", "source"]
    }
  },
  {
    name: "record_pitfall",
    description: "Record a failure, gotcha, or warning future agents should avoid.",
    inputSchema: {
      type: "object",
      properties: {
        taskId: { type: "string" },
        source: { type: "object" },
        pitfall: { type: "string" },
        summary: { type: "string" },
        visibility: { type: "string", enum: ["task", "project", "global"] }
      },
      required: ["taskId", "source"]
    }
  },
  {
    name: "create_artifact_ref",
    description: "Record a file, URL, note, or other artifact produced during work.",
    inputSchema: {
      type: "object",
      properties: {
        taskId: { type: "string" },
        source: { type: "object" },
        summary: { type: "string" },
        artifactType: { type: "string" },
        path: { type: "string" },
        url: { type: "string" },
        files: { type: "array", items: { type: "string" } }
      },
      required: ["taskId", "source", "summary"]
    }
  },
  {
    name: "redact_event",
    description: "Hide a target event from derived views by appending an event.redacted record.",
    inputSchema: {
      type: "object",
      properties: {
        taskId: { type: "string" },
        source: { type: "object" },
        targetEventId: { type: "string" },
        reason: { type: "string" }
      },
      required: ["taskId", "source", "targetEventId"]
    }
  },
  {
    name: "list_events",
    description: "List events for debugging or audit. Redacted target events are included only when includeRedacted is true.",
    inputSchema: {
      type: "object",
      properties: {
        taskId: { type: "string" },
        includeRedacted: { type: "boolean" }
      }
    }
  },
  {
    name: "claim_work",
    description: "Claim a file, task, command, or artifact so other agents can avoid conflicts.",
    inputSchema: {
      type: "object",
      properties: {
        taskId: { type: "string" },
        source: { type: "object" },
        claimId: { type: "string" },
        resourceType: { type: "string", enum: ["file", "task", "command", "artifact"] },
        resource: { type: "string" },
        purpose: { type: "string" },
        expiresAt: { type: "string" }
      },
      required: ["taskId", "source", "resourceType", "resource"]
    }
  },
  {
    name: "release_claim",
    description: "Release a previously claimed resource.",
    inputSchema: {
      type: "object",
      properties: {
        taskId: { type: "string" },
        source: { type: "object" },
        claimId: { type: "string" }
      },
      required: ["taskId", "source", "claimId"]
    }
  },
  {
    name: "list_active_tasks",
    description: "List active tasks known to the Hub.",
    inputSchema: {
      type: "object",
      properties: {}
    }
  }
];

const rl = readline.createInterface({
  input: process.stdin,
  crlfDelay: Infinity
});

rl.on("line", (line) => {
  if (!line.trim()) return;

  handleMessage(line)
    .then((response) => {
      if (response) writeMessage(response);
    })
    .catch((error) => {
      writeMessage({
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32603,
          message: error.message
        }
      });
    });
});

async function handleMessage(line) {
  let message;

  try {
    message = JSON.parse(line);
  } catch {
    return {
      jsonrpc: "2.0",
      id: null,
      error: {
        code: -32700,
        message: "Parse error"
      }
    };
  }

  if (message.method === "notifications/initialized") {
    return undefined;
  }

  if (message.method === "initialize") {
    return {
      jsonrpc: "2.0",
      id: message.id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: {
          tools: {}
        },
        serverInfo: {
          name: "shared-state-hub",
          version: "0.0.1"
        }
      }
    };
  }

  if (message.method === "tools/list") {
    return {
      jsonrpc: "2.0",
      id: message.id,
      result: { tools }
    };
  }

  if (message.method === "tools/call") {
    const { name, arguments: args = {} } = message.params ?? {};
    const result = callTool(name, args);

    return {
      jsonrpc: "2.0",
      id: message.id,
      result: {
        content: [
          {
            type: "text",
            text: typeof result === "string" ? result : JSON.stringify(result, null, 2)
          }
        ]
      }
    };
  }

  return {
    jsonrpc: "2.0",
    id: message.id,
    error: {
      code: -32601,
      message: `Method not found: ${message.method}`
    }
  };
}

function callTool(name, args) {
  switch (name) {
    case "get_join_context": {
      const state = reduceEvents(listEvents({ taskId: args.taskId, dbPath }));
      return generateJoinContext(state, { budget: args.budget ?? "standard" });
    }
    case "get_live_state": {
      return reduceEvents(listEvents({ taskId: args.taskId, dbPath }));
    }
    case "record_event": {
      const errors = validateEvent(args.event);
      if (errors.length) throw new Error(errors.join("; "));
      insertEvent(args.event, dbPath);
      return { recorded: 1, eventId: args.event.id };
    }
    case "update_task": {
      return recordBuiltEvent({
        type: "task.updated",
        taskId: args.taskId,
        source: args.source,
        payload: compactObject({
          title: args.title,
          phase: args.phase,
          status: args.status,
          summary: args.summary,
          nextSteps: args.nextSteps,
          blockers: args.blockers,
          openQuestions: args.openQuestions
        }),
        visibility: "task",
        risk: "low"
      });
    }
    case "add_context": {
      return recordBuiltEvent({
        type: "context.added",
        taskId: args.taskId,
        source: args.source,
        payload: compactObject({
          summary: args.summary,
          content: args.content,
          files: args.files
        }),
        evidence: args.files?.length ? { files: args.files } : undefined,
        visibility: args.visibility ?? "task",
        risk: "low"
      });
    }
    case "record_decision": {
      return recordBuiltEvent({
        type: "decision.recorded",
        taskId: args.taskId,
        source: args.source,
        payload: compactObject({
          decision: args.decision,
          summary: args.summary
        }),
        visibility: args.visibility ?? "project",
        risk: "low"
      });
    }
    case "record_pitfall": {
      return recordBuiltEvent({
        type: "pitfall.recorded",
        taskId: args.taskId,
        source: args.source,
        payload: compactObject({
          pitfall: args.pitfall,
          summary: args.summary
        }),
        visibility: args.visibility ?? "project",
        risk: "medium"
      });
    }
    case "create_artifact_ref": {
      return recordBuiltEvent({
        type: "artifact.created",
        taskId: args.taskId,
        source: args.source,
        payload: compactObject({
          summary: args.summary,
          artifactType: args.artifactType,
          path: args.path,
          url: args.url,
          files: args.files
        }),
        evidence: args.files?.length ? { files: args.files } : undefined,
        visibility: "task",
        risk: "low"
      });
    }
    case "redact_event": {
      return recordBuiltEvent({
        type: "event.redacted",
        taskId: args.taskId,
        source: args.source,
        payload: {
          targetEventId: args.targetEventId,
          reason: args.reason ?? "Redacted by MCP client"
        },
        visibility: "task",
        risk: "medium"
      });
    }
    case "list_events": {
      const events = listEvents({ taskId: args.taskId, dbPath });
      if (args.includeRedacted) return { events };
      const redactedIds = new Set(
        events
          .filter((event) => event.type === "event.redacted")
          .map((event) => event.payload?.targetEventId)
          .filter(Boolean)
      );
      return { events: events.filter((event) => !redactedIds.has(event.id)) };
    }
    case "claim_work": {
      return recordBuiltEvent({
        type: "task.claimed",
        taskId: args.taskId,
        source: args.source,
        payload: {
          claimId: args.claimId ?? `claim_${Date.now()}`,
          resourceType: args.resourceType,
          resource: args.resource,
          purpose: args.purpose,
          expiresAt: args.expiresAt
        },
        visibility: "task",
        risk: "low"
      });
    }
    case "release_claim": {
      return recordBuiltEvent({
        type: "task.released",
        taskId: args.taskId,
        source: args.source,
        payload: {
          claimId: args.claimId
        },
        visibility: "task",
        risk: "low"
      });
    }
    case "list_active_tasks": {
      const events = listEvents({ dbPath });
      const taskIds = Array.from(new Set(events.map((event) => event.taskId).filter(Boolean)));
      return {
        tasks: taskIds.map((taskId) => reduceEvents(events.filter((event) => event.taskId === taskId)).task)
      };
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

function recordBuiltEvent(partialEvent) {
  const event = {
    id: nextEventId(partialEvent.type),
    timestamp: new Date().toISOString(),
    ...partialEvent
  };
  const errors = validateEvent(event);
  if (errors.length) throw new Error(errors.join("; "));
  insertEvent(event, dbPath);
  return { recorded: 1, event };
}

function nextEventId(type) {
  generatedIdCounter += 1;
  return `evt_${type.replaceAll(".", "_")}_${Date.now()}_${generatedIdCounter}`;
}

function compactObject(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined && item !== null)
  );
}

function writeMessage(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}
