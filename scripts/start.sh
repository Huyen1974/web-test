#!/bin/sh
echo "[Cold Start] Running Auto-Restoration..."
/bin/sh ./scripts/restore_appendix_16.sh
echo "[Cold Start] Restoration complete. Starting Directus..."
npx directus start
