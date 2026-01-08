#!/bin/sh
# =============================================================================
# DIRECTUS COLD START ENTRYPOINT (v2 - Ghost Asset Fix)
# =============================================================================
# ARCHITECTURE FIX: Scripts that need Directus API must run AFTER Directus starts
#
# Sequence:
# 1. Start Directus server (background)
# 2. Wait for Directus to be healthy (localhost:8055/server/health)
# 3. Run fix_permissions.py (needs API access for Ghost Asset re-hydration)
# 4. Keep Directus running (foreground wait)
#
# Note: Schema/seed scripts removed from cold start - they run via ops-restore
# workflow post-deploy. Only fix_permissions.py runs here for Ghost Asset fix.
# =============================================================================

echo "[Cold Start] Directus Container Starting (v2)..."

# Start Directus in background
echo "[Cold Start] Starting Directus server (background)..."
npx directus start &
DIRECTUS_PID=$!

# Wait for Directus to be healthy (max 60 seconds)
echo "[Cold Start] Waiting for Directus to be healthy..."
MAX_WAIT=60
WAITED=0
HEALTH_URL="http://localhost:8055/server/health"

while [ $WAITED -lt $MAX_WAIT ]; do
    # Check if Directus process is still running
    if ! kill -0 $DIRECTUS_PID 2>/dev/null; then
        echo "[Cold Start] ERROR: Directus process died unexpectedly"
        exit 1
    fi

    # Check health endpoint
    if wget -q -O /dev/null --timeout=2 "$HEALTH_URL" 2>/dev/null; then
        echo "[Cold Start] Directus is healthy after ${WAITED}s"
        break
    fi

    sleep 1
    WAITED=$((WAITED + 1))
done

if [ $WAITED -ge $MAX_WAIT ]; then
    echo "[Cold Start] WARNING: Directus health check timed out after ${MAX_WAIT}s"
    echo "[Cold Start] Continuing anyway - fix_permissions.py may fail"
fi

# Run fix_permissions.py if credentials are available
if [ -n "$DIRECTUS_ADMIN_EMAIL" ] && [ -n "$DIRECTUS_ADMIN_PASSWORD" ]; then
    echo "[Cold Start] Admin credentials detected. Running Ghost Asset fix..."

    # Use localhost for internal calls (faster, no TLS overhead)
    export DIRECTUS_URL="http://localhost:8055"

    if [ -f "./scripts/directus/fix_permissions.py" ]; then
        echo "[Cold Start] Fixing permissions and re-hydrating Ghost Assets..."
        python3 ./scripts/directus/fix_permissions.py || {
            echo "[Cold Start] WARNING: Permission fix had errors (non-fatal)"
        }
    else
        echo "[Cold Start] WARNING: fix_permissions.py not found"
    fi

    echo "[Cold Start] Ghost Asset fix complete."
else
    echo "[Cold Start] No admin credentials set. Skipping Ghost Asset fix."
fi

echo "[Cold Start] Directus running (PID: $DIRECTUS_PID). Waiting..."

# Wait for Directus process (keeps container alive)
wait $DIRECTUS_PID
