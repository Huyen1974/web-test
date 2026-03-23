#!/bin/bash
# smoke-test.sh v1.0 — Mandatory post-change verification
# Run AFTER any VPS change: deploy, restart, secret rotation, permission change
# Exit 1 if ANY check fails — DO NOT proceed with broken state
set -euo pipefail

echo "╔══════════════════════════════════════╗"
echo "║       INCOMEX SMOKE TEST v1.0        ║"
echo "╚══════════════════════════════════════╝"
echo ""

PASS=0
FAIL=0

check() {
  local name="$1"
  local url="$2"
  local expect_status="$3"
  local expect_content="${4:-}"

  local tmpfile=$(mktemp)
  STATUS=$(curl -s -o "$tmpfile" -w "%{http_code}" --max-time 15 "$url" 2>/dev/null || echo "000")

  if [ "$STATUS" != "$expect_status" ]; then
    echo "  ✗ FAIL: $name — Expected $expect_status, Got $STATUS"
    FAIL=$((FAIL+1))
    rm -f "$tmpfile"
    return
  fi

  if [ -n "$expect_content" ]; then
    if grep -q "$expect_content" "$tmpfile" 2>/dev/null; then
      echo "  ✓ PASS: $name"
      PASS=$((PASS+1))
    else
      echo "  ✗ FAIL: $name — Status OK but missing: $expect_content"
      FAIL=$((FAIL+1))
    fi
  else
    echo "  ✓ PASS: $name"
    PASS=$((PASS+1))
  fi
  rm -f "$tmpfile"
}

check_contract_keywords() {
  local name="$1"
  local url="$2"
  shift 2
  local keywords=("$@")
  local tmpfile=$(mktemp)
  local status
  local missing=()

  status=$(curl -s -o "$tmpfile" -w "%{http_code}" --max-time 15 "$url" 2>/dev/null || echo "000")

  if [ "$status" != "200" ]; then
    echo "  ✗ FAIL: $name — Expected 200, Got $status"
    FAIL=$((FAIL+1))
    rm -f "$tmpfile"
    return
  fi

  for keyword in "${keywords[@]}"; do
    if ! grep -Fq -- "$keyword" "$tmpfile" 2>/dev/null; then
      missing+=("$keyword")
    fi
  done

  if [ "${#missing[@]}" -eq 0 ]; then
    echo "  ✓ PASS: $name (contract keywords OK)"
    PASS=$((PASS+1))
  else
    echo "  ✗ FAIL: $name — missing keywords: ${missing[*]}"
    FAIL=$((FAIL+1))
  fi

  rm -f "$tmpfile"
}

echo "1. INFRASTRUCTURE"
check "Directus Health"    "https://directus.incomexsaigoncorp.vn/server/health" "200" '"status":"ok"'
check "Agent Data Health"  "https://vps.incomexsaigoncorp.vn/api/health"         "200" '"status":"healthy"'
check "Nuxt Frontend"      "https://vps.incomexsaigoncorp.vn/knowledge"          "200" ""

echo ""
echo "2. PUBLIC API — Directus Collections"
check "meta_catalog"         "https://directus.incomexsaigoncorp.vn/items/meta_catalog?limit=1"         "200" '"data"'
check "dot_tools"            "https://directus.incomexsaigoncorp.vn/items/dot_tools?limit=1"            "200" '"data"'
check "taxonomy"             "https://directus.incomexsaigoncorp.vn/items/taxonomy?limit=1"             "200" '"data"'
check "ui_pages"             "https://directus.incomexsaigoncorp.vn/items/ui_pages?limit=1"             "200" '"data"'
check "pages"                "https://directus.incomexsaigoncorp.vn/items/pages?limit=1"                "200" '"data"'
check "knowledge_documents"  "https://directus.incomexsaigoncorp.vn/items/knowledge_documents?limit=1"  "200" '"data"'
check "navigation"           "https://directus.incomexsaigoncorp.vn/items/navigation/main"              "200" '"data"'
check "globals"              "https://directus.incomexsaigoncorp.vn/items/globals"                      "200" ""
check "forms"                "https://directus.incomexsaigoncorp.vn/items/forms?limit=1"                "200" ""
check "posts"                "https://directus.incomexsaigoncorp.vn/items/posts?limit=1"                "200" '"data"'

echo ""
echo "3. WEBSITE PAGES"
check "Knowledge Hub"      "https://vps.incomexsaigoncorp.vn/knowledge"            "200" "Knowledge"
check_contract_keywords "Registries" "https://vps.incomexsaigoncorp.vn/knowledge/registries" \
  "CAT-SPE" "CAT-ORP" "Phân loại loài" "Thành phần" "Vấn đề Hệ thống"

check "Homepage"           "https://vps.incomexsaigoncorp.vn/"                    "200" "Incomex"

echo ""
echo "4. SECURITY — Public WRITE Blocked"
WRITE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 -X POST \
  -H "Content-Type: application/json" \
  -d '{"name":"smoke-test-inject"}' \
  "https://directus.incomexsaigoncorp.vn/items/meta_catalog" 2>/dev/null || echo "000")
if [ "$WRITE_STATUS" = "403" ] || [ "$WRITE_STATUS" = "400" ] || [ "$WRITE_STATUS" = "500" ]; then
  echo "  ✓ PASS: Public WRITE blocked ($WRITE_STATUS)"
  PASS=$((PASS+1))
else
  echo "  ✗ FAIL: Public WRITE NOT blocked! Got $WRITE_STATUS"
  FAIL=$((FAIL+1))
fi

echo ""
echo "═══════════════════════════════"
echo "  PASS: $PASS | FAIL: $FAIL"
if [ "$FAIL" -gt 0 ]; then
  echo "  SMOKE TEST FAILED — Fix failures before proceeding"
  exit 1
else
  echo "  ALL CHECKS PASSED"
  exit 0
fi
