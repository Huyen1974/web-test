#!/bin/sh
# =============================================================================
# RESTORE_APPENDIX_16.SH - Idempotent Restoration Sequence
# =============================================================================
# PURPOSE: Restore Directus Live Server to APPENDIX 16 Compliance
# TARGETS:
#   - Schema: 50+ tables (full Agency OS schema)
#   - Flows: 5 active flows
#   - Branding: Project Name = "Agency OS"
#   - Permissions: Public READ access to essential collections
#
# USAGE:
#   DIRECTUS_ADMIN_EMAIL="..." DIRECTUS_ADMIN_PASSWORD="..." ./scripts/restore_appendix_16.sh
#
# ENVIRONMENT VARIABLES:
#   DIRECTUS_URL           - Target Directus instance (defaults to live server)
#   DIRECTUS_ADMIN_EMAIL   - Admin email for authentication
#   DIRECTUS_ADMIN_PASSWORD - Admin password for authentication
# =============================================================================

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default Directus URL (Live Server)
DIRECTUS_URL="${DIRECTUS_URL:-https://directus-test-812872501910.asia-southeast1.run.app}"

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
WEB_DIR="$ROOT_DIR/web"

echo -e "${BLUE}=============================================================================${NC}"
echo -e "${BLUE}     APPENDIX 16 RESTORATION SEQUENCE                                       ${NC}"
echo -e "${BLUE}=============================================================================${NC}"
echo ""
echo -e "Target URL: ${YELLOW}$DIRECTUS_URL${NC}"
echo -e "Timestamp:  $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# Verify required environment variables
if [ -z "$DIRECTUS_ADMIN_EMAIL" ] || [ -z "$DIRECTUS_ADMIN_PASSWORD" ]; then
    echo -e "${RED}ERROR: Missing required environment variables${NC}"
    echo "  - DIRECTUS_ADMIN_EMAIL"
    echo "  - DIRECTUS_ADMIN_PASSWORD"
    echo ""
    echo "Usage:"
    echo "  DIRECTUS_ADMIN_EMAIL='...' DIRECTUS_ADMIN_PASSWORD='...' $0"
    exit 1
fi

# Export for child scripts
export DIRECTUS_URL
export DIRECTUS_ADMIN_EMAIL
export DIRECTUS_ADMIN_PASSWORD

# Track results
STEP_RESULTS_FILE="$(mktemp)"

run_step() {
    step_num="$1"
    step_name="$2"
    step_cmd="$3"

    echo ""
    echo -e "${BLUE}--- Step $step_num: $step_name ---${NC}"

    if eval "$step_cmd"; then
        echo -e "${GREEN}[PASS] $step_name completed successfully${NC}"
        printf '%s\n' "$step_num:PASS:$step_name" >> "$STEP_RESULTS_FILE"
        return 0
    else
        echo -e "${RED}[FAIL] $step_name failed${NC}"
        printf '%s\n' "$step_num:FAIL:$step_name" >> "$STEP_RESULTS_FILE"
        return 1
    fi
}

# =============================================================================
# STEP 1: APPLY SCHEMA
# =============================================================================
run_step "1" "Apply Schema" \
    "python3 '$SCRIPT_DIR/directus/schema_apply.py' --execute"

# =============================================================================
# STEP 2: DEPLOY CACHE WARMER FLOWS (e1-07)
# =============================================================================
run_step "2" "Deploy Cache Warmer Flows" \
    "cd '$WEB_DIR' && npx tsx scripts/e1-07_setup_cache_warmer.ts"

# =============================================================================
# STEP 3: DEPLOY MAINTENANCE FLOWS (e1-08)
# =============================================================================
run_step "3" "Deploy Maintenance Flows" \
    "cd '$WEB_DIR' && npx tsx scripts/e1-08_setup_maintenance_flows.ts"

# =============================================================================
# STEP 4: SEED CONTENT & BRANDING
# =============================================================================
run_step "4" "Seed Content & Branding" \
    "python3 '$SCRIPT_DIR/directus/seed_minimal.py'"

# =============================================================================
# STEP 5: FIX PUBLIC PERMISSIONS
# =============================================================================
run_step "5" "Fix Public Permissions" \
    "cd '$WEB_DIR' && npx tsx scripts/e1-11_fix_public_permissions.ts"

# =============================================================================
# STEP 6: SEED GOLDEN ASSET
# =============================================================================
run_step "6" "Seed Golden Asset" \
    "cd '$WEB_DIR' && npx tsx scripts/e1-10_seed_branding_navigation.ts"

