# CI RED Analysis & Fix Report

**Date:** 2026-01-07
**Analyst:** Claude Opus (SRE/Architect)
**Trigger:** PR #176 merge caused CI failure on main branch
**Status:** FIXED

---

## 1. Root Cause of Red CI

### Primary Failure: Missing Authentication Secret

**Error Message:**
```
##[error]Missing GCP_SA_KEY secret
```

**Location:** `.github/workflows/deploy.yml` line 148-151

**Analysis:**
Codex introduced a new `directus_deploy` job that uses `credentials_json: ${{ secrets.GCP_SA_KEY }}` for Google Cloud authentication. However:

1. **The `GCP_SA_KEY` secret does not exist** in the repository
2. **The repository uses Workload Identity Federation (WIF)**, not service account keys
3. All other workflows (Terraform, Firebase) use WIF successfully

### Secondary Issue: Architectural Conflict

The `directus_deploy` job performs **imperative deployment** (`gcloud run deploy`) while Terraform manages Cloud Run **declaratively**. This creates:
- Potential race conditions
- Configuration drift between Terraform state and actual infrastructure
- Duplicate deployment paths

---

## 2. Architectural Fix

### Fix Applied to `deploy.yml`:

Changed authentication from:
```yaml
# BEFORE (Broken)
- name: Authenticate to Google Cloud
  uses: google-github-actions/auth@v2
  with:
    project_id: ${{ env.PROJECT_ID }}
    credentials_json: ${{ secrets.GCP_SA_KEY }}  # DOES NOT EXIST
```

To:
```yaml
# AFTER (Fixed)
- name: Authenticate to Google Cloud (Workload Identity)
  uses: google-github-actions/auth@v2
  with:
    project_id: ${{ env.PROJECT_ID }}
    workload_identity_provider: projects/812872501910/locations/global/workloadIdentityPools/agent-data-pool/providers/github-provider
    service_account: chatgpt-deployer@github-chatgpt-ggcloud.iam.gserviceaccount.com
    token_format: access_token
```

### Fix Applied to `start.sh`:

Made the entrypoint resilient:
- Added credential detection before attempting restoration
- Made restoration failure non-fatal (Directus starts regardless)
- Added proper logging for debugging
- Used `exec` for proper signal handling

---

## 3. Entrypoint Verification

### Dockerfile Status: VALID

```dockerfile
FROM directus/directus:11.2.2
# ... installs bash, python3, curl ...
COPY scripts ./scripts
RUN chmod +x /app/scripts/start.sh /app/scripts/restore_appendix_16.sh
CMD ["/bin/sh", "./scripts/start.sh"]
```

### start.sh Status: VALID

```sh
#!/bin/sh
# Checks for DIRECTUS_ADMIN_EMAIL and DIRECTUS_ADMIN_PASSWORD
# If present: runs restoration (non-blocking)
# Always: starts Directus via exec
exec npx directus start
```

### Cold Start Architecture:

| Component | Status | Notes |
|-----------|--------|-------|
| Dockerfile syntax | VALID | Proper multi-distro package install |
| start.sh syntax | VALID | POSIX-compliant `/bin/sh` |
| chmod +x | VALID | Both scripts made executable |
| Restoration logic | VALID | Graceful degradation if creds missing |

---

## 4. Zombie Workflow Check

| Workflow File | Status | Purpose |
|---------------|--------|---------|
| `deploy.yml` | ACTIVE | Main CI + Directus deployment |
| `terraform-apply.yml` | ACTIVE | Reusable Terraform module |
| `terraform-infra.yml` | ACTIVE | Infrastructure deployment |
| `firebase-deploy.yml` | ACTIVE | Firebase hosting |
| `nuxt-ci.yml` | ACTIVE | Nuxt build checks |
| `ops-smoke.yml` | ACTIVE | Smoke tests |
| `ops-self-heal.yml` | DELETED | Removed by PR #176 (was zombie) |

**Verdict:** No zombie workflows remain.

---

## 5. CI Status After Fix

| Workflow | Expected Status |
|----------|-----------------|
| Nuxt 3 CI | GREEN |
| Firebase Deploy | GREEN |
| Terraform Deploy | GREEN (after auth fix) |

---

## 6. Recommendations

### Immediate (This PR):
- [x] Fix WIF authentication in deploy.yml
- [x] Make start.sh resilient to missing credentials

### Follow-up (Future PRs):
1. **Add admin credentials to Cloud Run**: Update Terraform to inject `DIRECTUS_ADMIN_EMAIL` and `DIRECTUS_ADMIN_PASSWORD` from Secret Manager
2. **Resolve Terraform vs gcloud conflict**: Either:
   - Remove `gcloud run deploy` from deploy.yml and let Terraform manage Cloud Run
   - OR update Terraform to use the custom image from Artifact Registry

---

## 7. Files Modified

| File | Change |
|------|--------|
| `.github/workflows/deploy.yml` | Fixed auth from GCP_SA_KEY to WIF |
| `scripts/start.sh` | Made restoration resilient |

---

**Report Generated:** 2026-01-07
**Branch:** `fix/ci-deployment-stabilization`
