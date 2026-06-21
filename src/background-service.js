#!/usr/bin/env node
import fs from "node:fs";
import { spawn } from "node:child_process";
import { getAppPaths, projectRootFrom } from "./app-paths.js";
import { compactLegacyRawEvents, initDatabase, vacuumDatabase } from "./store.js";
import { pruneEventArchives } from "./archive.js";

const rootDir = projectRootFrom(import.meta.url);
const paths = getAppPaths();
const nodePath = process.execPath;
const children = [];
let stopping = false;

for (const directory of [paths.appSupportDir, paths.dataDir, paths.archiveDir, paths.assetsDir, paths.logsDir]) {
  fs.mkdirSync(directory, { recursive: true });
}

initDatabase(paths.databasePath);
const compacted = compactLegacyRawEvents({ dbPath: paths.databasePath });
const vacuumed = compacted.compactedEvents ? vacuumDatabase({ dbPath: paths.databasePath }) : undefined;
const pruned = pruneEventArchives({
  archiveDir: paths.archiveDir,
  retentionDays: process.env.HUB_ARCHIVE_RETENTION_DAYS
});
writeState({ status: "starting", pid: process.pid, startedAt: new Date().toISOString() });

const environment = {
  ...process.env,
  HUB_DB: paths.databasePath,
  HUB_CAPTURE_STATUS_PATH: paths.captureStatusPath,
  HUB_HOST: process.env.HUB_HOST ?? "127.0.0.1",
  HUB_PORT: process.env.HUB_PORT ?? "43177"
};

start("hub", ["src/cli.js", "serve", "--host", environment.HUB_HOST, "--port", environment.HUB_PORT, "--db", paths.databasePath]);
start("codex-capture", ["src/capture/codex-watcher.js", "--since-start"]);
start("claude-capture", ["src/capture/claude-watcher.js", "--since-start"]);
writeState({ status: "running", pid: process.pid, startedAt: new Date().toISOString(), storageMaintenance: { compacted, vacuumed, pruned } });

for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => stop(0));
}

function start(name, args) {
  const child = spawn(nodePath, args, {
    cwd: rootDir,
    env: environment,
    stdio: "inherit"
  });
  children.push(child);
  child.on("exit", (code, signal) => {
    if (stopping) return;
    writeState({ status: "error", pid: process.pid, failedWorker: name, code, signal, updatedAt: new Date().toISOString() });
    stop(code && code !== 0 ? code : 1);
  });
}

function stop(exitCode) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill("SIGTERM");
  writeState({ status: "stopped", pid: process.pid, stoppedAt: new Date().toISOString() });
  setTimeout(() => process.exit(exitCode), 300).unref();
}

function writeState(patch) {
  const current = fs.existsSync(paths.serviceStatePath)
    ? JSON.parse(fs.readFileSync(paths.serviceStatePath, "utf8"))
    : {};
  fs.writeFileSync(paths.serviceStatePath, `${JSON.stringify({ ...current, ...patch }, null, 2)}\n`);
}
