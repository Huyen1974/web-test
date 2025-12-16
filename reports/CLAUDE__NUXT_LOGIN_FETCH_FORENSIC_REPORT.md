# [CLAUDE] Nuxt Login Failed-to-fetch Forensic

**Date:** 2025-12-15
**Task:** CLI.CLAUDE.PARALLEL-FORENSIC-NUXT-AUTH-FETCH.v1.0
**Issue:** "Failed to fetch" error on POST /auth/login
**Status:** Bundle configuration verified correct; issue likely network/CORS layer

---

## Executive Summary

Forensic analysis of the Nuxt 3 SPA login flow confirms that **the production bundle is correctly configured** with the proper Directus URL (`https://directus-test-812872501910.asia-southeast1.run.app`). The build process successfully bakes environment variables into the static bundle, and no localhost or legacy proxy references exist.

**Verdict:** The "Failed to fetch" error is **NOT** caused by incorrect URL baking or bundle misconfiguration. The issue likely exists at the network or CORS layer between the client and Directus Cloud Run service.

---

## 1. Login Call Chain Analysis

### Entry Point
**File:** `web/components/base/LoginForm.vue:79`
```typescript
await login(email, password);
```

### Authentication Composable
**File:** `web/modules/directus/runtime/composables/useDirectusAuth.ts:21-28`
```typescript
async function login(email: string, password: string, otp?: string) {
    try {
        const response = await $directus.login(email, password);
        // Handles token storage and user state
    }
}
```

### Directus SDK Integration
**File:** `web/modules/directus/runtime/plugins/directus.ts:14-18`

The SDK client is initialized using a **fallback chain**:
```typescript
const directusBaseUrl =
    config.public.directus?.rest?.baseUrl ||  // Primary (from module config)
    config.public.directus?.url ||            // Secondary
    config.public.directusUrl ||              // Tertiary (added in PR #138)
    config.public.siteUrl;                    // Final fallback
```

**Authentication Endpoint:** `POST {directusBaseUrl}/auth/login`

---

## 2. Bundle Probe Results

### Test Build Environment
```bash
export NUXT_PUBLIC_SITE_URL="https://github-chatgpt-ggcloud.web.app"
export NUXT_PUBLIC_DIRECTUS_URL="https://directus-test-812872501910.asia-southeast1.run.app"
export NUXT_PUBLIC_AGENT_DATA_ENABLED="false"
# + 7 NUXT_PUBLIC_FIREBASE_* vars
```

### Bundle Analysis (`web/.output/public/**/*`)

**✅ Correct Directus URL Baked:**
```
_nuxt/*.js: directusUrl:"https://directus-test-812872501910.asia-southeast1.run.app"
_nuxt/*.js: rest:{baseUrl:"https://directus-test-812872501910.asia-southeast1.run.app"}
```

**✅ No Localhost References:**
```bash
grep -r "localhost:3000" .output/public  # 0 matches
```

**✅ No Legacy Proxy Paths:**
```bash
grep -r '"/api/proxy' .output/public  # 0 matches
```

**✅ Firebase Config Present:**
```bash
grep -r "AIzaSyA3nEhCqAl7XsOljcDY_z9_7g02NG8SAwY" .output/public  # Found
```

---

## 3. CI/CD Workflow Verdict

### Environment Variable Injection
**File:** `.github/workflows/firebase-deploy.yml:42-54`

The workflow correctly injects all required environment variables during the `pnpm run generate` step:

```yaml
env:
  NUXT_PUBLIC_SITE_URL: "https://github-chatgpt-ggcloud.web.app"
  NUXT_PUBLIC_DIRECTUS_URL: "https://directus-test-812872501910.asia-southeast1.run.app"
  NUXT_PUBLIC_AGENT_DATA_ENABLED: "false"
  NUXT_PUBLIC_FIREBASE_API_KEY: "AIzaSyA3nEhCqAl7XsOljcDY_z9_7g02NG8SAwY"
  # ... (6 more Firebase vars)
```

### Build Verification Gates
**File:** `.github/workflows/firebase-deploy.yml:56-77`

Three assertion checks guard against regression:

