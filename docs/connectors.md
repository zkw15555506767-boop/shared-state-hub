# Connector Setup

For the normal macOS installation, run once:

```bash
npm run setup
```

It backs up existing settings, adds only Hub-owned entries, and connects both Codex App and Claude Code to the same local MCP server. The background service starts automatically after login.

## What Setup Configures

- Codex App: a managed `shared_state_hub` entry in `~/.codex/config.toml`.
- Claude Code: a user-scope `shared_state_hub` entry through `claude mcp add`.
- Runtime: a stable local copy under `~/Library/Application Support/Shared State Hub`.

The MCP server uses local environment variables such as:

```text
HUB_DB=/path/to/shared-state-hub.db
HUB_CAPTURE_STATUS_PATH=/path/to/capture-status.json
```

## Print Connector Guides

```bash
npm run connector:codex
npm run connector:claude
npm run connector:cursor
npm run connector:trae
```

These commands are read-only. They print instructions and do not modify agent config.

## Codex App

Codex App reads MCP server config from:

```text
~/.codex/config.toml
```

Generate the recommended config:

```bash
npm run connector:codex
```

The legacy `setup:apply` command is retained for local development only. Prefer `npm run setup` for normal installation.

## Claude Code

Claude Code can also read a project-local MCP config from:

```text
.mcp.json
```

The normal installer uses **user scope** so every Claude Code project can access the Hub. Project-local configuration and hooks remain optional advanced integrations.

## Cursor

Generate a guide:

```bash
npm run connector:cursor
```

Cursor MCP support should be configured through Cursor's MCP settings and project rules.

## Trae

Generate a guide:

```bash
npm run connector:trae
```

Trae is treated as L2 guaranteed / L3 experimental in this prototype.

## Manual Template

See:

```text
examples/mcp.json
examples/claude-settings.local.json
```
