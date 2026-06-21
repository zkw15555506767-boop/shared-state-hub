import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { getAppPaths, LAUNCH_AGENT_LABEL } from "./app-paths.js";

const CODEX_BEGIN = "# >>> Shared State Hub managed MCP >>>";
const CODEX_END = "# <<< Shared State Hub managed MCP <<<";

export function buildSetupPreview({ sourceRoot, runtimeRoot }) {
  const paths = getAppPaths();
  return [
    `Copy a stable local runtime: ${sourceRoot} → ${runtimeRoot}`,
    `Create local data and logs: ${paths.appSupportDir}`,
    `Add one managed MCP entry to Codex App: ${path.join(os.homedir(), ".codex", "config.toml")}`,
    "Add one user-scope MCP entry through the Claude Code CLI.",
    `Register background service: ${paths.launchAgentPath}`,
    "Create backups before every configuration file write."
  ];
}

export function installRuntime(sourceRoot, runtimeRoot) {
  fs.rmSync(runtimeRoot, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(runtimeRoot), { recursive: true });
  fs.cpSync(sourceRoot, runtimeRoot, {
    recursive: true,
    filter(source) {
      const name = path.basename(source);
      return ![".git", "node_modules", ".DS_Store", ".superpowers"].includes(name);
    }
  });
}

export function installCodexMcp(runtimeRoot) {
  const paths = getAppPaths();
  const configPath = path.join(os.homedir(), ".codex", "config.toml");
  const current = fs.existsSync(configPath) ? fs.readFileSync(configPath, "utf8") : "";
  const managedBlock = codexBlock(runtimeRoot, paths);

  if (current.includes(CODEX_BEGIN) && current.includes(CODEX_END)) {
    const next = removeOrphanHubSubsections(
      current.replace(new RegExp(`${escapeRegExp(CODEX_BEGIN)}[\\s\\S]*?${escapeRegExp(CODEX_END)}\\n?`), managedBlock)
    );
    if (next !== current) writeWithBackup(configPath, next);
    return "updated";
  }

  const legacyBlock = findTomlSection(current, "mcp_servers.shared_state_hub");
  if (legacyBlock) {
    if (!legacyBlock.includes("shared-state-hub")) return "already-configured";
    writeWithBackup(configPath, current.replace(legacyBlock, managedBlock));
    return "migrated";
  }

  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  writeWithBackup(configPath, `${current.trimEnd()}${current.trim() ? "\n\n" : ""}${managedBlock}`);
  return "installed";
}

export function uninstallCodexMcp() {
  const configPath = path.join(os.homedir(), ".codex", "config.toml");
  if (!fs.existsSync(configPath)) return false;
  const current = fs.readFileSync(configPath, "utf8");
  if (!current.includes(CODEX_BEGIN)) return false;
  const next = current.replace(new RegExp(`${escapeRegExp(CODEX_BEGIN)}[\\s\\S]*?${escapeRegExp(CODEX_END)}\\n?`), "").trimEnd() + "\n";
  writeWithBackup(configPath, next);
  return true;
}

export function installClaudeMcp(runtimeRoot) {
  const paths = getAppPaths();
  if (!hasCommand("claude")) return { ok: false, message: "Claude Code CLI was not found; skipped its MCP configuration." };
  const args = [
    "mcp", "add", "--scope", "user", "shared_state_hub",
    "-e", `HUB_DB=${paths.databasePath}`,
    "-e", `HUB_CAPTURE_STATUS_PATH=${paths.captureStatusPath}`,
    "--", process.execPath, path.join(runtimeRoot, "src", "mcp-server.js")
  ];
  try {
    execFileSync("claude", args, { stdio: "pipe" });
    return { ok: true, message: "installed" };
  } catch (error) {
    const output = `${error.stdout ?? ""}\n${error.stderr ?? ""}`;
    if (/already exists|already configured|duplicate/i.test(output)) return { ok: true, message: "already-configured" };
    return { ok: false, message: output.trim() || error.message };
  }
}

export function uninstallClaudeMcp() {
  if (!hasCommand("claude")) return { ok: false, message: "Claude Code CLI was not found." };
  try {
    execFileSync("claude", ["mcp", "remove", "--scope", "user", "shared_state_hub"], { stdio: "pipe" });
    return { ok: true, message: "removed" };
  } catch (error) {
    return { ok: false, message: `${error.stderr ?? error.message}`.trim() };
  }
}

export function installLaunchAgent(runtimeRoot) {
  const paths = getAppPaths();
  fs.mkdirSync(path.dirname(paths.launchAgentPath), { recursive: true });
  fs.mkdirSync(paths.logsDir, { recursive: true });
  const plist = launchAgentPlist(runtimeRoot, paths);
  if (fs.existsSync(paths.launchAgentPath)) writeBackup(paths.launchAgentPath, fs.readFileSync(paths.launchAgentPath, "utf8"));
  fs.writeFileSync(paths.launchAgentPath, plist);
  runLaunchctl(["bootout", `gui/${process.getuid()}`, paths.launchAgentPath], true);
  runLaunchctl(["bootstrap", `gui/${process.getuid()}`, paths.launchAgentPath]);
  runLaunchctl(["kickstart", "-k", `gui/${process.getuid()}/${LAUNCH_AGENT_LABEL}`]);
}

