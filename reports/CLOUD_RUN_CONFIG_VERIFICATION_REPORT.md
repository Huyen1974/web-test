# CLOUD RUN CONFIG VERIFICATION REPORT
**Date:** 2026-01-23
**Task:** VERIFY ALL CLOUD RUN CONFIG FOR LOCAL DEV
**Status:** COMPLETED

## EXECUTIVE SUMMARY

This report verifies the Directus Cloud Run configuration against the local development environment requirements. The analysis reveals several critical configuration gaps that need to be addressed for proper local development setup.

### KEY FINDINGS
- ✅ **Directus Image**: Custom built image (asia-southeast1-docker.pkg.dev/github-chatgpt-ggcloud/web-test/directus:latest)
- ❌ **Storage Configuration**: MISSING in Cloud Run (but expected by local config)
- ❌ **Database Configuration**: PARTIALLY MISSING in Cloud Run (only DB_PASSWORD found)
- ✅ **GCS Bucket**: EXISTS and ACCESSIBLE (directus-assets-test-20251223)
- ⚠️ **Cloud SQL Integration**: ACTIVE (github-chatgpt-ggcloud:asia-southeast1:mysql-directus-web-test)

---

## 1. DIRECTUS IMAGE VERSION

| Thông tin | Giá trị thực tế | Ghi chú |
|-----------|-----------------|---------|
| Directus Image | `asia-southeast1-docker.pkg.dev/github-chatgpt-ggcloud/web-test/directus:latest` | Custom built image |

**Analysis**: The Cloud Run service uses a custom-built Directus image from Google Cloud Registry, not the standard Directus image. This suggests custom modifications or extensions.

---

## 2. ENVIRONMENT VARIABLES ANALYSIS

### All Environment Variables Found in Cloud Run:
```yaml
- DB_PASSWORD: [SECRET: DIRECTUS_DB_PASSWORD_test]
- DIRECTUS_ADMIN_PASSWORD: [SECRET: DIRECTUS_ADMIN_PASSWORD_test]
- KEY: [SECRET: DIRECTUS_KEY_test]
- SECRET: [SECRET: DIRECTUS_SECRET_test]
- AGENT_DATA_API_KEY: [SECRET: AGENT_DATA_API_KEY]
- CORS_ENABLED: 'true'
- CORS_ORIGIN: 'true'
- CORS_METHODS: GET,POST,PATCH,DELETE,OPTIONS
- CORS_CREDENTIALS: 'true'
- REFRESH_TOKEN_COOKIE_SECURE: 'true'
- REFRESH_TOKEN_COOKIE_SAME_SITE: None
- PUBLIC_URL: https://directus-test-pfne2mqwja-as.a.run.app
- CORS_ORIGINS: 'true'
- ACCESS_CONTROL_ALLOW_ORIGIN: 'true'
```

### MISSING Critical Environment Variables:
| Variable | Expected in Local | Found in Cloud Run | Impact |
|----------|-------------------|-------------------|---------|
| `DB_DATABASE` | ✅ Required | ❌ MISSING | Cannot connect to correct database |
| `DB_USER` | ✅ Required | ❌ MISSING | Cannot authenticate with database |
| `STORAGE_LOCATIONS` | ✅ Required (`gcs`) | ❌ MISSING | No storage configuration |
| `STORAGE_GCS_DRIVER` | ✅ Required (`gcs`) | ❌ MISSING | GCS driver not configured |
| `STORAGE_GCS_BUCKET` | ✅ Required | ❌ MISSING | Cannot upload files to GCS |

---

## 3. DATABASE CONFIGURATION

### Cloud Run Database Setup:
- **Cloud SQL Instance**: `github-chatgpt-ggcloud:asia-southeast1:mysql-directus-web-test`
- **Database Version**: MySQL 8.0
- **Connection Method**: Cloud SQL Auth Proxy (inferred from annotations)

### Expected Local Database Config:
```yaml
DB_CLIENT: mysql
DB_HOST: sql-proxy
DB_PORT: 3306
DB_DATABASE: ${DB_DATABASE}  # directus
DB_USER: ${DB_USER}          # directus
DB_PASSWORD: [SECRET]
```

### Critical Gap:
**Cloud Run relies on Cloud SQL Auth Proxy for database connection, while local development expects explicit DB_* environment variables.** This architectural difference explains why DB_DATABASE and DB_USER are not set in Cloud Run.

---

## 4. STORAGE CONFIGURATION

