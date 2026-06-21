#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DB_PATH="${HUB_DB:-/private/tmp/shared-state-hub-dev.db}"
CAPTURE_LOG="${HUB_CAPTURE_LOG:-/private/tmp/shared-state-hub-codex-capture.log}"
CAPTURE_PID="${HUB_CAPTURE_PID:-/private/tmp/shared-state-hub-codex-capture.pid}"
CLAUDE_CAPTURE_LOG="${HUB_CLAUDE_CAPTURE_LOG:-/private/tmp/shared-state-hub-claude-capture.log}"
CLAUDE_CAPTURE_PID="${HUB_CLAUDE_CAPTURE_PID:-/private/tmp/shared-state-hub-claude-capture.pid}"

cd "$ROOT_DIR"

echo "Starting development mode only. For the persistent user setup, run: npm run setup"

if [[ -f "$CAPTURE_PID" ]] && kill -0 "$(cat "$CAPTURE_PID")" 2>/dev/null; then
  echo "Codex App watcher already running: $(cat "$CAPTURE_PID")"
else
  echo "Starting Codex App watcher..."
  HUB_DB="$DB_PATH" nohup node src/capture/codex-watcher.js --since-start >"$CAPTURE_LOG" 2>&1 &
  echo $! > "$CAPTURE_PID"
  echo "Codex watcher log: $CAPTURE_LOG"
fi

if [[ -f "$CLAUDE_CAPTURE_PID" ]] && kill -0 "$(cat "$CLAUDE_CAPTURE_PID")" 2>/dev/null; then
  echo "Claude Code watcher already running: $(cat "$CLAUDE_CAPTURE_PID")"
else
  echo "Starting Claude Code watcher..."
  HUB_DB="$DB_PATH" nohup node src/capture/claude-watcher.js --since-start >"$CLAUDE_CAPTURE_LOG" 2>&1 &
  echo $! > "$CLAUDE_CAPTURE_PID"
  echo "Claude watcher log: $CLAUDE_CAPTURE_LOG"
fi

exec bash scripts/start-dev-server.sh
