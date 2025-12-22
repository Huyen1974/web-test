# Directus Golden State Verification (Runbook)

**Last Verified:** 2025-12-22

## Golden URLs
- **Service URL**: `https://directus-test-pfne2mqwja-as.a.run.app`
- **Admin URL**: `https://directus-test-pfne2mqwja-as.a.run.app/admin`

## Hard Guardrails
> [!IMPORTANT]
> **NEVER use old file IDs** (e.g. `a2bc...`) for validation. They do not exist in the current database.
> Only use the **Smoke Verification Asset** below.

## Smoke Verification
**Asset ID**: `cf9f9030-bc76-4b9a-86f9-8e87c42febe6`

### Manual Check
1. Open Incognito Window.
2. Visit: `https://directus-test-pfne2mqwja-as.a.run.app/assets/cf9f9030-bc76-4b9a-86f9-8e87c42febe6`
3. Result MUST be the image/file (200 OK).

### CLI Check
```bash
# 1. Health Ping
curl -f -s "https://directus-test-pfne2mqwja-as.a.run.app/server/ping"
# Expect: pong

# 2. Asset Access
curl -s -o /dev/null -w "%{http_code}" "https://directus-test-pfne2mqwja-as.a.run.app/assets/cf9f9030-bc76-4b9a-86f9-8e87c42febe6"
# Expect: 200

# 3. Public API
curl -g -s -o /dev/null -w "%{http_code}" "https://directus-test-pfne2mqwja-as.a.run.app/items/pages?filter[permalink][_eq]=/"
# Expect: 200
```

## Emergency Recovery
If usage of these URLs fails:
1. Check Cloud Run Service `directus-test`.
2. Check `ops-smoke` GitHub Action Logs.
3. If 403 Forbidden on Public API -> **Perform UI Jiggle** (Reset Public Role to None then Public).
