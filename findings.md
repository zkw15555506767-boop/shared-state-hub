# Findings

- The existing dashboard exposes developer commands in the primary view, which conflicts with the desired normal-user flow.
- The desired installer must manage three concerns together: MCP configuration, automatic transcript capture, and a persistent local process.
- A macOS LaunchAgent is the smallest native mechanism to survive Terminal closure and login without introducing a desktop shell.
- LaunchAgent runtime paths must use `fileURLToPath()` because the default Application Support path contains spaces.
- Claude Code's `mcp add` accepts repeated environment flags after the server name; placing the name after variadic environment flags causes it to be parsed as an invalid environment variable.
- Legacy Hub Codex entries can include a separate `.env` TOML table; migration must replace the full Hub section family to avoid duplicate TOML tables.