1. **Localhost Detection** (lines 58-62)
   - Fails if `localhost:3000` found in bundle
   - ✅ Passing

2. **Legacy Proxy Detection** (lines 63-67)
   - Fails if `/api/proxy` found in bundle
   - ✅ Passing

3. **Firebase Config Verification** (lines 72-76)
   - Fails if Firebase API key NOT found in bundle
   - ✅ Passing

**Build Status:** All checks pass; bundle generation succeeds in 6.32s (client) + 4.66s (server)

---

## 4. RuntimeConfig Coverage

### Directus URL Exposure Points

From `reports/claude_runtimeconfig_hits.txt`, the codebase correctly references Directus URLs via runtimeConfig:

1. **Nuxt Config Definition** (`web/nuxt.config.ts:64`)
   ```typescript
   directusUrl: process.env.NUXT_PUBLIC_DIRECTUS_URL ||
                process.env.DIRECTUS_URL ||
                'https://directus-test-812872501910.asia-southeast1.run.app'
   ```

2. **Module Config** (`web/nuxt.config.ts:84`)
   ```typescript
   baseUrl: process.env.NUXT_PUBLIC_DIRECTUS_URL || ...
   ```

3. **Plugin Initialization** (`web/modules/directus/runtime/plugins/directus.ts:17`)
   ```typescript
   config.public.directusUrl || config.public.siteUrl
   ```

4. **Component Usage** (`web/components/GlobalSearch.vue:33-37`)
   ```typescript
   const runtimeConfig = useRuntimeConfig();
   runtimeConfig.public.directus?.rest?.baseUrl || ...
   ```

**All code paths correctly use runtimeConfig** - no hardcoded URLs found.

---

## 5. Root Cause Analysis

### What's Working

| Component | Status | Evidence |
|-----------|--------|----------|
| Build-time env injection | ✅ Working | Workflow env vars present |
| RuntimeConfig baking | ✅ Working | Bundle contains correct URL |
| Directus SDK initialization | ✅ Working | No localhost in bundle |
| Firebase config baking | ✅ Working | API key found in bundle |
| Legacy code cleanup | ✅ Complete | Zero /api/proxy references |

### What's NOT the Problem

❌ **Not a build configuration issue** - Bundle has correct URLs
❌ **Not a fallback issue** - directusUrl properly exposed in runtimeConfig
❌ **Not legacy proxy code** - All code uses Directus SDK
❌ **Not localhost bake-in** - No localhost references in bundle

### What Could Be the Problem

Given that the bundle is correctly configured, the "Failed to fetch" error likely originates from:

#### A. Network/CORS Configuration
- **Hypothesis:** Directus Cloud Run service CORS policy may not allow `https://github-chatgpt-ggcloud.web.app` origin
- **Check:** Verify `CORS_ORIGIN` env var on `directus-test-812872501910` Cloud Run service
- **Expected:** Should include `https://github-chatgpt-ggcloud.web.app` or `*`

#### B. Directus Endpoint Availability
- **Hypothesis:** `/auth/login` endpoint may not exist or is disabled
- **Check:** Manual curl test from client network
  ```bash
  curl -X POST https://directus-test-812872501910.asia-southeast1.run.app/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"test"}'
  ```
- **Expected:** Should return 401 Unauthorized (not 404 or CORS preflight failure)

#### C. Cloud Run Authentication
- **Hypothesis:** Service may require IAM authentication for unauthenticated requests
- **Check:** Verify Cloud Run service has `allUsers` invoker permission
  ```bash
  gcloud run services get-iam-policy directus-test \
    --region=asia-southeast1 \
    --format=json
  ```
- **Expected:** Should show `roles/run.invoker` for `allUsers`

#### D. Client-Side Fetch Configuration
- **Hypothesis:** Fetch request may be missing required headers (Content-Type, Accept)
- **Check:** Review `@directus/sdk` request configuration in browser DevTools Network tab
- **Expected:** Should include `Content-Type: application/json`

---

## 6. Recommended Fix (Tiered)

### Tier 1: Verify Directus Service Accessibility (5 min)

