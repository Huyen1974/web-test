#!/bin/sh
# =============================================================================
# DIRECTUS COLD START ENTRYPOINT
# =============================================================================
# This script handles container cold starts:
# 1. (Optional) Run restoration if admin credentials are available
# 2. Start Directus server
#
# Note: Restoration requires DIRECTUS_URL, DIRECTUS_ADMIN_EMAIL, and
# DIRECTUS_ADMIN_PASSWORD environment variables. If not present, restoration
# is skipped and Directus starts normally.
# =============================================================================

echo "[Cold Start] Directus Container Starting..."

# Check if restoration credentials are available
if [ -n "$DIRECTUS_ADMIN_EMAIL" ] && [ -n "$DIRECTUS_ADMIN_PASSWORD" ]; then
    echo "[Cold Start] Admin credentials detected. Running restoration..."

    # Set DIRECTUS_URL to PUBLIC_URL if not explicitly set
    if [ -z "$DIRECTUS_URL" ] && [ -n "$PUBLIC_URL" ]; then
        export DIRECTUS_URL="$PUBLIC_URL"
    fi

    # Run restoration (non-blocking, allow failure)
    if [ -x "./scripts/restore_appendix_16.sh" ]; then
        /bin/sh ./scripts/restore_appendix_16.sh || {
            echo "[Cold Start] WARNING: Restoration encountered errors (non-fatal)"
        }
        echo "[Cold Start] Restoration attempt complete."
    else
        echo "[Cold Start] WARNING: restore_appendix_16.sh not found or not executable"
    fi
else
    echo "[Cold Start] No admin credentials set. Skipping restoration."
    echo "[Cold Start] To enable: Set DIRECTUS_ADMIN_EMAIL and DIRECTUS_ADMIN_PASSWORD"
fi

echo "[Cold Start] Starting Directus server..."
exec npx directus start
