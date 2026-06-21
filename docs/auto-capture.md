# Auto Capture

Shared State Hub supports two capture modes.

## 1. Agent Tool Writeback

This is the most reliable path.

Agents call MCP tools directly:

- `get_join_context`
- `add_context`
- `update_task`
- `record_decision`
- `record_pitfall`
- `claim_work`
- `release_claim`

Project instructions are installed into:

```text
AGENTS.md
CLAUDE.md
```

Install or refresh them:

```bash
npm run setup:instructions
```

## 2. Local Auto Capture

This is a best-effort passive capture layer.

With the standard macOS setup, both watchers start automatically as part of the background service:

```bash
npm run setup
```

You do not need to run a watcher command in a Terminal. The commands below are useful only for development, diagnosis, or a temporary manual run.

### Codex App

Manual development run:

```bash
npm run capture:codex
```

It tails:

```text
~/.codex/sessions/**/*.jsonl
```

Captured examples:

- user prompt;
- assistant status;
- tool started;
- tool completed;
- session started.

Codex App logs are not a stable official API, so this connector should be treated as best-effort.

### Claude Code

Manual development run:

```bash
npm run capture:claude
```

It tails:

```text
~/.claude/projects/**/*.jsonl
```

This works even when Claude Code was not started from this project directory.

Install project hooks:

```bash
npm run capture:install:claude
```

This writes project-local hooks to:

```text
.claude/settings.local.json
```

Captured events:

- `SessionStart`
- `UserPromptSubmit`
- `PreToolUse`
- `PostToolUse`
- `PostToolUseFailure`
- `Stop`
- `SessionEnd`

The transcript watcher works even when Claude Code was not started from the Hub project directory. Project hooks remain optional for more structured project-local lifecycle events.

## Capture Modes

Default:

```bash
HUB_CAPTURE_MODE=summary
```

Supported modes:

| Mode | Behavior |
| --- | --- |
| `summary` | Store short redacted summaries only |
| `prompt` | Include redacted prompt content |
| `full` | Include longer redacted content |

## Redaction

Before writing to the event log, the capture layer redacts common secret-like patterns:

- OpenAI-style API keys;
- GitHub tokens;
- Slack tokens;
- `api_key=...`;
- `token=...`;
- `Authorization: Bearer ...`;
- `password=...`;
- `cookie=...`.

## Status

In the UI, open a task and check:

```text
自动捕获 / Auto Capture
```

Or use:

```bash
curl http://127.0.0.1:43177/capture/status
```
