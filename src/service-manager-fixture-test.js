#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const fixtureRoot = path.join(os.tmpdir(), `shared-state-hub-service-fixture-${process.pid}`);
process.env.HOME = path.join(fixtureRoot, "home");
process.env.HUB_APP_SUPPORT_DIR = path.join(fixtureRoot, "app-support");

const { buildSetupPreview, installCodexMcp, uninstallCodexMcp } = await import("./service-manager.js");
const { projectRootFrom } = await import("./app-paths.js");
const configPath = path.join(process.env.HOME, ".codex", "config.toml");
const runtimeRoot = path.join(fixtureRoot, "runtime");

assert.equal(projectRootFrom("file:///tmp/Shared%20State%20Hub/src/background-service.js"), "/tmp/Shared State Hub");

fs.mkdirSync(path.dirname(configPath), { recursive: true });
fs.writeFileSync(configPath, "model = \"gpt-test\"\n\n[mcp_servers.other]\ncommand = \"other\"\n");

const preview = buildSetupPreview({ sourceRoot: "/source", runtimeRoot });
assert.ok(preview.some((item) => item.includes("Codex App")));
assert.equal(installCodexMcp(runtimeRoot), "installed");

const installed = fs.readFileSync(configPath, "utf8");
assert.match(installed, /model = "gpt-test"/);
assert.match(installed, /\[mcp_servers\.other\]/);
assert.match(installed, /Shared State Hub managed MCP/);
assert.ok(fs.readdirSync(path.dirname(configPath)).some((name) => name.includes("config.toml.bak-")));

assert.equal(uninstallCodexMcp(), true);
const removed = fs.readFileSync(configPath, "utf8");
assert.match(removed, /model = "gpt-test"/);
assert.match(removed, /\[mcp_servers\.other\]/);
assert.doesNotMatch(removed, /Shared State Hub managed MCP/);

fs.writeFileSync(configPath, "[mcp_servers.shared_state_hub]\ncommand = \"node\"\nargs = [\"/old/shared-state-hub/src/mcp-server.js\"]\n\n[mcp_servers.shared_state_hub.env]\nHUB_DB = \"/private/tmp/old.db\"\n");
assert.equal(installCodexMcp(runtimeRoot), "migrated");
const migrated = fs.readFileSync(configPath, "utf8");
assert.match(migrated, /Shared State Hub managed MCP/);
assert.equal((migrated.match(/\[mcp_servers\.shared_state_hub\.env\]/g) ?? []).length, 1);

fs.rmSync(fixtureRoot, { recursive: true, force: true });
console.log("OK: non-destructive service manager fixture passed");
