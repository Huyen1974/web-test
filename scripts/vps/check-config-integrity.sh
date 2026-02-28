#!/bin/bash
# Verify nginx and docker-compose configs have not been modified
# Usage: /opt/incomex/scripts/check-config-integrity.sh

CHECKSUM_DIR="/opt/incomex/.checksums"
PASS=0
FAIL=0

echo "=== Config Integrity Check ==="
echo "Time: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo ""

# Check nginx config
NGINX_CONF="/opt/incomex/docker/nginx/conf.d/default.conf"
echo -n "1. Nginx config... "
if [ -f "$CHECKSUM_DIR/nginx.sha256" ]; then
  if sha256sum -c "$CHECKSUM_DIR/nginx.sha256" --quiet 2>/dev/null; then
    echo "PASS (unchanged)"
    PASS=$((PASS+1))
  else
    echo "MODIFIED!"
    echo "   Run: diff $NGINX_CONF ${NGINX_CONF}.verified"
    FAIL=$((FAIL+1))
  fi
else
  echo "SKIP (no baseline checksum)"
fi

# Check docker-compose
COMPOSE="/opt/incomex/docker/docker-compose.yml"
echo -n "2. Docker Compose... "
if [ -f "$CHECKSUM_DIR/compose.sha256" ]; then
  if sha256sum -c "$CHECKSUM_DIR/compose.sha256" --quiet 2>/dev/null; then
    echo "PASS (unchanged)"
    PASS=$((PASS+1))
  else
    echo "MODIFIED!"
    echo "   Run: diff $COMPOSE ${COMPOSE}.verified"
    FAIL=$((FAIL+1))
  fi
else
  echo "SKIP (no baseline checksum)"
fi

echo ""
echo "Result: $PASS PASS, $FAIL FAIL"
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
