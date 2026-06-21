import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const APP_NAME = "Shared State Hub";
export const LAUNCH_AGENT_LABEL = "com.sharedstatehub.local";

export function getAppPaths() {
  const appSupportDir = process.env.HUB_APP_SUPPORT_DIR ?? path.join(os.homedir(), "Library", "Application Support", APP_NAME);
  const runtimeDir = path.join(appSupportDir, "runtime");

  return {
    appSupportDir,
    runtimeDir,
    dataDir: path.join(appSupportDir, "data"),
    archiveDir: path.join(appSupportDir, "archive"),
    assetsDir: path.join(appSupportDir, "assets"),
    logsDir: path.join(appSupportDir, "logs"),
    databasePath: process.env.HUB_DB ?? path.join(appSupportDir, "data", "shared-state-hub.db"),
    captureStatusPath: process.env.HUB_CAPTURE_STATUS_PATH ?? path.join(appSupportDir, "data", "capture-status.json"),
    serviceStatePath: path.join(appSupportDir, "data", "service-state.json"),
    launchAgentPath: path.join(os.homedir(), "Library", "LaunchAgents", `${LAUNCH_AGENT_LABEL}.plist`),
    stdoutPath: path.join(appSupportDir, "logs", "service.out.log"),
    stderrPath: path.join(appSupportDir, "logs", "service.err.log")
  };
}

export function projectRootFrom(importMetaUrl) {
  return path.resolve(path.dirname(fileURLToPath(importMetaUrl)), "..");
}
