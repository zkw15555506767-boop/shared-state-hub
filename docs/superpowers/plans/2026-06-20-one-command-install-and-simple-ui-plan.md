# One-command Install and Simple UI Implementation Plan

1. Introduce shared application paths for production data, logs, status, and LaunchAgent files.
2. Add a package CLI with preview, interactive setup, status, open, stop, and uninstall commands.
3. Replace direct configuration writes with marker-aware Codex edits and Claude Code's supported user-scope MCP command.
4. Add a supervised background runner and macOS LaunchAgent lifecycle.
5. Keep existing `dev:*` scripts for contributors, but remove setup side effects from the developer launcher.
6. Simplify the task page and move raw capture commands and manual event forms into Settings/Diagnostics.
7. Add focused installer and UI fixtures, then run all existing fixtures.
