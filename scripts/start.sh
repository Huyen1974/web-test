#!/bin/sh
# =============================================================================
# DIRECTUS COLD START ENTRYPOINT (v3 - Zombie Container Prevention)
# =============================================================================
# ARCHITECTURE: "Death on Error" - If repair fails, container MUST crash
# to trigger Cloud Run's native retry mechanism. NO ZOMBIE CONTAINERS.
#
# Sequence:
# 1. Start Directus server (background)
# 2. Wait for Directus to be healthy (localhost:8055/server/health)
# 3. Run fix_permissions.py (CRITICAL - must succeed or container dies)
# 4. Keep Directus running (foreground wait)
#
# CRITICAL: If fix_permissions.py fails, we KILL Directus and EXIT with error.
# This prevents "Zombie Containers" that appear healthy but have broken state.
# =============================================================================

set -e  # Exit on any error (defensive)

echo "[Cold Start] Directus Container Starting (v3 - Hardened)..."

# Function to kill Directus and exit with error
die_with_directus() {
    echo "[Cold Start] FATAL: $1"
    echo "[Cold Start] Killing Directus (PID: $DIRECTUS_PID) to prevent Zombie Container..."
    kill $DIRECTUS_PID 2>/dev/null || true
    sleep 2
    kill -9 $DIRECTUS_PID 2>/dev/null || true
    echo "[Cold Start] Container will crash. Cloud Run will retry."
    exit 1
}

# Start Directus in background
echo "[Cold Start] Starting Directus server (background)..."
npx directus start &
DIRECTUS_PID=$!

# Wait for Directus to be healthy (max 90 seconds - increased for cold starts)
echo "[Cold Start] Waiting for Directus to be healthy..."
MAX_WAIT=90
WAITED=0
HEALTH_PORT="${PORT:-8080}"
HEALTH_URL="http://localhost:${HEALTH_PORT}/server/health"

while [ $WAITED -lt $MAX_WAIT ]; do
    # Check if Directus process is still running
    if ! kill -0 $DIRECTUS_PID 2>/dev/null; then
        echo "[Cold Start] FATAL: Directus process died unexpectedly"
        exit 1
    fi

    # Check health endpoint
    if curl -fsS --max-time 2 "$HEALTH_URL" >/dev/null 2>&1; then
        echo "[Cold Start] Directus is healthy after ${WAITED}s"
        break
    fi

    sleep 1
    WAITED=$((WAITED + 1))
done

if [ $WAITED -ge $MAX_WAIT ]; then
    die_with_directus "Directus health check timed out after ${MAX_WAIT}s"
fi

# Run fix_permissions.py if credentials are available
# CRITICAL: This MUST succeed or container dies
if [ -n "$DIRECTUS_ADMIN_EMAIL" ] && [ -n "$DIRECTUS_ADMIN_PASSWORD" ]; then
    echo "[Cold Start] Admin credentials detected. Running Ghost Asset fix..."

    # Use localhost for internal calls (faster, no TLS overhead)
    export DIRECTUS_URL="http://localhost:${HEALTH_PORT}"

    if [ -f "./scripts/directus/fix_permissions.py" ]; then
        echo "[Cold Start] Fixing permissions and re-hydrating Ghost Assets..."

        # DEATH ON ERROR: If fix_permissions.py fails, container MUST crash
        if ! python3 ./scripts/directus/fix_permissions.py; then
            die_with_directus "fix_permissions.py failed - Ghost Asset not restored"
        fi

        echo "[Cold Start] Ghost Asset fix SUCCEEDED."
    else
        die_with_directus "fix_permissions.py not found - cannot restore Ghost Assets"
    fi
else
    echo "[Cold Start] WARNING: No admin credentials set. Skipping Ghost Asset fix."
    echo "[Cold Start] NOTE: ops-smoke may fail if Ghost Assets are not restored."
fi

echo "[Cold Start] Directus running (PID: $DIRECTUS_PID). Container healthy."

# Wait for Directus process (keeps container alive)
wait $DIRECTUS_PID
