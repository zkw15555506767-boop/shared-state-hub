#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const apply = process.argv.includes("--apply");
const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const settingsDir = path.join(rootDir, ".claude");
const settingsPath = path.join(settingsDir, "settings.local.json");
const hookScript = path.join(rootDir, "src", "capture", "claude-hook.js");
const hookCommand = `node ${JSON.stringify(hookScript)}`;
const hookEvents = [
  "SessionStart",
  "UserPromptSubmit",
  "PreToolUse",
  "PostToolUse",
  "PostToolUseFailure",
  "Stop",
  "SessionEnd"
];

const settings = readJson(settingsPath) ?? {};
settings.hooks ??= {};

let changed = false;
for (const eventName of hookEvents) {
  settings.hooks[eventName] ??= [];
  const exists = settings.hooks[eventName].some((entry) =>
    entry?.hooks?.some((hook) => hook.command === hookCommand)
  );
  if (exists) continue;
  settings.hooks[eventName].push({
    matcher: "",
    hooks: [
      {
        type: "command",
        command: hookCommand,
        timeout: 5
      }
    ]
  });
  changed = true;
}

if (!changed) {
  console.log(`No changes needed: ${settingsPath}`);
  process.exit(0);
}

if (!apply) {
  console.log(`Would update: ${settingsPath}`);
  console.log("Dry run only. Run `npm run capture:install:claude` to apply.");
  process.exit(0);
}

fs.mkdirSync(settingsDir, { recursive: true });
if (fs.existsSync(settingsPath)) {
  fs.writeFileSync(`${settingsPath}.bak-${new Date().toISOString().replaceAll(/[:.]/g, "-")}`, fs.readFileSync(settingsPath));
}
fs.writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`);
console.log(`Updated: ${settingsPath}`);

function readJson(filePath) {
  if (!fs.existsSync(filePath)) return undefined;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}
