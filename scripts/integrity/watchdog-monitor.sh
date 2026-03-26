#!/usr/bin/env bash
# WATCHDOG Monitor — checks if Điều 31 runner is alive
# Runs hourly via cron. Alerts if WATCHDOG issue last_seen_at > 26h ago.
# Crontab: 0 * * * * /opt/incomex/deploys/web-test/scripts/integrity/watchdog-monitor.sh

set -euo pipefail

DIRECTUS_URL="${DIRECTUS_URL:-https://directus.incomexsaigoncorp.vn}"
# Token: prefer env var, then Docker .env file, then GSM fallback
if [ -z "${DIRECTUS_TOKEN:-}" ]; then
  ENV_FILE="/opt/incomex/docker/.env"
  if [ -f "$ENV_FILE" ]; then
    DIRECTUS_TOKEN=$(grep '^DIRECTUS_ADMIN_TOKEN=' "$ENV_FILE" | cut -d= -f2)
  fi
fi
DIRECTUS_TOKEN="${DIRECTUS_TOKEN:-$(gcloud secrets versions access latest --secret="DIRECTUS_ADMIN_TOKEN" --project="github-chatgpt-ggcloud" 2>/dev/null || echo "")}"
MAX_AGE_SECONDS=$((26 * 3600))

if [ -z "$DIRECTUS_TOKEN" ]; then
  echo "WATCHDOG ALERT: No token — cannot verify runner liveness"
  exit 1
fi

# Find most recent WATCHDOG issue
WATCHDOG_JSON=$(curl -sfg "$DIRECTUS_URL/items/system_issues?filter[source_system][_eq]=dieu31-runner&filter[issue_class][_eq]=watchdog_fault&limit=1&sort=-last_seen_at&fields=last_seen_at,occurrence_count" \
  -H "Authorization: Bearer $DIRECTUS_TOKEN" 2>/dev/null || echo '{"data":[]}')

LAST_SEEN=$(echo "$WATCHDOG_JSON" | python3 -c "
import sys, json
from datetime import datetime, timezone
try:
    d = json.load(sys.stdin)
    ls = d.get('data', [{}])[0].get('last_seen_at', '')
    if ls:
        print(ls)
    else:
        print('NEVER')
except:
    print('ERROR')
" 2>/dev/null)

if [ "$LAST_SEEN" = "NEVER" ] || [ "$LAST_SEEN" = "ERROR" ]; then
  echo "WATCHDOG ALERT: Runner Điều 31 chưa bao giờ chạy hoặc không tìm thấy WATCHDOG issue"
  exit 1
fi

# Calculate age
AGE=$(python3 -c "
from datetime import datetime, timezone
import sys
try:
    ls = '$LAST_SEEN'.replace('Z', '+00:00')
    if '+' not in ls and 'T' in ls:
        ls += '+00:00'
    dt = datetime.fromisoformat(ls)
    now = datetime.now(timezone.utc)
    print(int((now - dt).total_seconds()))
except Exception as e:
    print(-1)
" 2>/dev/null)

if [ "$AGE" -lt 0 ]; then
  echo "WATCHDOG: Could not parse last_seen_at: $LAST_SEEN"
  exit 1
fi

if [ "$AGE" -gt "$MAX_AGE_SECONDS" ]; then
  HOURS=$((AGE / 3600))
  echo "WATCHDOG ALERT: Runner Điều 31 không chạy từ $LAST_SEEN (${HOURS}h ago, max ${MAX_AGE_SECONDS}s)"
  exit 1
fi

echo "WATCHDOG OK: Runner alive (last seen ${AGE}s ago)"
exit 0
