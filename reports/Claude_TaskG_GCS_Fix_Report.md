# TASK G: GCS ASSET SERVING FIX REPORT

**Agent:** Claude Code
**Date:** 2026-01-26

---

## Executive Summary

Successfully configured Cloud Run Directus to serve assets from GCS bucket.
Root cause was missing GCS credentials - Cloud Run had storage location configured but no authentication to access the bucket.

---

## AUDIT RESULTS

| Item | Before | After |
|------|--------|-------|
| STORAGE_LOCATIONS | `gcs` | `gcs` |
| STORAGE_GCS_BUCKET | `directus-assets-test-20251223` | `directus-assets-test-20251223` |
| STORAGE_GCS_KEY_FILENAME | *(missing)* | `/secrets/gcs-key.json` |
| GCS Credentials Secret | *(missing)* | `GCS_CREDENTIALS_test` |
| Cloud Asset HTTP | **500** | **200** |

---

## ROOT CAUSE ANALYSIS

### Initial Diagnosis
Cloud Run logs showed:
```
ERROR: Location "gcs" doesn't exist.
    at StorageManager.location
```

### Investigation
1. Cloud Run had `STORAGE_LOCATIONS=gcs` configured
2. Cloud Run had `STORAGE_GCS_BUCKET=directus-assets-test-20251223` configured
3. GCS bucket existed with files
4. Service account had storage permissions (roles/editor)
5. **Missing:** Credentials file or Workload Identity configuration

### Solution
Directus GCS driver requires explicit credentials even when running on GCP.
Added:
1. Secret `GCS_CREDENTIALS_test` containing service account JSON
2. Volume mount at `/secrets/gcs-key.json`
3. Environment variable `STORAGE_GCS_KEY_FILENAME=/secrets/gcs-key.json`

---

## VERIFICATION

| Test | Result |
|------|--------|
| Local Upload | ✅ File appears in GCS |
| Local Serve | ✅ HTTP 200 |
| Cloud Serve (new file) | ✅ HTTP 200 |
| Cloud Serve (existing file) | ✅ HTTP 200 |
| Health Check | ✅ All PASS |
| Sync Check | ✅ ALL CHECKS PASSED |

### Test Evidence
```
=== FULL VERIFICATION ===

Test 1: New test file (just uploaded)
  cbcfcb81...: HTTP 200

Test 2: Existing file (PNG image)
  b18f3792...: HTTP 200

Test 3: Health check
  Health: HTTP 200
```

---

## CONFIGURATION APPLIED

### Cloud Run Update Command
```bash
gcloud run services update directus-test \
  --region=asia-southeast1 \
  --set-env-vars="...,STORAGE_GCS_KEY_FILENAME=/secrets/gcs-key.json" \
  --set-secrets="...,/secrets/gcs-key.json=GCS_CREDENTIALS_test:latest"
```

### New Revision
- **Revision:** `directus-test-00042-pw4`
- **Traffic:** 100%
- **Status:** Healthy

---

## TECHNICAL DEBT

| ID | Description | Priority | Status |
|----|-------------|----------|--------|
| TD-GCS-01 | Sync STORAGE_* vars to Terraform | P2 | OPEN |
| TD-GCS-02 | Clean up test files | P3 | CLOSED |

See: `/reports/Technical_Debt.md`

---

## CHECKLIST

| # | Check | Method | Result |
|---|-------|--------|--------|
| 1 | Audit complete | Phase 1 | ✅ |
| 2 | Config applied | `gcloud describe` | ✅ |
| 3 | Upload works | Local API | ✅ |
| 4 | **Cloud serves asset** | HTTP request | **✅ HTTP 200** |
| 5 | Cleanup done | API delete | ✅ |
| 6 | Health check pass | `dot-health-check` | ✅ |
| 7 | Sync check pass | `dot-sync-check` | ✅ |
| 8 | Tech debt logged | Technical_Debt.md | ✅ |

---

## STATUS: ✅ GCS FULLY OPERATIONAL

Hybrid Cloud Architecture is now complete:
- **Local Directus:** Write to GCS ✅
- **Cloud Directus:** Serve from GCS ✅
- **Database:** Shared Cloud SQL ✅
- **Schema Sync:** Automatic (same DB) ✅
