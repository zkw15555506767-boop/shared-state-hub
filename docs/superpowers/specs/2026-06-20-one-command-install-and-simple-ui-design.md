# One-command Install and Simple UI Design

## Goal

Make Shared State Hub usable by a non-developer after one explicit setup action. The Hub must run in the background, connect both Codex App and Claude Code to the same local MCP service, and capture both clients without replacing the user's existing configuration.

## Product decision

Ship two entry points backed by the same installer:

1. A GitHub checkout can run `npm run setup`.
2. A future npm package can run `npx shared-state-hub setup`.

The first implementation targets macOS and uses a user LaunchAgent to keep the Hub and capture workers alive after login. It does not introduce an Electron/Tauri desktop application yet.

## Non-destructive configuration

Setup presents a clear preview and requires explicit confirmation before modifying any agent configuration. It creates a timestamped backup before each write and adds only Hub-owned, recognizable entries:

- Codex App: a `shared_state_hub` MCP server entry in `~/.codex/config.toml`.
- Claude Code: a Hub MCP entry in the selected Claude Code configuration scope.
- Capture: a Hub-owned launcher and status files under an application support directory.

Uninstall stops and removes the Hub-owned LaunchAgent, removes only Hub-owned configuration entries, and retains backups. It never restores an entire old config file over later user edits.

## Runtime model

The background service owns three long-lived processes:

- Hub HTTP/MCP daemon.
- Codex transcript watcher.
- Claude Code transcript watcher.

Each writes normalized events into the same local SQLite database. Both Codex App and Claude Code can query and record task state through MCP. A task start, explicit handoff, or a user request to continue triggers a budgeted Join Context read; continuous event updates do not inject unlimited history into either model context.

## UI model

The default page is an operational dashboard, not a developer console. It has exactly three primary sections:

1. **Current work**: task objective, current phase, next step, blockers.
2. **Sync health**: Codex and Claude status, last activity, a human-readable action when disconnected.
3. **Needs attention**: conflicts, pending review, or privacy decisions.

The user can expand a secondary "More" area for event history, manual corrections, configuration, diagnostics, and advanced actions. Commands such as `npm run capture:*` are never shown in the main dashboard.

## Files and artifacts

Automatic capture records references and compact metadata by default. Code files are represented by path, project-relative path, hash, git diff summary, and provenance. Images/videos/files are represented by artifact ID, path or managed local copy, MIME type, size, hash, and optional derived summaries. Raw media is not copied into agent context by default.

## Validation

- Fresh install preview does not mutate configuration.
- Confirmed install creates backups, LaunchAgent, MCP entries, and a running health check.
- Existing Codex and Claude configuration remains intact.
- New Codex and Claude transcript fixtures both create events in the shared DB.
- Uninstall removes only Hub-owned resources.
- UI fixture verifies the compact default dashboard and a separate settings/diagnostics surface.
