#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const apply = process.argv.includes("--apply");
const codexEnabled = !process.argv.includes("--claude-only");
const claudeEnabled = !process.argv.includes("--codex-only");
const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const mcpServerPath = path.join(rootDir, "src", "mcp-server.js");
const dbPath = process.env.HUB_DB ?? "/private/tmp/shared-state-hub-dev.db";
const codexConfigPath = path.join(os.homedir(), ".codex", "config.toml");
const claudeProjectConfigPath = path.join(rootDir, ".mcp.json");

const codexBlock = `
[mcp_servers.shared_state_hub]
command = "node"
args = ["${escapeToml(mcpServerPath)}"]

[mcp_servers.shared_state_hub.env]
HUB_DB = "${escapeToml(dbPath)}"
`;

const claudeEntry = {
  command: "node",
  args: [mcpServerPath],
  env: {
    HUB_DB: dbPath
  }
};

const changes = [];
if (codexEnabled) installCodexConfig();
if (claudeEnabled) installClaudeProjectConfig();

if (!apply) {
  console.log("Dry run only. No files were modified.");
  console.log("Run `npm run setup:apply` to apply these changes.");
}

if (!changes.length) {
  console.log("No changes needed.");
} else {
  console.log("Planned/applied changes:");
  for (const change of changes) console.log(`- ${change}`);
}

function installCodexConfig() {
  const exists = fs.existsSync(codexConfigPath);
  const current = exists ? fs.readFileSync(codexConfigPath, "utf8") : "";

  if (current.includes("[mcp_servers.shared_state_hub]")) {
    changes.push(`Codex App config already contains shared_state_hub: ${codexConfigPath}`);
    return;
  }

  changes.push(`Add shared_state_hub MCP server to Codex App config: ${codexConfigPath}`);

  if (!apply) return;

  fs.mkdirSync(path.dirname(codexConfigPath), { recursive: true });
  if (exists) writeBackup(codexConfigPath, current);
  fs.writeFileSync(codexConfigPath, `${current.trimEnd()}\n${codexBlock}\n`);
}

function installClaudeProjectConfig() {
  const existingConfig = readJsonIfExists(claudeProjectConfigPath) ?? {};
  const mcpServers = existingConfig.mcpServers ?? {};

  if (mcpServers.shared_state_hub) {
    changes.push(`Claude Code project config already contains shared_state_hub: ${claudeProjectConfigPath}`);
    return;
  }

  const nextConfig = {
    ...existingConfig,
    mcpServers: {
      ...mcpServers,
      shared_state_hub: claudeEntry
    }
  };

  changes.push(`Add shared_state_hub MCP server to Claude Code project config: ${claudeProjectConfigPath}`);

  if (!apply) return;

  if (fs.existsSync(claudeProjectConfigPath)) {
    writeBackup(claudeProjectConfigPath, fs.readFileSync(claudeProjectConfigPath, "utf8"));
  }
  fs.writeFileSync(claudeProjectConfigPath, `${JSON.stringify(nextConfig, null, 2)}\n`);
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return undefined;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`Cannot parse ${filePath}: ${error.message}`);
  }
}

function writeBackup(filePath, content) {
  const backupPath = `${filePath}.bak-${new Date().toISOString().replaceAll(/[:.]/g, "-")}`;
  fs.writeFileSync(backupPath, content);
  changes.push(`Created backup: ${backupPath}`);
}

function escapeToml(value) {
  return String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}
