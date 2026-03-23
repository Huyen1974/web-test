#!/usr/bin/env bash
# Điều 31 — Contract Schema Validator (bash wrapper)
# Validates all contracts in web/tests/contracts/ against schema.json
# Usage: bash scripts/validate-contracts.sh
# Exit: 0 = all PASS, 1 = at least one FAIL

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== Điều 31 — Contract Schema Validation ==="
echo ""

# Check node is available
if ! command -v node &> /dev/null; then
  echo "ERROR: node is required but not found"
  exit 1
fi

# Check ajv is installed
if [ ! -d "$PROJECT_DIR/web/node_modules/ajv" ]; then
  echo "Installing dependencies..."
  cd "$PROJECT_DIR/web" && npm install --no-audit --no-fund 2>/dev/null
fi

# Run validator
node "$SCRIPT_DIR/validate-contracts.js"
