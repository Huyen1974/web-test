#!/usr/bin/env bash
# Điều 31 — Cron Integrity Check (Vòng B: Scheduled Audit)
# Runs daily at 3AM VN time (20:00 UTC) on VPS
# Crontab: 0 20 * * * /opt/incomex/deploys/web-test/scripts/integrity/cron-integrity.sh

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="/opt/incomex/logs/integrity"
mkdir -p "$LOG_DIR"

# Ensure gcloud is in PATH (cron has minimal PATH)
export PATH="/usr/local/bin:/usr/bin:/bin:/snap/bin:$PATH"
# Google Cloud SDK paths (common install locations)
for SDK_DIR in /usr/lib/google-cloud-sdk /snap/google-cloud-cli/current /opt/google-cloud-sdk "$HOME/google-cloud-sdk"; do
    [ -d "$SDK_DIR/bin" ] && export PATH="$SDK_DIR/bin:$PATH" && break
done

# Token from GSM (gcloud must be configured on VPS)
export DIRECTUS_TOKEN="${DIRECTUS_TOKEN:-$(gcloud secrets versions access latest --secret="DIRECTUS_ADMIN_TOKEN" --project="github-chatgpt-ggcloud" 2>&1)}"
export DIRECTUS_URL="${DIRECTUS_URL:-https://directus.incomexsaigoncorp.vn}"
export SITE_URL="${SITE_URL:-https://vps.incomexsaigoncorp.vn}"
# PG connection for measurement_registry (v2.0 PG-driven runner)
PG_U=$(gcloud secrets versions access latest --secret=PG_USER --project=github-chatgpt-ggcloud 2>/dev/null || echo directus)
PG_P=$(gcloud secrets versions access latest --secret=PG_PASSWORD --project=github-chatgpt-ggcloud 2>/dev/null || echo directus)
PG_D=$(gcloud secrets versions access latest --secret=PG_DATABASE --project=github-chatgpt-ggcloud 2>/dev/null || echo directus)
export DATABASE_URL="${DATABASE_URL:-postgresql://${PG_U}:${PG_P}@localhost:5432/${PG_D}}"

# Fail-fast if token is empty or looks like an error
if [ -z "$DIRECTUS_TOKEN" ] || echo "$DIRECTUS_TOKEN" | grep -qi "error\|not found\|permission"; then
    echo "FATAL: Failed to get DIRECTUS_TOKEN from GSM. Token value: ${DIRECTUS_TOKEN:0:50}" >&2
    exit 1
fi

RUN_ID="cron-$(date +%Y%m%d-%H%M%S)"
LOG_FILE="$LOG_DIR/$RUN_ID.log"

echo "=== Điều 31 Cron — $RUN_ID ===" | tee "$LOG_FILE"
echo "Time: $(date)" | tee -a "$LOG_FILE"

# Find node binary
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" 2>/dev/null
NODE_BIN=$(which node 2>/dev/null || ls /usr/local/bin/node 2>/dev/null || ls "$NVM_DIR"/versions/node/*/bin/node 2>/dev/null | tail -1)

$NODE_BIN "$SCRIPT_DIR/main.js" --tier=all --run-id="$RUN_ID" 2>&1 | tee -a "$LOG_FILE"
EXIT=$?

echo "=== Done: $(date) — exit $EXIT ===" | tee -a "$LOG_FILE"

# Keep only last 30 logs
ls -t "$LOG_DIR"/cron-*.log 2>/dev/null | tail -n +31 | xargs rm -f 2>/dev/null || true

exit $EXIT
