#!/usr/bin/env bash
# Điều 31 — Integrity Runner (bash wrapper)
# Usage: bash scripts/integrity/run-integrity.sh [--tier=A] [--contract=CTR-001]
# Env:   DIRECTUS_URL, DIRECTUS_TOKEN (optional — dry-run without token)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RUN_ID=$(date +%Y%m%d-%H%M%S)-$(openssl rand -hex 4 2>/dev/null || echo "0000")

echo "=== Điều 31 Integrity Check ==="
echo "Run ID: $RUN_ID"
echo "Time:   $(date)"
echo ""

if ! command -v node &> /dev/null; then
  echo "ERROR: node is required but not found"
  exit 1
fi

node "$SCRIPT_DIR/main.js" --run-id="$RUN_ID" "$@"
EXIT=$?

echo ""
echo "Exit code: $EXIT"
echo "=== Done ==="
exit $EXIT
