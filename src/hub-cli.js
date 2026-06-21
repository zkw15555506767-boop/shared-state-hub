#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { execFileSync } from "node:child_process";
import { getAppPaths, projectRootFrom } from "./app-paths.js";
import {
  buildSetupPreview,
  installClaudeMcp,
  installCodexMcp,
  installLaunchAgent,
  installRuntime,
  readServiceState,
  uninstallClaudeMcp,
  uninstallCodexMcp,
  uninstallLaunchAgent
} from "./service-manager.js";

const command = process.argv[2] ?? "help";
const rootDir = projectRootFrom(import.meta.url);
const paths = getAppPaths();

try {
  if (command === "setup") await setup();
  else if (command === "status") status();
  else if (command === "open") openDashboard();
  else if (command === "stop") stop();
  else if (command === "uninstall") uninstall();
  else printUsage();
} catch (error) {
  console.error(`Shared State Hub: ${error.message}`);
  process.exit(1);
}

async function setup() {
  const preview = buildSetupPreview({ sourceRoot: rootDir, runtimeRoot: paths.runtimeDir });
  console.log("Shared State Hub will:");
  for (const item of preview) console.log(`  • ${item}`);
  console.log("\nNo existing agent setting will be overwritten.");

  const approved = process.argv.includes("--yes") || (await confirm("Continue? [y/N] "));
  if (!approved) {
    console.log("Cancelled. No files were changed.");
    return;
  }

  installRuntime(rootDir, paths.runtimeDir);
  console.log(`✓ Installed local runtime: ${paths.runtimeDir}`);
  console.log(`✓ Codex App MCP: ${installCodexMcp(paths.runtimeDir)}`);
  const claude = installClaudeMcp(paths.runtimeDir);
  console.log(`${claude.ok ? "✓" : "!"} Claude Code MCP: ${claude.message}`);
  installLaunchAgent(paths.runtimeDir);
  console.log("✓ Background service installed and started.");
  console.log("\nOpen http://127.0.0.1:43177/ to see the Hub.");
  if (!claude.ok) console.log("Claude Code was not configured automatically; install Claude Code, then run this setup again.");
}

function status() {
  const state = readServiceState();
  console.log(JSON.stringify({
    service: state ?? { status: "not installed" },
    database: paths.databasePath,
    dashboard: "http://127.0.0.1:43177/"
  }, null, 2));
}

function openDashboard() {
  execFileSync("open", ["http://127.0.0.1:43177/"], { stdio: "ignore" });
}

function stop() {
  uninstallLaunchAgent();
  console.log("Background service stopped. Your data and agent configuration remain available.");
}

function uninstall() {
  uninstallLaunchAgent();
  console.log(`Codex App MCP removed: ${uninstallCodexMcp() ? "yes" : "no managed entry found"}`);
  const claude = uninstallClaudeMcp();
  console.log(`Claude Code MCP: ${claude.ok ? claude.message : claude.message}`);
  if (process.argv.includes("--purge-data")) fs.rmSync(paths.appSupportDir, { recursive: true, force: true });
  console.log("Uninstalled. Backups and local data were retained unless --purge-data was used.");
}

async function confirm(question) {
  if (!process.stdin.isTTY) return false;
  const prompt = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await prompt.question(question);
  prompt.close();
  return /^y(es)?$/i.test(answer.trim());
}

function printUsage() {
  console.log(`Usage:
  shared-state-hub setup [--yes]
  shared-state-hub status
  shared-state-hub open
  shared-state-hub stop
  shared-state-hub uninstall [--purge-data]`);
}
