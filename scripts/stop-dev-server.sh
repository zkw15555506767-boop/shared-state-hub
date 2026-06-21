#!/usr/bin/env bash
set -euo pipefail

PORT="${HUB_PORT:-43177}"
CAPTURE_PID="${HUB_CAPTURE_PID:-/private/tmp/shared-state-hub-codex-capture.pid}"
CLAUDE_CAPTURE_PID="${HUB_CLAUDE_CAPTURE_PID:-/private/tmp/shared-state-hub-claude-capture.pid}"
PIDS="$(lsof -ti "tcp:${PORT}" 2>/dev/null || true)"

if [[ -f "$CAPTURE_PID" ]] && kill -0 "$(cat "$CAPTURE_PID")" 2>/dev/null; then
  echo "Stopping Codex App watcher: $(cat "$CAPTURE_PID")"
  kill "$(cat "$CAPTURE_PID")" 2>/dev/null || true
  rm -f "$CAPTURE_PID"
fi

if [[ -f "$CLAUDE_CAPTURE_PID" ]] && kill -0 "$(cat "$CLAUDE_CAPTURE_PID")" 2>/dev/null; then
  echo "Stopping Claude Code watcher: $(cat "$CLAUDE_CAPTURE_PID")"
  kill "$(cat "$CLAUDE_CAPTURE_PID")" 2>/dev/null || true
  rm -f "$CLAUDE_CAPTURE_PID"
fi

if [[ -z "${PIDS}" ]]; then
  echo "No Shared State Hub process found on port ${PORT}."
  exit 0
fi

echo "Stopping process(es) on port ${PORT}: ${PIDS}"
kill ${PIDS}

for _ in {1..20}; do
  if ! lsof -ti "tcp:${PORT}" >/dev/null 2>&1; then
    echo "Port ${PORT} is free."
    exit 0
  fi
  sleep 0.2
done

echo "Port ${PORT} is still in use; sending SIGKILL."
kill -9 ${PIDS} 2>/dev/null || true