export function uninstallLaunchAgent() {
  const paths = getAppPaths();
  runLaunchctl(["bootout", `gui/${process.getuid()}`, paths.launchAgentPath], true);
  if (fs.existsSync(paths.launchAgentPath)) fs.rmSync(paths.launchAgentPath);
}

export function readServiceState() {
  const { serviceStatePath } = getAppPaths();
  if (!fs.existsSync(serviceStatePath)) return undefined;
  try {
    return JSON.parse(fs.readFileSync(serviceStatePath, "utf8"));
  } catch {
    return undefined;
  }
}

function codexBlock(runtimeRoot, paths) {
  const mcpServerPath = path.join(runtimeRoot, "src", "mcp-server.js");
  return `${CODEX_BEGIN}\n[mcp_servers.shared_state_hub]\ncommand = ${toml(process.execPath)}\nargs = [${toml(mcpServerPath)}]\n\n[mcp_servers.shared_state_hub.env]\nHUB_DB = ${toml(paths.databasePath)}\nHUB_CAPTURE_STATUS_PATH = ${toml(paths.captureStatusPath)}\n${CODEX_END}\n`;
}

function launchAgentPlist(runtimeRoot, paths) {
  const runnerPath = path.join(runtimeRoot, "src", "background-service.js");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0"><dict>\n  <key>Label</key><string>${LAUNCH_AGENT_LABEL}</string>\n  <key>ProgramArguments</key><array><string>${xml(process.execPath)}</string><string>${xml(runnerPath)}</string></array>\n  <key>RunAtLoad</key><true/>\n  <key>KeepAlive</key><true/>\n  <key>WorkingDirectory</key><string>${xml(runtimeRoot)}</string>\n  <key>StandardOutPath</key><string>${xml(paths.stdoutPath)}</string>\n  <key>StandardErrorPath</key><string>${xml(paths.stderrPath)}</string>\n  <key>EnvironmentVariables</key><dict>\n    <key>HUB_DB</key><string>${xml(paths.databasePath)}</string>\n    <key>HUB_CAPTURE_STATUS_PATH</key><string>${xml(paths.captureStatusPath)}</string>\n  </dict>\n</dict></plist>\n`;
}

function writeWithBackup(filePath, content) {
  if (fs.existsSync(filePath)) writeBackup(filePath, fs.readFileSync(filePath, "utf8"));
  fs.writeFileSync(filePath, content);
}

function writeBackup(filePath, content) {
  fs.writeFileSync(`${filePath}.bak-${new Date().toISOString().replaceAll(/[:.]/g, "-")}`, content);
}

function hasCommand(command) {
  try {
    execFileSync("which", [command], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function runLaunchctl(args, allowFailure = false) {
  try {
    execFileSync("launchctl", args, { stdio: "pipe" });
  } catch (error) {
    if (!allowFailure) throw new Error(`${error.stderr ?? error.message}`.trim());
  }
}

function toml(value) {
  return `"${String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

function xml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findTomlSection(content, sectionName) {
  const header = `[${sectionName}]`;
  const start = content.indexOf(header);
  if (start === -1 || (start > 0 && content[start - 1] !== "\n")) return undefined;
  let searchFrom = start + header.length;

  while (true) {
    const nextSection = content.indexOf("\n[", searchFrom);
    if (nextSection === -1) return content.slice(start);
    const nextLineEnd = content.indexOf("\n", nextSection + 1);
    const nextHeader = content.slice(nextSection + 1, nextLineEnd === -1 ? content.length : nextLineEnd);
    if (nextHeader === header || nextHeader.startsWith(`[${sectionName}.`)) {
      searchFrom = nextLineEnd === -1 ? content.length : nextLineEnd;
      continue;
    }
    return content.slice(start, nextSection + 1);
  }
}

function removeOrphanHubSubsections(content) {
  const markerEnd = content.indexOf(CODEX_END);
  if (markerEnd === -1) return content;
  const suffixStart = content.indexOf("\n", markerEnd) + 1;
  if (suffixStart === 0) return content;
  const suffix = content.slice(suffixStart);
  const sectionName = "mcp_servers.shared_state_hub";
  const firstHeader = `[${sectionName}.`;
  if (!suffix.startsWith(firstHeader)) return content;

  let end = suffix.length;
  const nextNonHub = suffix.search(new RegExp(`\\n\\[(?!${escapeRegExp(sectionName)}\\.)`));
  if (nextNonHub !== -1) end = nextNonHub + 1;
  return `${content.slice(0, suffixStart)}${suffix.slice(end)}`;
}
