#!/usr/bin/env bash
# Scanner — D26 Counting Integrity Check (independent cron)
# Runs verify_counts() directly on PG and logs mismatches.
# Crontab: 0 */3 * * * .../scanner-counts.sh >> /opt/incomex/logs/integrity/scanner.log 2>&1

set -euo pipefail
LOG_DIR="/opt/incomex/logs/integrity"
mkdir -p "$LOG_DIR"

ENV_FILE="/opt/incomex/docker/.env"
PG_P=""
if [ -f "$ENV_FILE" ]; then
  PG_P=$(grep '^PG_PASSWORD=' "$ENV_FILE" | cut -d= -f2)
fi

if [ -z "$PG_P" ]; then
  echo "SCANNER: No PG password found in $ENV_FILE"
  exit 1
fi

echo "=== Scanner D26 — $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="

RESULT=$(docker exec -i postgres psql -U directus -d directus -t -A -c \
  "SELECT COUNT(*) FROM verify_counts() WHERE status != 'OK'" 2>&1)

if [ $? -ne 0 ]; then
  echo "SCANNER ERROR: verify_counts() failed: $RESULT"
  exit 1
fi

RESULT=$(echo "$RESULT" | tr -d '[:space:]')

if [ "$RESULT" = "0" ]; then
  echo "SCANNER OK: verify_counts() = 0 mismatches"
else
  echo "SCANNER WARNING: verify_counts() = $RESULT mismatches"
  docker exec -i postgres psql -U directus -d directus -c \
    "SELECT cat_code, collection_name, stored_record, live_record, stored_orphan, live_orphan FROM verify_counts() WHERE status != 'OK'" 2>&1
fi

echo "=== Done: $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="
