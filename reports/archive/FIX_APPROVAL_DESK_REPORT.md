# FIX-APPROVAL-DESK-LEGACY-PROXY - Implementation Report

**Report ID:** FIX_APPROVAL_DESK_LEGACY_PROXY
**CLI Version:** CLI.LAUDE.FIX-APPROVAL-DESK-LEGACY-PROXY.v1.1
**Execution Date:** 2025-12-15
**Status:** ✅ **GREEN - AWAITING CODEX GATE**

---

## Executive Summary

Fixed Approval Desk calling `localhost:3000/api/proxy/items/content_requests` in production by exposing `directusUrl` in `runtimeConfig.public`. No legacy proxy code found in codebase - the issue was a configuration problem, not code using old patterns.

**Root Cause:** The directus plugin falls back to `config.public.siteUrl` when `config.public.directusUrl` is missing. If siteUrl was localhost during build, Directus SDK would target localhost instead of production.

**Solution:** Added `directusUrl` to `runtimeConfig.public` + enhanced CI guard to fail on `/api/proxy`.

**PR Status:** #138 created, **CI GREEN**, **awaiting Codex gate review** (do NOT merge yet per instruction).

---

## A. Zombie Code Location

### Investigation Results

**Search Commands:**
```bash
grep -R "localhost:3000" web/ --exclude-dir=node_modules
grep -R '"/api/proxy' web/ --exclude-dir=node_modules
grep -R "content_requests" web/ --exclude-dir=node_modules
```

### Findings

**1. localhost:3000 references:** 6 total (all acceptable)
- `web/.env`: Local dev config (not committed to production)
- `web/.env.example`: Example config file
- `web/README.md`: Documentation (2 occurrences)
- `web/nuxt.config.ts:84`: Fallback for `nuxtBaseUrl` (OK - only used in dev)
- `web/modules/directus/index.ts:30`: Default for dev mode (OK)

**2. /api/proxy references:** ✅ **ZERO** - No legacy proxy code found!

**3. content_requests files:**
- `web/types/schema.ts`: Type definitions
- `web/types/content-requests.ts`: Type definitions
- `web/composables/useContentRequests.ts`: **Uses Directus SDK properly** ✅

### Conclusion

**NO zombie legacy proxy code exists in the codebase.** The problem was:
1. ✅ Code already uses Directus SDK (`readItems`, `updateItem` from `@directus/sdk`)
2. ❌ But `config.public.directusUrl` was missing from runtimeConfig
3. ❌ Plugin fell back to `config.public.siteUrl` which could be localhost

---

## B. Root Cause Analysis

### File: `web/modules/directus/runtime/plugins/directus.ts` (lines 14-18)

The directus plugin tries to find the base URL in this order:

```typescript
const directusBaseUrl =
    config.public.directus?.rest?.baseUrl ||  // ❌ Not in runtimeConfig.public
    config.public.directus?.url ||           // ❌ Not in runtimeConfig.public
    config.public.directusUrl ||             // ❌ MISSING (the bug!)
    config.public.siteUrl;                   // ✅ Fallback (could be localhost!)
```

