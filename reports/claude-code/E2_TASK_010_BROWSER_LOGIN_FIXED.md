# E2 TASK #010: BROWSER LOGIN FIXED

**Status:** COMPLETED
**Executor:** Claude Code CLI (Opus 4.5)
**Completed:** 2026-01-22

---

## Problem Statement

Browser login was failing at https://ai.incomexsaigoncorp.vn despite the proxy being deployed in E2 Task #009. The frontend was still calling Directus directly instead of through the proxy.

---

## Root Cause Analysis

1. **Frontend URL Misconfiguration:** The Directus plugin was using the same URL for both SSR and browser:
   - Both were calling `https://directus-test-pfne2mqwja-as.a.run.app` directly
   - Browser requests were blocked by CORS

2. **Proxy Body Handling Bug:** The proxy was double-stringifying JSON bodies:
   - `readBody()` returns parsed JSON object
   - `$fetch` automatically stringifies objects
   - Manual `JSON.stringify()` caused double-encoding → "Invalid JSON body" error

---

## Solution

### PR #248: Frontend Client-Side Proxy URL
**Commit:** `a6b32cf`

Modified `web/modules/directus/runtime/plugins/directus.ts`:
- Server-side (SSR): Uses direct Directus URL for performance
- Client-side (Browser): Uses `/api/directus` proxy for CORS bypass

```typescript
// Server uses direct URL (faster, no proxy loop)
const serverDirectusUrl = config.directusInternalUrl || '...directus URL...';

// Client uses proxy path for CORS bypass
const clientDirectusUrl = '/api/directus';

const directusBaseUrl = import.meta.server ? serverDirectusUrl : clientDirectusUrl;
```

### PR #249: Fix Proxy Body Handling
**Commit:** `fe09213`

Modified `web/server/api/directus/[...path].ts`:
```diff
- body: body ? JSON.stringify(body) : undefined,
+ body: body || undefined,
```

---

## PR #247 Decision

**Action:** Closed
**Reason:** Documentation-only PR (E2 #009 completion report) superseded by this combined report

---

## Checkpoint Results

| # | Checkpoint | Status | Evidence |
|---|------------|--------|----------|
| 1 | Frontend uses proxy URL | ✅ PASS | `clientDirectusUrl = '/api/directus'` in plugin |
| 2 | Config correct (SSR vs Browser) | ✅ PASS | `import.meta.server ? serverDirectusUrl : clientDirectusUrl` |
| 3 | Code deployed | ✅ PASS | `fe09213` on origin/main, CI green |
| 4 | Auth request via proxy | ✅ PASS | HTTP 401 for invalid credentials |
| 5 | **Login successful** | ✅ PASS | HTTP 200 with access_token |

---

## Login Test Evidence

```bash
$ curl -sS --data-raw '{"email":"admin@example.com","password":"Directus@2025!"}' \
    -H "Content-Type: application/json" \
    -X POST "https://ai.incomexsaigoncorp.vn/api/directus/auth/login"

{"data":{
  "expires":900000,
  "refresh_token":"Vi61r5_4n2-mTV5KsFRzZidjxfQjROULterdeVbXIZKTuDgPu_-ffSKi3ixseArn",
  "access_token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}}
HTTP Status: 200
```

---

## Files Changed

### E2 Task #009 (Proxy Setup)
- `web/server/api/directus/[...path].ts` - Created proxy route
- `web/nuxt.config.ts` - Added `directusInternalUrl` to runtimeConfig

### E2 Task #010 (Browser Login Fix)
- `web/modules/directus/runtime/plugins/directus.ts` - Use proxy URL on client-side
- `web/server/api/directus/[...path].ts` - Fix body handling

---

## Summary

Browser login is now fully functional:
- All browser Directus API calls route through `/api/directus/*` proxy
- SSR continues to use direct Directus URL for performance
- Proxy correctly forwards JSON bodies to Directus
- No CORS errors in browser console
- Users can successfully login at https://ai.incomexsaigoncorp.vn
