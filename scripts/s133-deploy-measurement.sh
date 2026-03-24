#!/usr/bin/env bash
# S133: Deploy Universal Measurement Framework to VPS
# Usage: bash scripts/s133-deploy-measurement.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SQL_FILE="$SCRIPT_DIR/../sql/s133_measurement_framework.sql"

echo "=== S133: Deploy Measurement Framework ==="
echo "SQL: $SQL_FILE"

# Get Directus token
TOKEN="${DIRECTUS_TOKEN:-$(gcloud secrets versions access latest --secret=DIRECTUS_ADMIN_TOKEN --project=github-chatgpt-ggcloud 2>/dev/null)}"
DIRECTUS_URL="${DIRECTUS_URL:-https://directus.incomexsaigoncorp.vn}"

if [ -z "$TOKEN" ]; then
    echo "ERROR: No DIRECTUS_TOKEN available"
    exit 1
fi

echo "1. Running SQL migration via Directus..."
# Directus doesn't have a SQL execution endpoint, so we use psql on VPS
# The SQL file will be deployed via rsync and executed directly
echo "   SQL file ready at: $SQL_FILE"
echo "   Run on VPS: psql -U directus -d directus -f /opt/incomex/deploys/web-test/sql/s133_measurement_framework.sql"

echo ""
echo "2. Registering collections in Directus..."

# Register law_catalog
curl -sk -X POST "$DIRECTUS_URL/collections" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"collection":"law_catalog","meta":{"collection":"law_catalog","icon":"gavel","note":"Danh mục luật — Universal Measurement Framework","display_template":"{{law_code}} — {{law_name}}","hidden":false,"singleton":false},"schema":{}}' \
  2>/dev/null || echo "   law_catalog: already exists or registered"

# Register measurement_registry
curl -sk -X POST "$DIRECTUS_URL/collections" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"collection":"measurement_registry","meta":{"collection":"measurement_registry","icon":"speed","note":"Danh mục measurements — thêm đo = thêm row","display_template":"{{measurement_id}} — {{measurement_name}}","hidden":false,"singleton":false},"schema":{}}' \
  2>/dev/null || echo "   measurement_registry: already exists or registered"

# Register measurement_log
curl -sk -X POST "$DIRECTUS_URL/collections" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"collection":"measurement_log","meta":{"collection":"measurement_log","icon":"history","note":"Kết quả chạy measurements","display_template":"{{run_id}} / {{measurement_id}} — {{result}}","hidden":false,"singleton":false},"schema":{}}' \
  2>/dev/null || echo "   measurement_log: already exists or registered"

echo ""
echo "3. Verify..."
# Check tables exist via Directus
for col in law_catalog measurement_registry measurement_log; do
    COUNT=$(curl -sk "$DIRECTUS_URL/items/$col?limit=0&meta=total_count" \
      -H "Authorization: Bearer $TOKEN" 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('meta',{}).get('total_count',0))" 2>/dev/null || echo "0")
    echo "   $col: $COUNT rows"
done

echo ""
echo "=== Done ==="
