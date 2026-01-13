# REALITY FIX LOG: SSR Architecture Remediation

**Date:** 2026-01-08
**Branch:** fix/reality-remediation
**Status:** IN PROGRESS (Pending PR Merge)

---

## Root Causes Found

### 1. SSR Never Existed - `nuxt generate` Instead of `nuxt build`

**Evidence:**
```html
<script type="application/json" data-nuxt-data="nuxt-app" data-ssr="false">
```

**Root Cause:** The `firebase-deploy.yml` workflow was running:
```yaml
run: pnpm run generate   # <-- STATIC GENERATION, NOT SSR!
```

`nuxt generate` produces **pre-rendered static HTML files** (SPA mode), NOT a server-side rendering server.

### 2. Cloud Run Service `nuxt-ssr-pfne2mqwja` Doesn't Exist

The `firebase.json` configured a rewrite to Cloud Run:
```json
"rewrites": [{
  "source": "**",
  "run": {
    "serviceId": "nuxt-ssr-pfne2mqwja",
    "region": "asia-southeast1"
  }
}]
```

But this Cloud Run service was **NEVER CREATED**. Firebase falls back to serving static files from `.output/public/`.

### 3. Ghost Asset Reset on Cold Start

**Evidence:** Asset returns 403 after Scale-to-Zero despite previous manual fix.

**Root Cause:** The `fix_permissions.py` script was supposed to re-hydrate Ghost Assets on cold start, but the hardening fix (PR #191) wasn't deployed yet to the Docker image.

### 4. Directus Signal 2 Crashes (SIGINT)

**Evidence:**
```
2026-01-08T06:45:28.709838250Z  ERROR  Uncaught signal: 2
```

**Root Cause:** These are normal Cloud Run shutdown signals during Scale-to-Zero. NOT a bug - just Cloud Run terminating idle containers.

---

## The Fixes

### Fix 1: Create Nuxt SSR Docker Image

**File:** `web/Dockerfile` (NEW)

```dockerfile
FROM node:20-alpine AS builder
# ... build with NITRO_PRESET=node-server
FROM node:20-alpine AS production
CMD ["node", ".output/server/index.mjs"]
```

### Fix 2: Add Nitro Preset to nuxt.config.ts

**File:** `web/nuxt.config.ts`

```typescript
nitro: {
  preset: process.env.NITRO_PRESET || 'node-server',
  // ...
}
```

### Fix 3: Create Cloud Run Service in Terraform

**File:** `terraform/main.tf`

```hcl
resource "google_cloud_run_v2_service" "nuxt_ssr" {
  name     = "nuxt-ssr-pfne2mqwja"
  location = var.region
  # ...
}
```

### Fix 4: Update Deploy Workflow

**File:** `.github/workflows/firebase-deploy.yml`

1. **New Job:** `build-nuxt-ssr` - Builds Docker image and deploys to Cloud Run
2. **Modified Job:** `deploy-firebase` - Removes HTML files to force Cloud Run proxy

---

## Files Changed

| File | Change |
|------|--------|
| `web/Dockerfile` | NEW - Nuxt SSR Docker image |
| `web/nuxt.config.ts` | Added `nitro.preset: 'node-server'` |
| `terraform/main.tf` | Added `google_cloud_run_v2_service.nuxt_ssr` |
| `terraform/variables.tf` | Added `nuxt_ssr_image` variable |
| `.github/workflows/firebase-deploy.yml` | Complete rewrite for SSR architecture |

---

## Verification Commands

### After Merge, Run These:

```bash
# 1. Check SSR is active (look for data-ssr="true" or full HTML content)
curl -s https://ai.incomexsaigoncorp.vn/ | grep -i "data-ssr"

# 2. Check headers come from Cloud Run (not CDN cache)
curl -I https://ai.incomexsaigoncorp.vn/ | grep -E "(x-served-by|x-cache|server)"

# 3. Verify Ghost Asset
curl -s -o /dev/null -w "%{http_code}" https://directus-test-pfne2mqwja-as.a.run.app/assets/b18f3792-bd31-43e5-8a7d-b25d76f41dd9
```

### Expected Results:

- `data-ssr="true"` or full server-rendered HTML content
- Headers showing Cloud Run origin (NOT CDN cache HIT)
- Asset returns HTTP 200

---

## Current Status

| Item | Status |
|------|--------|
| Root cause identified | DONE |
| Dockerfile created | DONE |
| nuxt.config.ts updated | DONE |
| Terraform updated | DONE |
| Workflow updated | DONE |
| Ghost Asset fixed (manual) | DONE |
| PR created | PENDING |
| Verification on live URL | PENDING (after merge) |
