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

# Use local Directus binary when available to avoid npm/npx overhead at runtime
DIRECTUS_BIN="/directus/node_modules/.bin/directus"
run_directus() {
    if [ -x "$DIRECTUS_BIN" ]; then
        "$DIRECTUS_BIN" "$@"
    else
        npx directus "$@"
    fi
}

# Wait for database to be ready before running migrations or starting Directus
wait_for_database() {
    MAX_WAIT="${DIRECTUS_DB_WAIT_MAX:-60}"
    SLEEP_SEC="${DIRECTUS_DB_WAIT_INTERVAL:-2}"
    WAITED=0

    if [ -n "$DB_SOCKET_PATH" ]; then
        echo "[Cold Start] Waiting for Cloud SQL socket (${DB_SOCKET_PATH})..."
        while [ $WAITED -lt $MAX_WAIT ]; do
            if python3 - "$DB_SOCKET_PATH" <<'PY'
import socket
import sys

path = sys.argv[1]
s = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
s.settimeout(1)
try:
    s.connect(path)
except Exception:
    sys.exit(1)
else:
    sys.exit(0)
finally:
    try:
        s.close()
    except Exception:
        pass
PY
            then
                echo "[Cold Start] Cloud SQL socket is ready after ${WAITED}s"
                return 0
            fi
            sleep "$SLEEP_SEC"
            WAITED=$((WAITED + SLEEP_SEC))
        done
        echo "[Cold Start] FATAL: Cloud SQL socket not ready after ${MAX_WAIT}s"
        exit 1
    fi

    if [ -n "$DB_HOST" ] && [ -n "$DB_PORT" ]; then
        echo "[Cold Start] Waiting for DB TCP ${DB_HOST}:${DB_PORT}..."
        while [ $WAITED -lt $MAX_WAIT ]; do
            if python3 - "$DB_HOST" "$DB_PORT" <<'PY'
import socket
import sys

host = sys.argv[1]
port = int(sys.argv[2])
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
s.settimeout(1)
try:
    s.connect((host, port))
except Exception:
    sys.exit(1)
else:
    sys.exit(0)
finally:
    try:
        s.close()
    except Exception:
        pass
PY
            then
                echo "[Cold Start] DB TCP is ready after ${WAITED}s"
                return 0
            fi
            sleep "$SLEEP_SEC"
            WAITED=$((WAITED + SLEEP_SEC))
        done
        echo "[Cold Start] FATAL: DB TCP not ready after ${MAX_WAIT}s"
        exit 1
    fi

    echo "[Cold Start] WARNING: No DB_SOCKET_PATH or DB_HOST set; skipping DB wait."
}

# Wait for DB before any schema actions
wait_for_database

# Optional schema bootstrap/migrations (disable for faster cold starts)
if [ "${DIRECTUS_BOOTSTRAP_ON_START:-false}" = "true" ]; then
    echo "[Cold Start] Bootstrapping database (schema init)..."
    run_directus bootstrap --skipAdminInit
else
    echo "[Cold Start] Skipping bootstrap (DIRECTUS_BOOTSTRAP_ON_START not true)"
fi

if [ "${DIRECTUS_MIGRATE_ON_START:-false}" = "true" ]; then
    echo "[Cold Start] Running database migrations..."
    run_directus database migrate:latest
else
    echo "[Cold Start] Skipping migrations (DIRECTUS_MIGRATE_ON_START not true)"
fi

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
run_directus start &
DIRECTUS_PID=$!

# Wait for Directus to be healthy (configurable via DIRECTUS_STARTUP_MAX_WAIT)
echo "[Cold Start] Waiting for Directus to be healthy..."
MAX_WAIT="${DIRECTUS_STARTUP_MAX_WAIT:-600}"
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
