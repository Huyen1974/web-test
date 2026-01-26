# Technical Debt Registry

## CLOSED

### TD-GCS-01: Sync STORAGE_* env vars to Terraform

**Date Opened:** 2026-01-26
**Date Closed:** 2026-01-26
**Status:** CLOSED
**Priority:** P2 (Medium)

#### Issue
STORAGE_* environment variables were added to Cloud Run `directus-test` service via `gcloud` CLI hotfix.
This configuration was NOT in Terraform and could be overwritten on next `terraform apply`.

#### Resolution
- Added GCS storage env vars to `terraform/main.tf`
- Added GCS credentials secret data source to `terraform/secrets.tf`
- Added IAM binding for secret access
- Added volume mount for credentials
- Also added missing AGENT_DATA_URL and RESTART_TRIGGER env vars

#### Files Changed
- `terraform/main.tf` - STORAGE_* env vars, gcs-credentials volume/mount, AGENT_DATA_URL, RESTART_TRIGGER
- `terraform/secrets.tf` - GCS_CREDENTIALS_test data source and IAM binding

#### Verification
```bash
terraform fmt    # ✅ Success
terraform validate  # ✅ Success
terraform plan   # ✅ 1 to add, 6 to change, 0 to destroy
```

---

### TD-GCS-02: Remove Test Files from GCS Bucket

**Date Opened:** 2026-01-26
**Date Closed:** 2026-01-26
**Status:** CLOSED
**Priority:** P3 (Low)

#### Issue
Test files uploaded during verification remain in GCS bucket.

#### Action Taken
- Test file `cbcfcb81-3b7e-405e-b537-39d67c9543a2.txt` deleted via API

---

## OPEN

(No open items)

---

## Historical Context

### Before Fix (2026-01-26)
- Cloud Run had STORAGE_LOCATIONS=gcs but NO credentials
- Error: `Location "gcs" doesn't exist.`
- Asset serving returned HTTP 500

### After Fix (2026-01-26)
- Added GCS_CREDENTIALS_test secret
- Mounted at /secrets/gcs-key.json
- Set STORAGE_GCS_KEY_FILENAME=/secrets/gcs-key.json
- Asset serving returns HTTP 200

### Terraform Sync (2026-01-26)
- All GCS configuration synced to Terraform
- IaC now matches Cloud Run reality
- No regression risk on future terraform apply

---

_Last Updated: 2026-01-26_
