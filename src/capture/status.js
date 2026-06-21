import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const CAPTURE_STATUS_PATH =
  process.env.HUB_CAPTURE_STATUS_PATH ?? path.join(os.tmpdir(), "shared-state-hub-capture-status.json");

export function readCaptureStatus() {
  if (!fs.existsSync(CAPTURE_STATUS_PATH)) {
    return {
      connectors: {}
    };
  }

  try {
    return JSON.parse(fs.readFileSync(CAPTURE_STATUS_PATH, "utf8"));
  } catch {
    return {
      connectors: {}
    };
  }
}

export function updateConnectorStatus(name, patch) {
  const status = readCaptureStatus();
  status.connectors ??= {};
  status.connectors[name] = {
    ...(status.connectors[name] ?? {}),
    ...patch,
    updatedAt: new Date().toISOString()
  };
  fs.writeFileSync(CAPTURE_STATUS_PATH, `${JSON.stringify(status, null, 2)}\n`);
  return status.connectors[name];
}
