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
# PG connection — read from Docker .env file on VPS (reliable in all contexts)
ENV_FILE="/opt/incomex/deploys/docker/.env"
if [ -z "$DATABASE_URL" ] && [ -f "$ENV_FILE" ]; then
    PG_U=$(grep '^PG_USER=' "$ENV_FILE" | cut -d= -f2)
    PG_P=$(grep '^PG_PASSWORD=' "$ENV_FILE" | cut -d= -f2)
    PG_D=$(grep '^PG_DATABASE=' "$ENV_FILE" | cut -d= -f2 || echo directus)
    export DATABASE_URL="postgresql://${PG_U:-directus}:${PG_P:-directus}@localhost:5432/${PG_D:-directus}"
fi

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
