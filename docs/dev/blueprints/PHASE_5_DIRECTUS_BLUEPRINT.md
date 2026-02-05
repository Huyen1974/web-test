# Phase 5 Directus Blueprint (Dependency Freeze)

## Locked Core Version
- directus: 11.14.0 (from directus/package-lock.json)

## Node Engine
- node: >=22.0.0 (from directus/package-lock.json)

## Boot Logic (Current Runtime Flow)
Source: scripts/start.sh

1. Bootstrap and migrate database:
   - `npx directus bootstrap --skipAdminInit`
   - `npx directus database migrate:latest`
2. Start Directus in background:
   - `npx directus start &`
3. Health check loop (localhost):
   - `curl -fsS --max-time 2 "http://localhost:${PORT:-8080}/server/health"`
   - Waits up to `${DIRECTUS_STARTUP_MAX_WAIT:-600}` seconds.
4. Permission fix (only if admin credentials are present):
   - `python3 ./scripts/directus/fix_permissions.py`
   - Failure triggers container exit.
5. Foreground wait:
   - `wait $DIRECTUS_PID`

## Environment Variables (Detected in Code)
- DIRECTUS_STARTUP_MAX_WAIT
- PORT
- DIRECTUS_ADMIN_EMAIL
- DIRECTUS_ADMIN_PASSWORD
- DIRECTUS_URL
- NUXT_PUBLIC_DIRECTUS_URL
