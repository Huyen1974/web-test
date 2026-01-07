#!/bin/sh
# =============================================================================
# DIRECTUS COLD START ENTRYPOINT
# =============================================================================
# This script handles container cold starts:
# 1. (Optional) Run Python-based restoration if admin credentials are available
# 2. Start Directus server
#
# Note: Restoration requires DIRECTUS_URL, DIRECTUS_ADMIN_EMAIL, and
# DIRECTUS_ADMIN_PASSWORD environment variables. If not present, restoration
# is skipped and Directus starts normally.
#
# Architecture: Only Python scripts are run here due to Alpine/glibc
# incompatibility. TypeScript scripts run via GitHub Actions post-deploy.
# =============================================================================

echo "[Cold Start] Directus Container Starting..."

# Check if restoration credentials are available
if [ -n "$DIRECTUS_ADMIN_EMAIL" ] && [ -n "$DIRECTUS_ADMIN_PASSWORD" ]; then
    echo "[Cold Start] Admin credentials detected. Running restoration..."

    # Set DIRECTUS_URL to PUBLIC_URL if not explicitly set
    if [ -z "$DIRECTUS_URL" ] && [ -n "$PUBLIC_URL" ]; then
        export DIRECTUS_URL="$PUBLIC_URL"
    fi

    # Verify DIRECTUS_URL is set
    if [ -z "$DIRECTUS_URL" ]; then
        echo "[Cold Start] WARNING: DIRECTUS_URL not set. Skipping restoration."
    else
        echo "[Cold Start] Target: $DIRECTUS_URL"

        # Step 1: Schema Apply (Python)
        # Creates/updates collections and fields
        if [ -f "./scripts/directus/schema_apply.py" ]; then
            echo "[Cold Start] Step 1: Applying schema..."
            python3 ./scripts/directus/schema_apply.py --execute || {
                echo "[Cold Start] WARNING: Schema apply had errors (non-fatal)"
            }
        fi

        # Step 2: Seed Content & Branding (Python)
        # Creates pages, navigation, branding data
        if [ -f "./scripts/directus/seed_minimal.py" ]; then
            echo "[Cold Start] Step 2: Seeding content..."
            python3 ./scripts/directus/seed_minimal.py || {
                echo "[Cold Start] WARNING: Content seed had errors (non-fatal)"
            }
        fi

        # Step 3: Fix Permissions (Python) - CRITICAL
        # MUST run AFTER schema_apply and seed to prevent permission reset
        # Handles: directus_files READ access, Ghost Asset re-hydration
        if [ -f "./scripts/directus/fix_permissions.py" ]; then
            echo "[Cold Start] Step 3: Fixing public permissions..."
            python3 ./scripts/directus/fix_permissions.py || {
                echo "[Cold Start] WARNING: Permission fix had errors (non-fatal)"
            }
        fi

        echo "[Cold Start] Restoration attempt complete."
        echo "[Cold Start] Note: Run ops-restore workflow for full APPENDIX 16 compliance."
    fi
else
    echo "[Cold Start] No admin credentials set. Skipping restoration."
    echo "[Cold Start] To enable: Set DIRECTUS_ADMIN_EMAIL and DIRECTUS_ADMIN_PASSWORD"
fi

echo "[Cold Start] Starting Directus server..."
exec npx directus start
