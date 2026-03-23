#!/usr/bin/env bash
# Điều 31 M2 — Add 10 fields to system_issues collection via Directus API
# Usage: DIRECTUS_TOKEN=<admin-token> bash scripts/dieu31-m2-migrate.sh
# Requires: curl, admin token with schema permissions

set -euo pipefail

DIRECTUS_URL="${DIRECTUS_URL:-https://directus.incomexsaigoncorp.vn}"
TOKEN="${DIRECTUS_TOKEN:-}"

if [ -z "$TOKEN" ]; then
  echo "ERROR: DIRECTUS_TOKEN is required"
  echo "Usage: DIRECTUS_TOKEN=<admin-token> bash scripts/dieu31-m2-migrate.sh"
  exit 1
fi

echo "=== Điều 31 M2 — system_issues Field Migration ==="
echo "Target: $DIRECTUS_URL"
echo ""

HEADERS=(-H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json")
COLLECTION="system_issues"
PASSED=0
FAILED=0

add_field() {
  local field_name="$1"
  local payload="$2"
  local description="$3"

  echo -n "  Adding $field_name... "
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
    "${DIRECTUS_URL}/fields/${COLLECTION}" \
    "${HEADERS[@]}" \
    -d "$payload" 2>/dev/null || echo "000")

  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "204" ]; then
    echo "PASS ($description)"
    PASSED=$((PASSED+1))
  elif [ "$HTTP_CODE" = "400" ]; then
    echo "SKIP (already exists)"
    PASSED=$((PASSED+1))
  else
    echo "FAIL (HTTP $HTTP_CODE)"
    FAILED=$((FAILED+1))
  fi
}

add_field "source_system" \
  '{"field":"source_system","type":"string","meta":{"interface":"select-dropdown","options":{"choices":[{"text":"Điều 31 Runner","value":"dieu31-runner"},{"text":"DOT Scanner","value":"dot-scanner"},{"text":"Manual","value":"manual"},{"text":"Health Check","value":"health-check"}]},"display":"labels","width":"half"}}' \
  "dropdown: dieu31-runner|dot-scanner|manual|health-check"

add_field "issue_class" \
  '{"field":"issue_class","type":"string","meta":{"interface":"select-dropdown","options":{"choices":[{"text":"Render Fault","value":"render_fault"},{"text":"Data Fault","value":"data_fault"},{"text":"Sync Fault","value":"sync_fault"},{"text":"Contract Fault","value":"contract_fault"},{"text":"Infra Fault","value":"infra_fault"},{"text":"Watchdog Fault","value":"watchdog_fault"}]},"display":"labels","width":"half"}}' \
  "dropdown: render|data|sync|contract|infra|watchdog"

add_field "violation_hash" \
  '{"field":"violation_hash","type":"string","meta":{"interface":"input","width":"full","note":"Fingerprint for deduplication (indexed)"}}' \
  "indexed fingerprint"

add_field "business_logic_hash" \
  '{"field":"business_logic_hash","type":"string","meta":{"interface":"input","width":"half","note":"Fingerprint without URL (for logic-level dedupe)"}}' \
  "logic-level fingerprint"

add_field "run_id" \
  '{"field":"run_id","type":"string","meta":{"interface":"input","width":"half","note":"Trace back to verification run"}}' \
  "run ID trace"

add_field "first_seen_at" \
  '{"field":"first_seen_at","type":"timestamp","meta":{"interface":"datetime","width":"half","note":"First time this issue was detected"}}' \
  "first seen timestamp"

add_field "last_seen_at" \
  '{"field":"last_seen_at","type":"timestamp","meta":{"interface":"datetime","width":"half","note":"Most recent detection"}}' \
  "last seen timestamp"

add_field "occurrence_count" \
  '{"field":"occurrence_count","type":"integer","schema":{"default_value":1},"meta":{"interface":"input","width":"quarter","note":"Number of times detected"}}' \
  "occurrence counter"

add_field "verification_contract_id" \
  '{"field":"verification_contract_id","type":"string","meta":{"interface":"input","width":"half","note":"Link to Điều 31 contract (CTR-*)"}}' \
  "contract link"

add_field "evidence_snapshot" \
  '{"field":"evidence_snapshot","type":"json","meta":{"interface":"input-code","options":{"language":"json"},"width":"full","note":"Detailed evidence from verification run"}}' \
  "JSON evidence"

echo ""
echo "=== Migration Complete: $PASSED PASS, $FAILED FAIL ==="

if [ "$FAILED" -gt 0 ]; then
  echo "WARNING: Some fields failed. Check Directus logs."
  exit 1
fi
exit 0
