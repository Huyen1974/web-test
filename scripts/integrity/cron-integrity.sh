#!/usr/bin/env bash
# Điều 31 — Cron Integrity Check (Vòng B: Scheduled Audit)
# Runs daily at 3AM VN time (20:00 UTC) on VPS
# Crontab: 0 20 * * * /opt/incomex/deploys/web-test/scripts/integrity/cron-integrity.sh

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="/opt/incomex/logs/integrity"
mkdir -p "$LOG_DIR"

# Token from GSM (gcloud must be configured on VPS)
export DIRECTUS_TOKEN="${DIRECTUS_TOKEN:-$(gcloud secrets versions access latest --secret="DIRECTUS_ADMIN_TOKEN" --project="github-chatgpt-ggcloud" 2>/dev/null || echo "")}"
export DIRECTUS_URL="${DIRECTUS_URL:-https://directus.incomexsaigoncorp.vn}"
export SITE_URL="${SITE_URL:-https://vps.incomexsaigoncorp.vn}"

RUN_ID="cron-$(date +%Y%m%d-%H%M%S)"
LOG_FILE="$LOG_DIR/$RUN_ID.log"

echo "=== Điều 31 Cron — $RUN_ID ===" | tee "$LOG_FILE"
echo "Time: $(date)" | tee -a "$LOG_FILE"

node "$SCRIPT_DIR/main.js" --tier=all --run-id="$RUN_ID" 2>&1 | tee -a "$LOG_FILE"
EXIT=$?

echo "=== Done: $(date) — exit $EXIT ===" | tee -a "$LOG_FILE"

# Keep only last 30 logs
ls -t "$LOG_DIR"/cron-*.log 2>/dev/null | tail -n +31 | xargs rm -f 2>/dev/null || true

exit $EXIT
