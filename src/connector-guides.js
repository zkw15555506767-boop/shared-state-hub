import path from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_DB_PATH } from "./store.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MCP_SERVER_PATH = path.join(__dirname, "mcp-server.js");

export const SUPPORTED_CONNECTORS = new Set(["codex", "claude-code", "cursor", "trae"]);

export function generateConnectorGuide(client, options = {}) {
  if (!SUPPORTED_CONNECTORS.has(client)) {
    throw new Error(`Unsupported connector: ${client}`);
  }

  const dbPath = options.dbPath ?? DEFAULT_DB_PATH;
  const serverCommand = `node ${JSON.stringify(MCP_SERVER_PATH)}`;
  const env = `"HUB_DB": ${JSON.stringify(dbPath)}`;
  const sharedHeader = [
    `# Shared State Hub connector: ${client}`,
    "",
    "This command is read-only. No files were modified.",
    "",
    "The Hub is a state relay, not an agent launcher. Configure the agent to connect to the local Hub MCP server when you are ready.",
    "",
    "## MCP server",
    "",
    "Command:",
    "",
    "```bash",
    serverCommand,
    "```",
    "",
    "Environment:",
    "",
    "```json",
    `{ ${env} }`,
    "```",
    ""
  ];

  const guide = {
    codex: codexGuide(serverCommand, env),
    "claude-code": claudeCodeGuide(serverCommand, env),
    cursor: cursorGuide(serverCommand, env),
    trae: traeGuide(serverCommand, env)
  }[client];

  return [...sharedHeader, ...guide].join("\n");
}

function codexGuide(serverCommand, env) {
  return [
    "## Codex App setup",
    "",
    "Minimum useful setup: add Shared State Hub as an MCP server in Codex App.",
    "",
    "This targets the desktop App surface, not the optional `codex` terminal CLI.",
    "",
    "Example config shape:",
    "",
    "```toml",
    "[mcp_servers.shared_state_hub]",
    `command = ${JSON.stringify(serverCommand.split(" ")[0])}`,
    `args = [${serverCommand.split(" ").slice(1).join(", ")}]`,
    "",
    "[mcp_servers.shared_state_hub.env]",
    `HUB_DB = ${JSON.stringify(JSON.parse(`{${env}}`).HUB_DB)}`,
    "```",
    "",
    "After adding the entry, restart Codex App or open a new Codex thread so the MCP server list is reloaded.",
    "",
    "Suggested startup instruction for AGENTS.md or your prompt:",
    "",
    "```md",
    "Before starting work, call `get_join_context` for the current project/task if available.",
    "During work, use `claim_work` before editing a file or taking a subtask.",
    "Record important decisions, pitfalls, and task updates via Shared State Hub tools.",
    "```",
    "",
    "Optional L3 hooks should be enabled only through explicit guided setup."
  ];
}

function claudeCodeGuide(serverCommand, env) {
  return [
    "## Claude Code setup",
    "",
    "Minimum useful setup: add Shared State Hub as an MCP server in Claude Code.",
    "",
    "Example MCP server entry:",
    "",
    "```json",
    JSON.stringify(
      {
        shared_state_hub: {
          command: serverCommand.split(" ")[0],
          args: serverCommand.split(" ").slice(1).map((value) => JSON.parse(value)),
          env: JSON.parse(`{${env}}`)
        }
      },
      null,
      2
    ),
    "```",
    "",
    "Suggested project memory instruction:",
    "",
    "```md",
    "Use Shared State Hub to get current task state before work.",
    "Claim files or subtasks before editing.",
    "Write decisions, pitfalls, and handoff-worthy task updates back to the Hub.",
    "```",
    "",
    "Optional L3 hooks can later capture SessionStart, UserPromptSubmit, PostToolUse, Stop, and SessionEnd."
  ];
}

function cursorGuide(serverCommand, env) {
  return [
    "## Cursor setup",
    "",
    "Minimum useful setup: add Shared State Hub as an MCP server and add a project rule telling Cursor when to use it.",
    "",
    "Example MCP server entry:",
    "",
    "```json",
    JSON.stringify(
      {
        shared_state_hub: {
          command: serverCommand.split(" ")[0],
          args: serverCommand.split(" ").slice(1).map((value) => JSON.parse(value)),
          env: JSON.parse(`{${env}}`)
        }
      },
      null,
      2
    ),
    "```",
    "",
    "Suggested Cursor rule:",
    "",
    "```md",
    "When joining or continuing a task, first query Shared State Hub for Join Context.",
    "Before editing files, claim the file or subtask through Shared State Hub.",
    "When a meaningful state change happens, record it back to Shared State Hub.",
    "```",
    "",
    "Optional L3 hooks/native extension should be enabled only after user review."
  ];
}

function traeGuide(serverCommand, env) {
  return [
    "## Trae setup",
    "",
    "Trae is currently treated as L2 guaranteed / L3 experimental.",
    "",
    "Minimum useful setup: add Shared State Hub as an MCP server if Trae MCP config is available.",
    "",
    "Example MCP server entry:",
    "",
    "```json",
    JSON.stringify(
      {
        shared_state_hub: {
          command: serverCommand.split(" ")[0],
          args: serverCommand.split(" ").slice(1).map((value) => JSON.parse(value)),
          env: JSON.parse(`{${env}}`)
        }
      },
      null,
      2
    ),
    "```",
    "",
    "Suggested rule/bootstrap instruction:",
    "",
    "```md",
    "Use Shared State Hub for task state. Query Join Context before work, claim files before editing, and record decisions/pitfalls/task updates.",
    "```",
    "",
    "Do not enable experimental log watcher or extension bridge until Trae L3 behavior is validated."
  ];
}
