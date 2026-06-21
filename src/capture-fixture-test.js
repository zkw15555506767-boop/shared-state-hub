import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { listEvents } from "./store.js";
import { reduceEvents } from "./reducer.js";
import { generateJoinContext } from "./join-context.js";

const dbPath = "/private/tmp/shared-state-hub-capture-fixture.db";
const statusPath = "/private/tmp/shared-state-hub-capture-fixture-status.json";
const sessionsDir = "/private/tmp/shared-state-hub-codex-sessions-fixture";
const claudeProjectsDir = "/private/tmp/shared-state-hub-claude-projects-fixture";
const taskId = "task_shared_state_hub";

for (const suffix of ["", "-shm", "-wal"]) {
  fs.rmSync(`${dbPath}${suffix}`, { force: true });
}
fs.rmSync(statusPath, { force: true });
fs.rmSync(sessionsDir, { recursive: true, force: true });
fs.rmSync(claudeProjectsDir, { recursive: true, force: true });
fs.mkdirSync(`${sessionsDir}/2026/06/19`, { recursive: true });
fs.mkdirSync(`${claudeProjectsDir}/-Users-wow`, { recursive: true });

fs.writeFileSync(
  `${sessionsDir}/2026/06/19/rollout-fixture.jsonl`,
  [
    {
      timestamp: "2026-06-19T10:00:00+08:00",
      type: "session_meta",
      payload: {
        id: "codex_capture_fixture",
        cwd: "/Users/wow/code/shared-state-hub"
      }
    },
    {
      timestamp: "2026-06-19T10:01:00+08:00",
      type: "event_msg",
      payload: {
        type: "user_message",
        message: "Codex 自动捕获测试：请把这个输入同步给 Claude。"
      }
    },
    {
      timestamp: "2026-06-19T10:02:00+08:00",
      type: "response_item",
      payload: {
        type: "function_call",
        name: "apply_patch"
      }
    }
  ].map((item) => JSON.stringify(item)).join("\n") + "\n"
);

fs.writeFileSync(
  `${claudeProjectsDir}/-Users-wow/claude-fixture.jsonl`,
  [
    {
      timestamp: "2026-06-19T10:03:00+08:00",
      type: "user",
      sessionId: "claude_watcher_fixture",
      cwd: "/Users/wow",
      message: {
        role: "user",
        content: "Claude watcher 自动捕获测试：我不是从 shared-state-hub 目录启动的。"
      }
    },
    {
      timestamp: "2026-06-19T10:04:00+08:00",
      type: "assistant",
      sessionId: "claude_watcher_fixture",
      cwd: "/Users/wow",
      message: {
        role: "assistant",
        content: [
          {
            type: "text",
            text: "Claude watcher 已经可以从 transcript 捕获状态。"
          }
        ]
      }
    }
  ].map((item) => JSON.stringify(item)).join("\n") + "\n"
);

run("node", ["src/cli.js", "import-events", "fixtures/demo-events.json", "--db", dbPath]);
run("node", ["src/capture/codex-watcher.js", "--once"], {
  CODEX_SESSIONS_DIR: sessionsDir,
  HUB_DB: dbPath,
  HUB_CAPTURE_STATUS_PATH: statusPath
});

run("node", ["src/capture/claude-watcher.js", "--once"], {
  CLAUDE_PROJECTS_DIR: claudeProjectsDir,
  HUB_DB: dbPath,
  HUB_CAPTURE_STATUS_PATH: statusPath
});

run(
  "node",
  ["src/capture/claude-hook.js"],
  {
    HUB_DB: dbPath,
    HUB_CAPTURE_STATUS_PATH: statusPath
  },
  JSON.stringify({
    hook_event_name: "UserPromptSubmit",
    session_id: "claude_capture_fixture",
    cwd: "/Users/wow/code/shared-state-hub",
    prompt: "Claude 自动捕获测试：我已经读取 Codex 同步过来的状态。"
  })
);

const state = reduceEvents(listEvents({ taskId, dbPath }));
const joinContext = generateJoinContext(state, { budget: "deep" });

for (const expected of [
  "Codex 自动捕获测试",
  "Claude 自动捕获测试",
  "Claude watcher 自动捕获测试",
  "Codex started tool apply_patch"
]) {
  if (!joinContext.includes(expected)) {
    throw new Error(`capture fixture missing expected text: ${expected}`);
  }
}

const status = JSON.parse(fs.readFileSync(statusPath, "utf8"));
if (
  !status.connectors?.["codex-app"] ||
  !status.connectors?.["claude-code-hook"] ||
  !status.connectors?.["claude-code-watcher"]
) {
  throw new Error("capture status did not include all connectors");
}

console.log("OK: capture fixture passed");

function run(command, args, extraEnv = {}, input = undefined) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: {
      ...process.env,
      ...extraEnv
    },
    input,
    encoding: "utf8"
  });

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed\n${result.stdout}\n${result.stderr}`);
  }
}
