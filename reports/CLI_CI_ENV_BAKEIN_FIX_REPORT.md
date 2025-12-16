# CLI.CLAUDE.FIX-CI-ENV-BAKEIN-STOP-LOCALHOST.v1.0 - Implementation Report

**Report ID:** CLI_CI_ENV_BAKEIN_FIX
**Execution Date:** 2025-12-15
**Status:** ✅ **SUCCESS**

---

## Executive Summary

Successfully created and deployed automated Firebase deployment workflow that:
- Injects correct `NUXT_PUBLIC_*` environment variables during SPA build
- Prevents localhost URLs from being baked into production bundle
- Validates generated bundle contains no localhost references
- Deploys to Firebase Hosting on main branch

**Problem:** Production site (https://github-chatgpt-ggcloud.web.app) was calling `http://localhost:3000/api/proxy/...` because no automated deployment workflow existed, and manual deployments ran `pnpm generate` without environment variables, causing Nuxt to fall back to localhost defaults.

**Solution:** Created `.github/workflows/firebase-deploy.yml` that runs on main branch pushes and workflow_dispatch.

---

## Implementation Details

### A. Active Deploy Workflow Identification

**Finding:** No existing Firebase deployment workflow found.

**Evidence:**
- Searched all workflows in `.github/workflows/`: deploy.yml, nuxt-ci.yml, terraform-apply.yml, terraform-infra.yml
- No workflow contained `pnpm generate` + Firebase deployment steps
- Existing workflows only ran `pnpm run build` (SSR mode), not `pnpm generate` (SPA mode)
- `firebase.json` expects `.output/public` (SPA output), confirming deployment was manual

**Action Taken:** Created new workflow `.github/workflows/firebase-deploy.yml`

### B. Canonical URLs Determination

Extracted from repository sources (no guessing):

| Environment Variable | Value | Source |
|---------------------|-------|--------|
| `NUXT_PUBLIC_SITE_URL` | `https://github-chatgpt-ggcloud.web.app` | web/nuxt.config.ts:63 |
| `NUXT_PUBLIC_DIRECTUS_URL` | `https://directus-test-812872501910.asia-southeast1.run.app` | .github/workflows/deploy.yml:111, terraform reports |
| `NUXT_PUBLIC_AGENT_DATA_ENABLED` | `false` | Security requirement (production safety) |

**Evidence of localhost fallback:**
- web/nuxt.config.ts:75: `nuxtBaseUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000'`
- This line caused localhost bake-in when env var was missing

### C. Workflow File Changes

**File:** `.github/workflows/firebase-deploy.yml` (new file, 68 lines)

**Key Configuration:**
```yaml
- name: Generate static site
  env:
    NUXT_PUBLIC_SITE_URL: "https://github-chatgpt-ggcloud.web.app"
    NUXT_PUBLIC_DIRECTUS_URL: "https://directus-test-812872501910.asia-southeast1.run.app"
    NUXT_PUBLIC_AGENT_DATA_ENABLED: "false"
  run: pnpm run generate
```

**Security Verification:**
- ✅ No secrets added to `NUXT_PUBLIC_*` variables (all public URLs)
- ✅ Agent Data disabled for production safety
- ✅ Uses Workload Identity for GCP authentication (no credentials in code)

### D. Safety Assertion Implementation

**Assertion Step:**
```yaml
- name: Verify no localhost in bundle
  run: |
    if grep -r "localhost:3000" .output/public; then
      echo "ERROR: localhost:3000 found in generated bundle!"
      echo "This indicates env vars were not properly baked into the build."
      exit 1
    fi
    echo "✓ No localhost URLs found in bundle"
```

**Result:** ✅ **PASSED** (see verification below)

### E. Pull Request

**Branch:** fix/ci-env-bakein
**PR:** #136
**PR URL:** https://github.com/Huyen1974/web-test/pull/136
**Commit:** ceaeea0 → a753e95 (squash merge to main)

**PR Checks:**
- ✅ Pass Gate
- ✅ Quality Gate
- ✅ E2E Smoke Test
- ✅ build

**Merge:** Completed at 2025-12-15T07:22:07Z

---

## Validation

### CI Run Evidence

**Firebase Deploy Workflow Run:** https://github.com/Huyen1974/web-test/actions/runs/20223851272
**Status:** ✅ **SUCCESS** (completed in 1m32s)

### Environment Variables Applied

From build logs (run 20223851272, step "Generate static site"):
```
env:
  NUXT_PUBLIC_SITE_URL: https://github-chatgpt-ggcloud.web.app
  NUXT_PUBLIC_DIRECTUS_URL: https://directus-test-812872501910.asia-southeast1.run.app
  NUXT_PUBLIC_AGENT_DATA_ENABLED: false
```
✅ **VERIFIED** - All environment variables correctly injected during build

### Localhost Assertion Result

From build logs (run 20223851272, step "Verify no localhost in bundle"):
```
✓ No localhost URLs found in bundle
```
✅ **PASSED** - No localhost:3000 references in generated SPA bundle

### Firebase Deployment Result

From build logs (run 20223851272, step "Deploy to Firebase Hosting"):
```
✔ Deploy complete!

Project Console: https://console.firebase.google.com/project/github-chatgpt-ggcloud/overview
Hosting URL: https://github-chatgpt-ggcloud.web.app
```
✅ **DEPLOYED** - Production site updated with correct environment variables

---

## Summary

| Gate | Status | Evidence |
|------|--------|----------|
| Workflow created | ✅ PASS | .github/workflows/firebase-deploy.yml |
| Environment variables sourced from repo | ✅ PASS | nuxt.config.ts:63, workflows/deploy.yml:111 |
| No secrets in NUXT_PUBLIC_* | ✅ PASS | Only public URLs used |
| CI checks GREEN | ✅ PASS | All 4 checks passed on PR #136 |
| Localhost assertion implemented | ✅ PASS | Grep check added to workflow |
| Localhost assertion passing | ✅ PASS | "✓ No localhost URLs found in bundle" |
| Main deploy GREEN | ✅ PASS | Run 20223851272 completed successfully |
| Production deployed | ✅ PASS | https://github-chatgpt-ggcloud.web.app |

---

## Next Steps

1. ✅ **Immediate:** Production site now has correct URLs baked in
2. 🔄 **Ongoing:** All future main branch merges will auto-deploy via this workflow
3. 📋 **Monitor:** Verify production site no longer makes localhost API calls

---

**Report Generated:** 2025-12-15
**CLI Version:** CLI.CLAUDE.FIX-CI-ENV-BAKEIN-STOP-LOCALHOST.v1.0
**Execution Result:** ✅ SUCCESS
