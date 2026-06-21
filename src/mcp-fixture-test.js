import { spawn } from "node:child_process";
import fs from "node:fs";

const dbPath = "/private/tmp/shared-state-hub-mcp-fixture.db";
for (const suffix of ["", "-shm", "-wal"]) {
  try {
    fs.rmSync(`${dbPath}${suffix}`);
  } catch {
    // noop
  }
}

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

child.stdout.on("data", (chunk) => {
  buffer += chunk.toString();
  const lines = buffer.split("\n");
  buffer = lines.pop() ?? "";
  for (const line of lines) {
    if (line.trim()) responses.push(JSON.parse(line));
  }
});

send(1, "initialize", {
  protocolVersion: "2024-11-05",
  capabilities: {},
  clientInfo: { name: "fixture", version: "0.0.1" }
});
await waitForResponse(1);

send(2, "tools/list", {});
const listResponse = await waitForResponse(2);
if (!listResponse.result.tools.some((tool) => tool.name === "get_join_context")) {
  throw new Error("tools/list missing get_join_context");
}
for (const toolName of [
  "update_task",
  "add_context",
  "record_decision",
  "record_pitfall",
  "create_artifact_ref",
  "redact_event",
  "list_events"
]) {
  if (!listResponse.result.tools.some((tool) => tool.name === toolName)) {
    throw new Error(`tools/list missing ${toolName}`);
  }
}

const events = JSON.parse(fs.readFileSync("fixtures/demo-events.json", "utf8"));
for (const [index, event] of events.entries()) {
  send(100 + index, "tools/call", {
    name: "record_event",
    arguments: { event }
  });
  await waitForResponse(100 + index);
}

send(300, "tools/call", {
  name: "claim_work",
  arguments: {
    taskId: "task_shared_state_hub",
    source: {
      client: "cursor",
      sessionId: "cursor_001",
      connectorLevel: "L3",
      cwd: "/Users/wow/code/shared-state-hub"
    },
    resourceType: "file",
    resource: "src/server.js",
    purpose: "Review HTTP daemon"
  }
});

await waitForResponse(300);

send(302, "tools/call", {
  name: "add_context",
  arguments: {
    taskId: "task_shared_state_hub",
    source: {
      client: "codex",
      sessionId: "codex_mcp_fixture",
      connectorLevel: "L3",
      cwd: "/Users/wow/code/shared-state-hub"
    },
    summary: "MCP clients can write context back to the Hub.",
    files: ["src/mcp-server.js"]
  }
});
await waitForResponse(302);

send(303, "tools/call", {
  name: "record_decision",
  arguments: {
    taskId: "task_shared_state_hub",
    source: {
      client: "claude-code",
      sessionId: "claude_mcp_fixture",
      connectorLevel: "L3",
      cwd: "/Users/wow/code/shared-state-hub"
    },
    decision: "Use Shared State Hub MCP tools for cross-agent writeback."
  }
});
await waitForResponse(303);

send(304, "tools/call", {
  name: "record_pitfall",
  arguments: {
    taskId: "task_shared_state_hub",
    source: {
      client: "claude-code",
      sessionId: "claude_mcp_fixture",
      connectorLevel: "L3",
      cwd: "/Users/wow/code/shared-state-hub"
    },
    pitfall: "Do not assume another agent can see private chat state."
  }
});
await waitForResponse(304);

send(305, "tools/call", {
  name: "create_artifact_ref",
  arguments: {
    taskId: "task_shared_state_hub",
    source: {
      client: "codex",
      sessionId: "codex_mcp_fixture",
      connectorLevel: "L3",
      cwd: "/Users/wow/code/shared-state-hub"
    },
    summary: "MCP fixture generated cross-agent writeback data.",
    artifactType: "test",
    path: "src/mcp-fixture-test.js"
  }
});
await waitForResponse(305);

send(301, "tools/call", {
  name: "get_join_context",
  arguments: {
    taskId: "task_shared_state_hub",
    budget: "tiny"
  }
});

const joinResponse = await waitForResponse(301);
const joinText = joinResponse.result.content[0].text;
if (!joinText.includes("Join Context: Build Local AI Shared State Hub MVP")) {
  throw new Error("join context did not include expected title");
}
if (!joinText.includes("cursor claimed file:src/server.js")) {
  throw new Error("join context did not include claim_work result");
}
if (!joinText.includes("Use Shared State Hub MCP tools for cross-agent writeback.")) {
  throw new Error("join context did not include record_decision result");
}
if (!joinText.includes("Do not assume another agent can see private chat state.")) {
  throw new Error("join context did not include record_pitfall result");
}

child.kill();
console.log("OK: MCP fixture passed");

function send(id, method, params) {
  child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
}

function waitForResponse(id) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const interval = setInterval(() => {
      const match = responses.find((response) => response.id === id);
      if (match) {
        clearInterval(interval);
        resolve(match);
        return;
      }

      if (Date.now() - startedAt > 3000) {
        clearInterval(interval);
        reject(new Error(`timed out waiting for response ${id}`));
      }
    }, 10);
  });
}
