#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

echo "== Shared State Hub setup =="
echo "This installs a background service and adds only Hub-owned MCP entries."
echo ""
npm run setup
