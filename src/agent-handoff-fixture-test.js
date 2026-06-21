import { spawn } from "node:child_process";
import fs from "node:fs";

const dbPath = "/private/tmp/shared-state-hub-agent-handoff.db";
const taskId = "task_agent_handoff";

for (const suffix of ["", "-shm", "-wal"]) {
  try {
    fs.rmSync(`${dbPath}${suffix}`);
  } catch {
    // noop
  }
}

const codex = await startMcpClient("codex");
await codex.initialize();
await codex.assertTools([
  "get_join_context",
  "update_task",
  "add_context",
  "record_decision",
  "record_pitfall",
  "create_artifact_ref",
  "redact_event",
  "claim_work",
  "release_claim"
]);

await codex.call("record_event", {
  event: {
    id: "evt_agent_handoff_created",
    type: "task.created",
    taskId,
    timestamp: new Date().toISOString(),
    source: codexSource(),
    payload: {
      title: "Codex and Claude Code shared-state handoff",
      phase: "integration-test",
      status: "active"
    },
    visibility: "project",
    risk: "low"
  }
});

await codex.call("add_context", {
  taskId,
  source: codexSource(),
  summary: "User wants Codex and Claude Code to continue the same work through Shared State Hub.",
  files: ["src/mcp-server.js", "src/agent-handoff-fixture-test.js"]
});

await codex.call("update_task", {
  taskId,
  source: codexSource(),
  summary: "Codex prepared the task for Claude Code handoff.",
  nextSteps: ["Claude Code should read Join Context and continue from Codex state."]
});

await codex.call("claim_work", {
  taskId,
  source: codexSource(),
  claimId: "claim_codex_mcp_server",
  resourceType: "file",
  resource: "src/mcp-server.js",
  purpose: "Codex is extending writeback MCP tools"
});

await codex.close();

const claude = await startMcpClient("claude-code");
await claude.initialize();
const claudeJoin = await claude.call("get_join_context", {
  taskId,
  budget: "deep"
});
assertIncludes(claudeJoin, "Codex and Claude Code shared-state handoff");
assertIncludes(claudeJoin, "Claude Code should read Join Context and continue from Codex state.");
assertIncludes(claudeJoin, "codex claimed file:src/mcp-server.js");

await claude.call("record_decision", {
  taskId,
  source: claudeSource(),
  decision: "Claude Code can continue from Codex state through the shared MCP Hub."
});

await claude.call("record_pitfall", {
  taskId,
  source: claudeSource(),
  pitfall: "Do not rely on private agent chat history; write handoff facts into Hub events."
});

await claude.call("claim_work", {
  taskId,
  source: claudeSource(),
  claimId: "claim_claude_handoff_fixture",
  resourceType: "file",
  resource: "src/agent-handoff-fixture-test.js",
  purpose: "Claude Code validates cross-agent continuation"
});

await claude.close();

const codexReturn = await startMcpClient("codex");
await codexReturn.initialize();
const codexJoin = await codexReturn.call("get_join_context", {
  taskId,
  budget: "deep"
});
assertIncludes(codexJoin, "Claude Code can continue from Codex state through the shared MCP Hub.");
assertIncludes(codexJoin, "Do not rely on private agent chat history; write handoff facts into Hub events.");
assertIncludes(codexJoin, "claude-code claimed file:src/agent-handoff-fixture-test.js");

await codexReturn.close();
console.log("OK: Codex ↔ Claude Code MCP handoff fixture passed");

async function startMcpClient(clientName) {
  const child = spawn(process.execPath, ["src/mcp-server.js"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      HUB_DB: dbPath
    },
    stdio: ["pipe", "pipe", "inherit"]
  });

  const responses = [];
  let buffer = "";
  let id = 1;

  child.stdout.on("data", (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (line.trim()) responses.push(JSON.parse(line));
    }
  });

  function send(method, params) {
    const nextId = id;
    id += 1;
    child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id: nextId, method, params })}\n`);
    return waitForResponse(nextId);
  }

  function waitForResponse(responseId) {
    return new Promise((resolve, reject) => {
      const startedAt = Date.now();
      const interval = setInterval(() => {
        const match = responses.find((response) => response.id === responseId);
        if (match) {
          clearInterval(interval);
          if (match.error) reject(new Error(match.error.message));
          else resolve(match);
          return;
        }

        if (Date.now() - startedAt > 3000) {
          clearInterval(interval);
          reject(new Error(`${clientName} timed out waiting for response ${responseId}`));
        }
      }, 10);
    });
  }

  return {
    async initialize() {
      await send("initialize", {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: clientName, version: "fixture" }
      });
    },
    async assertTools(expectedTools) {
      const response = await send("tools/list", {});
      const actualTools = new Set(response.result.tools.map((tool) => tool.name));
      for (const toolName of expectedTools) {
        if (!actualTools.has(toolName)) {
          throw new Error(`${clientName} tools/list missing ${toolName}`);
        }
      }
    },
    async call(name, args) {
      const response = await send("tools/call", {
        name,
        arguments: args
      });
      return response.result.content[0].text;
    },
    close() {
      child.kill();
    }
  };
}

function codexSource() {
  return {
    client: "codex",
    sessionId: "codex_handoff_fixture",
    connectorLevel: "L3",
    cwd: "/Users/wow/code/shared-state-hub"
  };
}

function claudeSource() {
  return {
    client: "claude-code",
    sessionId: "claude_handoff_fixture",
    connectorLevel: "L3",
    cwd: "/Users/wow/code/shared-state-hub"
  };
}

function assertIncludes(text, expected) {
  if (!text.includes(expected)) {
    throw new Error(`Expected text not found: ${expected}\n\nActual:\n${text}`);
  }
}
