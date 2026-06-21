# Task Plan: Publishable One-command Shared State Hub

## Goal

Turn the local prototype into a GitHub-installable macOS application with non-destructive Codex/Claude Code setup, persistent background capture, and a simplified user-facing dashboard.

## Phases

- [x] Define installation and UI design
- [x] Audit existing scripts and config writers
- [x] Build previewable non-destructive installer
- [x] Add macOS LaunchAgent lifecycle
- [x] Simplify dashboard and isolate diagnostics
- [x] Validate fresh-install and bidirectional capture fixtures
- [x] Prepare release documentation

## Validation

- `npm run setup:fixture` verifies Codex configuration is appended, migrated, and removed without touching unrelated entries.
- The real macOS LaunchAgent is running and serves the production database at `127.0.0.1:43177`.
- Codex App and Claude Code user-scope MCP entries point to the stable runtime under Application Support.

## Constraints

- Never silently modify agent configuration.
- Preserve existing Codex and Claude Code configuration.
- Keep raw private media local; share references and summaries by default.
- Target macOS first, with a future npm package entry point.
