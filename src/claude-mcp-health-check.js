import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const tempDir = "/private/tmp/shared-state-hub-claude-mcp-test";
const dbPath = "/private/tmp/shared-state-hub-claude-mcp-health.db";
const mcpServerPath = path.resolve("src/mcp-server.js");

fs.rmSync(tempDir, { recursive: true, force: true });
fs.mkdirSync(tempDir, { recursive: true });
fs.writeFileSync(
  path.join(tempDir, ".mcp.json"),
  `${JSON.stringify(
    {
      mcpServers: {
        shared_state_hub: {
          command: "node",
          args: [mcpServerPath],
          env: {
            HUB_DB: dbPath
          }
        }
      }
    },
    null,
    2
  )}\n`
);

const result = spawnSync("claude", ["mcp", "get", "shared_state_hub"], {
  cwd: tempDir,
  encoding: "utf8"
});

process.stdout.write(result.stdout);
process.stderr.write(result.stderr);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

if (!result.stdout.includes("Status: ✓ Connected")) {
  throw new Error("Claude Code did not report Shared State Hub as connected");
}

console.log(`OK: Claude Code MCP health-check passed using ${path.join(tempDir, ".mcp.json")}`);