### Expected Local Storage Config:
```yaml
STORAGE_LOCATIONS: gcs
STORAGE_GCS_DRIVER: gcs
STORAGE_GCS_BUCKET: directus-assets-test-20251223
STORAGE_GCS_KEY_FILENAME: /secrets/google-credentials.json
```

### Cloud Run Storage Config:
**STATUS: NOT CONFIGURED**

### Bucket Verification:
```bash
✅ Bucket exists: gs://directus-assets-test-20251223/
✅ Files present:
   - gs://directus-assets-test-20251223/53ac26cb-987b-42eb-91a5-9f2f87419ad5.txt
   - gs://directus-assets-test-20251223/directus-health-file
```

**Impact**: Directus in Cloud Run cannot upload files to GCS because storage configuration is missing.

---

## 5. CONFIGURATION COMPARISON TABLE

| Thông tin | Cloud Run (Thực tế) | Local Dev (Expected) | Status | Notes |
|-----------|---------------------|----------------------|---------|-------|
| Directus Image | `asia-southeast1-docker.pkg.dev/github-chatgpt-ggcloud/web-test/directus:latest` | `directus/directus:11.14.0` | ⚠️ DIFFERENT | Custom image vs standard |
| DB_DATABASE | ❌ MISSING | `directus` | ❌ CRITICAL | Required for local DB connection |
| DB_USER | ❌ MISSING | `directus` | ❌ CRITICAL | Required for local DB connection |
| DB_PASSWORD | ✅ SECRET | ✅ SECRET | ✅ MATCH | Via Secret Manager |
| STORAGE_LOCATIONS | ❌ MISSING | `gcs` | ❌ CRITICAL | No file uploads possible |
| STORAGE_GCS_DRIVER | ❌ MISSING | `gcs` | ❌ CRITICAL | GCS driver not configured |
| STORAGE_GCS_BUCKET | ❌ MISSING | `directus-assets-test-20251223` | ❌ CRITICAL | Cannot upload to GCS |
| Bucket tồn tại? | ✅ YES | ✅ YES | ✅ MATCH | Bucket accessible |

---

## 6. RECOMMENDATIONS

### Immediate Actions Required:

1. **Add Missing Environment Variables to Cloud Run:**
   ```bash
   gcloud run services update directus-test \
     --region=asia-southeast1 \
     --set-env-vars="DB_DATABASE=directus,DB_USER=directus,STORAGE_LOCATIONS=gcs,STORAGE_GCS_DRIVER=gcs,STORAGE_GCS_BUCKET=directus-assets-test-20251223,STORAGE_GCS_KEY_FILENAME=/secrets/google-credentials.json"
   ```

2. **Update Local Development Documentation:**
   - Document that Cloud Run uses Cloud SQL Auth Proxy vs explicit DB_* vars
   - Clarify the architectural difference
   - Add troubleshooting steps for storage configuration

3. **Verify Storage Functionality:**
   - Test file uploads in Cloud Run environment
   - Confirm GCS integration works after configuration

### Long-term Considerations:

1. **Standardize Configuration:**
   - Consider moving to explicit environment variables for consistency
   - Or document the architectural differences clearly

2. **Image Strategy:**
   - Document why custom image is used vs standard Directus
   - Consider migration path to standard image if customizations are minimal

---

## 7. VERIFICATION COMMANDS USED

```bash
# Directus Image Version
gcloud run services describe directus-test \
  --region=asia-southeast1 \
  --format="value(spec.template.spec.containers[0].image)"

# All Environment Variables
gcloud run services describe directus-test \
  --region=asia-southeast1 \
  --format="yaml(spec.template.spec.containers[0].env)"

# Storage Config Filter
gcloud run services describe directus-test \
  --region=asia-southeast1 \
  --format="yaml(spec.template.spec.containers[0].env)" | grep -i storage

# DB Config Filter
gcloud run services describe directus-test \
  --region=asia-southeast1 \
  --format="yaml(spec.template.spec.containers[0].env)" | grep -i db_

# Bucket Verification
gsutil ls gs://directus-assets-test-20251223/ | head -5

# Cloud SQL Details
gcloud sql instances describe mysql-directus-web-test \
  --project=github-chatgpt-ggcloud | grep -E "(databaseVersion|name|region)"
```

---

## CONCLUSION

The Cloud Run configuration is missing critical environment variables required for proper Directus functionality, particularly around storage (GCS) configuration. While the database connection works through Cloud SQL Auth Proxy, the local development environment expects explicit configuration variables that are not present in Cloud Run.

**Priority**: HIGH - Storage configuration must be added to Cloud Run for file upload functionality to work.

**Next Steps**: Update Cloud Run environment variables and re-test file upload functionality.