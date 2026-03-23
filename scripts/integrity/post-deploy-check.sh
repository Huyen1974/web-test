#!/usr/bin/env bash
# Điều 31 — Post-Deploy Check (Vòng A: Tier A only)
# Called by deploy workflow after rsync. Non-blocking (|| true in caller).

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

export DIRECTUS_TOKEN="${DIRECTUS_TOKEN:-$(gcloud secrets versions access latest --secret="DIRECTUS_ADMIN_TOKEN" --project="github-chatgpt-ggcloud" 2>/dev/null || echo "")}"
export DIRECTUS_URL="${DIRECTUS_URL:-https://directus.incomexsaigoncorp.vn}"
export SITE_URL="${SITE_URL:-https://vps.incomexsaigoncorp.vn}"

RUN_ID="deploy-$(date +%Y%m%d-%H%M%S)"
echo "=== Điều 31 Post-Deploy — $RUN_ID ==="

# Find node binary
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" 2>/dev/null
NODE_BIN=$(which node 2>/dev/null || ls /usr/local/bin/node 2>/dev/null || ls "$NVM_DIR"/versions/node/*/bin/node 2>/dev/null | tail -1)

$NODE_BIN "$SCRIPT_DIR/main.js" --tier=A --run-id="$RUN_ID"