**Before Fix:**
- `config.public.directusUrl` doesn't exist → falls back to `siteUrl`
- If `siteUrl` was `http://localhost:3000` during build (before PR #136)
- Directus SDK would target `localhost:3000` instead of production Directus

**The directus config exists but in wrong place:**
```typescript
// nuxt.config.ts - OLD (lines 81-84)
directus: {
  rest: {
    baseUrl: 'https://directus-test-812872501910.asia-southeast1.run.app',
    nuxtBaseUrl: 'http://localhost:3000',  // ← This caused confusion
  }
}
```

This `directus` config is NOT in `runtimeConfig.public`, so the plugin can't access it as `config.public.directus.*`.

---

## C. Solution Implemented

### Changes Made

**1. File:** `web/nuxt.config.ts` (line 64)

```diff
 	runtimeConfig: {
 		agentData: {
 			apiKey: process.env.AGENT_DATA_API_KEY || '',
 		},
 		public: {
 			siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'https://github-chatgpt-ggcloud.web.app',
+			directusUrl: process.env.NUXT_PUBLIC_DIRECTUS_URL || process.env.DIRECTUS_URL || 'https://directus-test-812872501910.asia-southeast1.run.app',
 			agentData: { ... },
 			firebase: { ... },
 		},
 	},
```

**Effect:**
- Now `config.public.directusUrl` exists and is baked into runtime bundle
- Plugin will use correct Directus URL (fallback #3) instead of falling back to siteUrl
- No longer depends on siteUrl being correct

**2. File:** `.github/workflows/firebase-deploy.yml` (lines 56-68)

```diff
-      - name: Verify no localhost in bundle
+      - name: Verify no localhost or legacy proxy in bundle
         run: |
           if grep -r "localhost:3000" .output/public; then
             echo "ERROR: localhost:3000 found in generated bundle!"
             echo "This indicates env vars were not properly baked into the build."
             exit 1
           fi
+          if grep -r '"/api/proxy' .output/public; then
+            echo "ERROR: /api/proxy found in generated bundle!"
+            echo "This indicates legacy proxy code is still present (should use Directus SDK)."
+            exit 1
+          fi
-          echo "✓ No localhost URLs found in bundle"
+          echo "✓ No localhost URLs or legacy proxy paths found in bundle"
```

**Effect:**
- Regression guard now catches both localhost AND legacy proxy patterns
- Will fail build if anyone tries to introduce `/api/proxy` code

---

## D. Verification Evidence

### 1. Grep Results (No Proxy Code)

**Command:**
```bash
grep -R '"/api/proxy' web/ --exclude-dir=node_modules --exclude-dir=.nuxt --exclude-dir=.output
```

**Result:**
```
(no output - 0 matches) ✅
```

**Command:**
```bash
grep -R "localhost:3000" web/ | grep -v ".env" | grep -v "README.md" | grep -v "nuxt.config.ts" | grep -v "modules/directus/index.ts"
```

**Result:**
```
(no output - 0 matches in application code) ✅
```

### 2. Code Review: Directus SDK Usage

**File:** `web/composables/useContentRequests.ts`

✅ **Already using Directus SDK properly:**

```typescript
import { readItems, readItem, updateItem, createItem } from '@directus/sdk';

export async function useContentRequestsList(filters?: ContentRequestFilters) {
    return await useDirectus<ContentRequestView[]>(
        readItems('content_requests', {
            fields: [...],
            filter: directusFilter,
            sort: ['-date_updated'],
            limit: 100,
        }),
    );
}
```

**No fetch/useFetch calls.** All data access uses Directus SDK commands.

### 3. Pull Request

**PR:** #138
**URL:** https://github.com/Huyen1974/web-test/pull/138
**Branch:** fix/approval-desk-remove-proxy
**Commit:** 34b4e1c

**Files Changed:**
1. `web/nuxt.config.ts`: +1 line (added directusUrl)
2. `.github/workflows/firebase-deploy.yml`: +6 lines (enhanced guard)

**Total:** 2 files changed, 7 insertions(+), 2 deletions(-)

### 4. CI Checks (All GREEN ✅)

**Run:** https://github.com/Huyen1974/web-test/actions/runs/20225721477

| Check | Status | Duration |
|-------|--------|----------|
| Pass Gate | ✅ PASS | 25s |
| Quality Gate | ✅ PASS | 23s |
| E2E Smoke Test | ✅ PASS | 1m25s |
| build | ✅ PASS | 1m21s |

**All checks GREEN.**

---

## E. Diff Snippets

### nuxt.config.ts (line 64)

```diff
@@ -61,6 +61,7 @@ export default defineNuxtConfig({
 		},
 		public: {
 			siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'https://github-chatgpt-ggcloud.web.app',
+			directusUrl: process.env.NUXT_PUBLIC_DIRECTUS_URL || process.env.DIRECTUS_URL || 'https://directus-test-812872501910.asia-southeast1.run.app',
 			agentData: {
 				baseUrl: process.env.NUXT_PUBLIC_AGENT_DATA_BASE_URL || '',
 				enabled: process.env.NUXT_PUBLIC_AGENT_DATA_ENABLED === 'true',
```

### firebase-deploy.yml (lines 56-68)

```diff
@@ -53,12 +53,18 @@ jobs:
           NUXT_PUBLIC_FIREBASE_MEASUREMENT_ID: "G-MVYG2LN378"
         run: pnpm run generate

-      - name: Verify no localhost in bundle
+      - name: Verify no localhost or legacy proxy in bundle
         run: |
           if grep -r "localhost:3000" .output/public; then
             echo "ERROR: localhost:3000 found in generated bundle!"
             echo "This indicates env vars were not properly baked into the build."
             exit 1
           fi
-          echo "✓ No localhost URLs found in bundle"
+          if grep -r '"/api/proxy' .output/public; then
+            echo "ERROR: /api/proxy found in generated bundle!"
+            echo "This indicates legacy proxy code is still present (should use Directus SDK)."
+            exit 1
+          fi
+          echo "✓ No localhost URLs or legacy proxy paths found in bundle"
```

---

## F. Runtime Verification Plan

### After Merge + Deploy (Post-Codex Gate)

**Step 1:** Open https://github-chatgpt-ggcloud.web.app/approval-desk

**Step 2:** DevTools → Network tab

**Expected Behavior:**
- ✅ No requests to `localhost:3000`
- ✅ No requests to `/api/proxy`
- ✅ Direct calls to `https://directus-test-812872501910.asia-southeast1.run.app`
- ✅ Requests use pattern: `directus-test-*.run.app/items/content_requests?...`

**Step 3:** Verify page loads

- ✅ No red error box
- ✅ Approval Desk renders iframe or tasks list
- ✅ Console shows no fetch errors

### Manual Verification Evidence (Post-Deploy)

**Status:** ⏳ **PENDING** (PR not merged yet - awaiting Codex gate)

Will update after merge with:
- Screenshot of Network tab showing correct Directus URL
- Confirmation that Approval Desk loads without errors

---

## G. Codex Gate Checklist

**IMPORTANT:** Do NOT merge PR #138 until Codex gate review completes.

**Gate Requirements:**
1. ✅ **Changes minimal and focused** (2 files, 7 lines added)
2. ✅ **No secrets added** (only public Directus URL)
3. ✅ **CI checks GREEN** (all 4 checks passed)
4. ✅ **No legacy proxy code** (grep verified 0 matches)
5. ✅ **Regression guard added** (CI fails on /api/proxy)
6. ⏳ **Codex independent review pending**

**Next Steps:**
1. ⏳ Wait for Codex gate review
2. ⏳ If approved, merge PR #138
3. ⏳ Monitor main deploy (firebase-deploy.yml will trigger)
4. ⏳ Verify production: no localhost, no /api/proxy in Network tab
5. ⏳ Update this report with runtime verification evidence

---

## H. Summary

### Problem Statement
Production Approval Desk attempted to call:
```
http://localhost:3000/api/proxy/items/content_requests
```

### Root Cause
- Directus plugin couldn't find `config.public.directusUrl` (it was missing from runtimeConfig)
- Fell back to `config.public.siteUrl` which could be localhost during build
- Result: Directus SDK targeted wrong base URL

### Solution
- ✅ Added `directusUrl` to `runtimeConfig.public` in nuxt.config.ts
- ✅ Enhanced CI guard to fail on `/api/proxy` patterns
- ✅ Verified NO legacy proxy code exists (already using Directus SDK)

### Verification
| Item | Status | Evidence |
|------|--------|----------|
| Grep: /api/proxy | ✅ 0 matches | Zero legacy proxy code |
| Grep: localhost (app code) | ✅ 0 matches | Only in dev config |
| CI checks | ✅ GREEN | All 4 checks passed |
| Code using SDK | ✅ CONFIRMED | useContentRequests.ts uses @directus/sdk |
| Regression guard | ✅ ADDED | CI fails on /api/proxy or localhost |

### Status
✅ **GREEN** - Fix implemented, CI passing, **awaiting Codex gate review**

**PR:** https://github.com/Huyen1974/web-test/pull/138
**Do NOT merge** until Codex gate approves.

---

**Report Generated:** 2025-12-15
**CLI Version:** CLI.LAUDE.FIX-APPROVAL-DESK-LEGACY-PROXY.v1.1
**Final Status:** ✅ **GREEN - AWAITING CODEX GATE**