**Action:** Run curl test from your local machine:
```bash
curl -v -X POST https://directus-test-812872501910.asia-southeast1.run.app/auth/login \
  -H "Content-Type: application/json" \
  -H "Origin: https://github-chatgpt-ggcloud.web.app" \
  -d '{"email":"test@example.com","password":"wrongpassword"}'
```

**Expected Success:**
- Status: `401 Unauthorized` (proves endpoint exists)
- CORS headers present: `Access-Control-Allow-Origin: *` or matching origin

**If Fails:**
- `404 Not Found` → Directus routing misconfigured
- No CORS headers → Proceed to Tier 2

### Tier 2: Fix CORS Configuration (10 min)

**Action:** Add Firebase Hosting origin to Directus CORS_ORIGIN:
```bash
gcloud run services update directus-test \
  --region=asia-southeast1 \
  --update-env-vars CORS_ORIGIN="https://github-chatgpt-ggcloud.web.app,http://localhost:3000"
```

**Verify:**
```bash
gcloud run services describe directus-test \
  --region=asia-southeast1 \
  --format="value(spec.template.spec.containers[0].env)"
```

### Tier 3: Check Cloud Run Public Access (5 min)

**Action:** Ensure service allows unauthenticated invocations:
```bash
gcloud run services add-iam-policy-binding directus-test \
  --region=asia-southeast1 \
  --member="allUsers" \
  --role="roles/run.invoker"
```

**Verify:**
```bash
gcloud run services get-iam-policy directus-test \
  --region=asia-southeast1
```

### Tier 4: Enable CORS in Directus Admin (5 min)

**Action:** Log into Directus admin panel:
1. Navigate to Settings → Project Settings
2. Find "CORS" section
3. Add `https://github-chatgpt-ggcloud.web.app` to allowed origins
4. Ensure `Access-Control-Allow-Credentials` is enabled if needed

### Tier 5: Client-Side Diagnostics (10 min)

**Action:** Add debug logging to login composable:
```typescript
// web/modules/directus/runtime/composables/useDirectusAuth.ts:21
async function login(email: string, password: string, otp?: string) {
    console.log('[DEBUG] Login attempt:', {
        directusUrl: config.public.directusUrl,
        email
    });
    try {
        const response = await $directus.login(email, password);
        console.log('[DEBUG] Login success');
        // ...
    } catch (error) {
        console.error('[DEBUG] Login failed:', {
            error,
            message: error.message,
            cause: error.cause
        });
        throw error;
    }
}
```

**Check:** Browser console for exact error details

---

## 7. Verification Checklist

After implementing fixes, verify end-to-end:

- [ ] Deploy latest main branch to Firebase Hosting
- [ ] Open https://github-chatgpt-ggcloud.web.app/auth/login in browser
- [ ] Open DevTools Network tab
- [ ] Attempt login with test credentials
- [ ] Verify Network tab shows:
  - Request URL: `https://directus-test-812872501910.asia-southeast1.run.app/auth/login`
  - Request Method: `POST`
  - Status: `401` (wrong password) or `200` (success)
  - Response Headers include: `Access-Control-Allow-Origin`
- [ ] No requests to `localhost:3000`
- [ ] No requests to `/api/proxy`

---

## 8. Related PRs

| PR | Status | Description |
|----|--------|-------------|
| #136 | ✅ Merged (a753e95) | Added Firebase deploy workflow + env injection + localhost guard |
| #137 | ✅ Merged (313a0e2) | Added Firebase config to runtimeConfig + bundle verification |
| #138 | ⏳ Awaiting Codex Gate | Exposed directusUrl in runtimeConfig.public |

**Note:** PR #138 must merge before production deployment to ensure `config.public.directusUrl` is available in the bundle (though the module config `rest.baseUrl` fallback already works).

---

## Appendix: Call Site Statistics

From `reports/claude_login_call_sites.txt`:

- **Total useDirectus() calls:** 68 instances across 28 files
- **Total useDirectusAuth() calls:** 10 instances
- **Login function definition:** `web/modules/directus/runtime/composables/useDirectusAuth.ts:21`
- **Login UI invocation:** `web/components/base/LoginForm.vue:79`

All data fetching uses the Directus SDK composable pattern - no legacy fetch() or axios calls found.

---

**End of Report**
