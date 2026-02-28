#!/bin/bash
# MCP connectivity test — run before/after any deployment
# Usage: /opt/incomex/scripts/test-mcp-connectivity.sh
# API key loaded from agent-data container env (no hardcoding)

PASS=0
FAIL=0

# Get API key from running agent-data container
API_KEY=$(docker exec incomex-agent-data printenv API_KEY 2>/dev/null)
if [ -z "$API_KEY" ]; then
  echo "ERROR: Cannot read API_KEY from agent-data container"
  exit 1
fi

echo "=== MCP Connectivity Test ==="
echo "Time: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo ""

# Test 1: MCP HTTP endpoint (initialize handshake)
echo -n "1. MCP handshake (initialize)... "
RESULT=$(curl -s -o /tmp/mcp-test.json -w "%{http_code}" --max-time 10 -X POST \
  https://vps.incomexsaigoncorp.vn/api/mcp \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{"jsonrpc":"2.0","method":"initialize","params":{"capabilities":{}},"id":1}')
if [ "$RESULT" = "200" ] && grep -q protocolVersion /tmp/mcp-test.json 2>/dev/null; then
  echo "PASS"
  PASS=$((PASS+1))
else
  echo "FAIL (HTTP $RESULT)"
  FAIL=$((FAIL+1))
fi

# Test 2: MCP tools/list
echo -n "2. MCP tools/list... "
RESULT=$(curl -s -o /tmp/mcp-tools.json -w "%{http_code}" --max-time 10 -X POST \
  https://vps.incomexsaigoncorp.vn/api/mcp \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{"jsonrpc":"2.0","method":"tools/list","params":{},"id":2}')
if [ "$RESULT" = "200" ] && grep -q tools /tmp/mcp-tools.json 2>/dev/null; then
  TOOL_COUNT=$(python3 -c "import json; d=json.load(open('/tmp/mcp-tools.json')); print(len(d['result']['tools']))" 2>/dev/null || echo '?')
  echo "PASS ($TOOL_COUNT tools)"
  PASS=$((PASS+1))
else
  echo "FAIL (HTTP $RESULT)"
  FAIL=$((FAIL+1))
fi

# Test 3: Agent Data health
echo -n "3. Agent Data /health... "
RESULT=$(curl -sf --max-time 15 https://vps.incomexsaigoncorp.vn/api/health -o /dev/null -w "%{http_code}")
if [ "$RESULT" = "200" ]; then
  echo "PASS"
  PASS=$((PASS+1))
else
  echo "FAIL (HTTP $RESULT)"
  FAIL=$((FAIL+1))
fi

# Test 4: Directus health
echo -n "4. Directus health... "
RESULT=$(curl -sf --max-time 15 https://directus.incomexsaigoncorp.vn/server/health -o /dev/null -w "%{http_code}")
if [ "$RESULT" = "200" ]; then
  echo "PASS"
  PASS=$((PASS+1))
else
  echo "FAIL (HTTP $RESULT)"
  FAIL=$((FAIL+1))
fi

# Test 5: OPS Proxy (Directus via ops subdomain)
echo -n "5. OPS Proxy (tasks endpoint)... "
RESULT=$(curl -s --max-time 15 -o /dev/null -w "%{http_code}" \
  "https://ops.incomexsaigoncorp.vn/items/tasks?limit=1" \
  -H "X-API-Key: $API_KEY")
if [ "$RESULT" = "200" ]; then
  echo "PASS"
  PASS=$((PASS+1))
else
  echo "FAIL (HTTP $RESULT)"
  FAIL=$((FAIL+1))
fi

echo ""
echo "Result: $PASS PASS, $FAIL FAIL"
rm -f /tmp/mcp-test.json /tmp/mcp-tools.json
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
