# Architecture

Shared State Hub is built around one idea:

```text
many agent surfaces → normalized events → live state → handoff context
```

## Components

```text
Capture Sources
  ├─ Codex App watcher
  ├─ Claude Code hooks
  ├─ MCP writeback tools
  └─ Web UI forms

Hub Core
  ├─ Event validator
  ├─ SQLite event store
  ├─ Reducer
  └─ Join Context generator

Consumers
  ├─ Web dashboard
  ├─ MCP read APIs
  └─ CLI/debug commands
```

## Event Log

The Event Log is append-only. User edits, redactions, and corrections are stored as new events instead of mutating old events.

This makes handoff auditable:

- what happened;
- who wrote it;
- when it was captured;
- whether it came from MCP, hooks, watcher, or UI.

## Live State

Live State is derived from the Event Log by `src/reducer.js`.

It includes:

- current task title, phase, status;
- active agents;
- active claims;
- context snippets;
- decisions;
- pitfalls;
- artifacts;
- conflict warnings;
- next steps.

## Join Context

Join Context is a budgeted Markdown summary generated from Live State.

Agents use it when joining or continuing a task:

```text
get_join_context(taskId, budget)
```

Budgets:

- `tiny`
- `standard`
- `deep`

## Capture Sources

### Codex App

The Codex watcher tails local JSONL session logs under:

```text
~/.codex/sessions
```

It extracts user prompts, assistant status messages, and tool calls.

This is best-effort because Codex App session logs are not a stable public API.

### Claude Code

Claude Code integration uses project hooks in:

```text
.claude/settings.local.json
```

The hook script writes prompts, tool events, and session lifecycle events into the Hub.

### MCP

The MCP server exposes explicit read/write tools for agents that support MCP.

This is the most stable integration path.

## Privacy Model

Default capture mode is `summary`.

Before writing capture events:

- secret-like strings are redacted;
- long text is truncated;
- full assistant output is not stored by default.

Use environment variables to tune behavior:

```bash
HUB_CAPTURE_MODE=summary
HUB_CAPTURE_TASK_ID=task_shared_state_hub
HUB_DB=/path/to/hub.db
```
