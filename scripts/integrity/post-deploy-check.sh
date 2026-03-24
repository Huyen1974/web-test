#!/usr/bin/env bash
# Điều 31 — Post-Deploy Check (Vòng A: Tier A only)
# Called by deploy workflow after rsync. Non-blocking (|| true in caller).

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Ensure gcloud is in PATH (VPS deploy context may have minimal PATH)
export PATH="/usr/local/bin:/usr/bin:/bin:/snap/bin:$PATH"
for SDK_DIR in /usr/lib/google-cloud-sdk /snap/google-cloud-cli/current /opt/google-cloud-sdk "$HOME/google-cloud-sdk"; do
    [ -d "$SDK_DIR/bin" ] && export PATH="$SDK_DIR/bin:$PATH" && break
done

export DIRECTUS_TOKEN="${DIRECTUS_TOKEN:-$(gcloud secrets versions access latest --secret="DIRECTUS_ADMIN_TOKEN" --project="github-chatgpt-ggcloud" 2>&1)}"
export DIRECTUS_URL="${DIRECTUS_URL:-https://directus.incomexsaigoncorp.vn}"
export SITE_URL="${SITE_URL:-https://vps.incomexsaigoncorp.vn}"
# PG connection for v2.0 PG-driven runner (measurement_registry)
export DATABASE_URL="${DATABASE_URL:-postgresql://directus:directus@localhost:5432/directus}"

# Warn if token looks like an error (non-blocking: post-deploy is || true)
if [ -z "$DIRECTUS_TOKEN" ] || echo "$DIRECTUS_TOKEN" | grep -qi "error\|not found\|permission"; then
    echo "WARNING: DIRECTUS_TOKEN may be invalid — running in DRY-RUN mode"
fi

RUN_ID="deploy-$(date +%Y%m%d-%H%M%S)"
echo "=== Điều 31 Post-Deploy — $RUN_ID ==="

# Find node binary
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" 2>/dev/null
NODE_BIN=$(which node 2>/dev/null || ls /usr/local/bin/node 2>/dev/null || ls "$NVM_DIR"/versions/node/*/bin/node 2>/dev/null | tail -1)

$NODE_BIN "$SCRIPT_DIR/main.js" --tier=A --run-id="$RUN_ID"
