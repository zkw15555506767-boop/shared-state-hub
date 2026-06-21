#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DB_PATH="${HUB_DB:-/private/tmp/shared-state-hub-dev.db}"
HOST="${HUB_HOST:-127.0.0.1}"
PORT="${HUB_PORT:-43177}"

cd "$ROOT_DIR"

node src/cli.js init-db "$DB_PATH"
node src/cli.js import-events fixtures/demo-events.json --db "$DB_PATH"

echo ""
echo "Shared State Hub is starting..."
echo "Dashboard: http://${HOST}:${PORT}/"
echo "Task page: http://${HOST}:${PORT}/tasks/task_shared_state_hub"
echo "Database: ${DB_PATH}"
echo ""

exec node src/cli.js serve --host "$HOST" --port "$PORT" --db "$DB_PATH"