# =============================================================================
# VERIFICATION
# =============================================================================
echo ""
echo -e "${BLUE}=============================================================================${NC}"
echo -e "${BLUE}     VERIFICATION                                                            ${NC}"
echo -e "${BLUE}=============================================================================${NC}"

# Check Flows Count
echo ""
echo -e "${YELLOW}Checking Flows...${NC}"
FLOWS_RESPONSE=$(curl -s -X POST "$DIRECTUS_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$DIRECTUS_ADMIN_EMAIL\",\"password\":\"$DIRECTUS_ADMIN_PASSWORD\"}" 2>/dev/null)

ACCESS_TOKEN=$(echo "$FLOWS_RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('access_token',''))" 2>/dev/null || echo "")

if [ -n "$ACCESS_TOKEN" ]; then
    FLOWS_COUNT=$(curl -s "$DIRECTUS_URL/flows?filter[status][_eq]=active" \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -H "Content-Type: application/json" 2>/dev/null | \
        python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('data',[])))" 2>/dev/null || echo "0")

    echo -e "Active Flows Count: ${YELLOW}$FLOWS_COUNT${NC}"

    if [ "$FLOWS_COUNT" -ge 5 ]; then
        echo -e "${GREEN}[PASS] Flow count meets target (>=5)${NC}"
    else
        echo -e "${RED}[WARN] Flow count below target (expected 5, got $FLOWS_COUNT)${NC}"
    fi
else
    echo -e "${RED}[WARN] Could not authenticate to verify flows${NC}"
fi

# Check Branding
echo ""
echo -e "${YELLOW}Checking Branding...${NC}"
SETTINGS_RESPONSE=$(curl -s "$DIRECTUS_URL/settings" 2>/dev/null)
PROJECT_NAME=$(echo "$SETTINGS_RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('project_name','UNKNOWN'))" 2>/dev/null || echo "UNKNOWN")

echo -e "Project Name: ${YELLOW}$PROJECT_NAME${NC}"

if [ "$PROJECT_NAME" = "Agency OS" ]; then
    echo -e "${GREEN}[PASS] Branding verified: 'Agency OS'${NC}"
else
    echo -e "${RED}[WARN] Branding mismatch (expected 'Agency OS', got '$PROJECT_NAME')${NC}"
fi

# Check Public Access
echo ""
echo -e "${YELLOW}Checking Public Access...${NC}"
PAGES_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$DIRECTUS_URL/items/pages?limit=1" 2>/dev/null)
echo -e "GET /items/pages: HTTP ${YELLOW}$PAGES_STATUS${NC}"

if [ "$PAGES_STATUS" = "200" ]; then
    echo -e "${GREEN}[PASS] Public access working${NC}"
else
    echo -e "${RED}[FAIL] Public access blocked (HTTP $PAGES_STATUS)${NC}"
fi

# =============================================================================
# SUMMARY
# =============================================================================
echo ""
echo -e "${BLUE}=============================================================================${NC}"
echo -e "${BLUE}     RESTORATION SUMMARY                                                     ${NC}"
echo -e "${BLUE}=============================================================================${NC}"
echo ""

PASS_COUNT=0
FAIL_COUNT=0

while IFS=: read -r num status name; do
    if [ "$status" = "PASS" ]; then
        echo -e "  Step $num: ${GREEN}PASS${NC} - $name"
        PASS_COUNT=$((PASS_COUNT + 1))
    else
        echo -e "  Step $num: ${RED}FAIL${NC} - $name"
        FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
done < "$STEP_RESULTS_FILE"

rm -f "$STEP_RESULTS_FILE"

echo ""
echo -e "Results: ${GREEN}$PASS_COUNT passed${NC}, ${RED}$FAIL_COUNT failed${NC}"
echo ""

if [ "$FAIL_COUNT" -eq 0 ]; then
    echo -e "${GREEN}=============================================================================${NC}"
    echo -e "${GREEN}     APPENDIX 16 RESTORATION COMPLETE                                        ${NC}"
    echo -e "${GREEN}=============================================================================${NC}"
    exit 0
else
    echo -e "${RED}=============================================================================${NC}"
    echo -e "${RED}     RESTORATION INCOMPLETE - FIX FAILURES AND RE-RUN                        ${NC}"
    echo -e "${RED}=============================================================================${NC}"
    exit 1
fi
