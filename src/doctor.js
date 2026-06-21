#!/usr/bin/env node
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { readCaptureStatus } from "./capture/status.js";

const codexConfigPath = path.join(os.homedir(), ".codex", "config.toml");
const claudeProjectConfigPath = path.resolve(".mcp.json");
const dbPath = process.env.HUB_DB ?? "/private/tmp/shared-state-hub-dev.db";
const healthUrl = new URL(process.env.HUB_URL ?? "http://127.0.0.1:43177/health");

const checks = [];
checks.push(checkFile("DB", dbPath));
checks.push(checkContains("Codex App config", codexConfigPath, "[mcp_servers.shared_state_hub]"));
checks.push(checkContains("Claude Code project config", claudeProjectConfigPath, "shared_state_hub"));
checks.push(await checkHttp("Hub HTTP health", healthUrl));

const captureStatus = readCaptureStatus();
checks.push(checkCapture("Codex App capture watcher", captureStatus.connectors?.["codex-app"]));
checks.push(checkCapture("Claude Code capture watcher", captureStatus.connectors?.["claude-code-watcher"]));
checks.push(checkCapture("Claude Code capture hook", captureStatus.connectors?.["claude-code-hook"]));

for (const check of checks) {
  console.log(`${check.ok ? "✓" : "✗"} ${check.name}: ${check.message}`);
}

if (checks.every((check) => check.ok)) {
  console.log("\nOK: Shared State Hub is ready for Codex App / Claude Code testing.");
} else {
  console.log("\nNot fully ready yet. Run `./SharedStateHub.command` from Finder or `npm run dev:serve` from Terminal.");
}

function checkFile(name, filePath) {
  return {
    name,
    ok: fs.existsSync(filePath),
    message: fs.existsSync(filePath) ? filePath : `missing: ${filePath}`
  };
}

function checkContains(name, filePath, text) {
  if (!fs.existsSync(filePath)) {
    return { name, ok: false, message: `missing: ${filePath}` };
  }

  const content = fs.readFileSync(filePath, "utf8");
  return {
    name,
    ok: content.includes(text),
    message: content.includes(text) ? `configured: ${filePath}` : `not configured: ${filePath}`
  };
}

function checkHttp(name, url) {
  return new Promise((resolve) => {
    const request = http.get(url, { timeout: 1500 }, (response) => {
      let body = "";
      response.on("data", (chunk) => {
        body += chunk;
      });
      response.on("end", () => {
        resolve({
          name,
          ok: response.statusCode === 200 && body.includes('"ok": true'),
          message: `${url.href} -> ${response.statusCode}`
        });
      });
    });

    request.on("timeout", () => {
      request.destroy(new Error("timeout"));
    });

    request.on("error", (error) => {
      resolve({ name, ok: false, message: error.message });
    });
  });
}

function checkCapture(name, connector) {
  if (!connector) {
    return { name, ok: false, message: "not observed yet" };
  }

  const healthy = ["running", "captured", "scanned", "stopped"].includes(connector.status);
  return {
    name,
    ok: healthy,
    message: `${connector.status} at ${connector.lastCapturedAt ?? connector.lastScanAt ?? connector.updatedAt ?? "unknown time"}`
  };
}
