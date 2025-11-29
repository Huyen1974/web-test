# W202 – Directus Runtime Diagnose (read-only, gcloud)

## 0. Metadata

- **Date/time**: 2025-11-26T07:40:00Z (local machine time)
- **Operator**: Cursor via CLI.CURSOR.W202
- **Project ID**: github-chatgpt-ggcloud
- **SQL instance name**: mysql-directus-web-test
- **Cloud Run service name**: directus-test
- **Region**: asia-southeast1
- **Health URL used**: N/A (service not ready, no public URL available)

## 1. Summary (for humans & supervising agents)

- **Cloud SQL mysql-directus-web-test**: RUNNABLE, tier db-g1-small
- **Database "directus"**: PRESENT (charset: utf8mb4, collation: utf8mb4_0900_ai_ci)
- **Cloud Run directus-test**: NOT READY (SecretsAccessCheckFailed - missing DIRECTUS_DB_PASSWORD_test, DIRECTUS_KEY_test, DIRECTUS_SECRET_test)
- **Logs show last error**: No detailed logs available (empty textPayload/jsonPayload)
- **HTTP health check /server/health**: SKIPPED (service not ready, no URL available)

## 2. Checks Performed

- `gcloud config set project github-chatgpt-ggcloud`
- `gcloud sql instances describe mysql-directus-web-test --format="table(name,region,settings.tier,state)"`
- `gcloud sql databases list --instance=mysql-directus-web-test --format="table(name,charset,collation)"`
- `gcloud run services describe directus-test --region=asia-southeast1 --format="yaml(metadata.name,status.conditions,status.latestReadyRevisionName,status.url)"`
- `gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="directus-test"' --limit=20 --order=DESC --format="value(timestamp, textPayload, jsonPayload.message)"`
- `gcloud run services describe directus-test --region=asia-southeast1 --format="value(status.url)"` (returned empty)

## 3. Detailed Results

### 3.1 Cloud SQL instance state

```
NAME                     REGION           TIER         STATE
mysql-directus-web-test  asia-southeast1  db-g1-small  RUNNABLE
```

- Instance is RUNNABLE and healthy
- Region: asia-southeast1
- Tier: db-g1-small (cost-optimized for production)

### 3.2 Databases in mysql-directus-web-test

```
NAME                CHARSET  COLLATION
mysql               utf8mb3  utf8mb3_general_ci
information_schema  utf8mb3  utf8mb3_general_ci
performance_schema  utf8mb4  utf8mb4_0900_ai_ci
sys                 utf8mb4  utf8mb4_0900_ai_ci
directus            utf8mb4  utf8mb4_0900_ai_ci
```

- Database "directus" is PRESENT and properly configured
- Using utf8mb4 charset and utf8mb4_0900_ai_ci collation (compatible with Directus requirements)

### 3.3 Cloud Run service directus-test

```yaml
metadata:
  name: directus-test
status:
  conditions:
  - lastTransitionTime: '2025-11-26T07:39:44.879105Z'
    message: |-
      Revision 'directus-test-00001-2qh' is not ready and cannot serve traffic. spec.template.spec.containers[0].env[9].value_from.secret_key_ref.name: Secret projects/812872501910/secrets/DIRECTUS_DB_PASSWORD_test/versions/latest was not found
      spec.template.spec.containers[0].env[10].value_from.secret_key_ref.name: Secret projects/812872501910/secrets/DIRECTUS_KEY_test/versions/latest was not found
      spec.template.spec.containers[0].env[11].value_from.secret_key_ref.name: Secret projects/812872501910/secrets/DIRECTUS_SECRET_test/versions/latest was not found
    reason: SecretsAccessCheckFailed
    status: 'False'
    type: Ready
  - lastTransitionTime: '2025-11-26T07:39:44.844162Z'
    message: |-
      spec.template.spec.containers[0].env[9].value_from.secret_key_ref.name: Secret projects/812872501910/secrets/DIRECTUS_DB_PASSWORD_test/versions/latest was not found
      spec.template.spec.containers[0].env[10].value_from.secret_key_ref.name: Secret projects/812872501910/secrets/DIRECTUS_KEY_test/versions/latest was not found
      spec.template.spec.containers[0].env[11].value_from.secret_key_ref.name: Secret projects/812872501910/secrets/DIRECTUS_SECRET_test/versions/latest was not found
    reason: SecretsAccessCheckFailed
    status: 'False'
    type: ConfigurationsReady
  - lastTransitionTime: '2025-11-26T07:39:44.879105Z'
    message: |-
      Revision 'directus-test-00001-2qh' is not ready and cannot serve traffic. spec.template.spec.containers[0].env[9].value_from.secret_key_ref.name: Secret projects/812872501910/secrets/DIRECTUS_DB_PASSWORD_test/versions/latest was not found
      spec.template.spec.containers[0].env[10].value_from.secret_key_ref.name: Secret projects/812872501910/secrets/DIRECTUS_KEY_test/versions/latest was not found
      spec.template.spec.containers[0].env[11].value_from.secret_key_ref.name: Secret projects/812872501910/secrets/DIRECTUS_SECRET_test/versions/latest was not found
    reason: SecretsAccessCheckFailed
    status: 'False'
    type: RoutesReady
```

- Service condition Ready=False (SecretsAccessCheckFailed)
- Latest revision: directus-test-00001-2qh
- No public URL available due to service not being ready
- All three required secrets are missing: DIRECTUS_DB_PASSWORD_test, DIRECTUS_KEY_test, DIRECTUS_SECRET_test

### 3.4 Recent logs (directus-test)

```
2025-11-26T07:39:44.908608Z
2025-11-26T07:39:44.817243Z
2025-11-26T07:39:42.125052Z
2025-11-26T07:33:05.128146Z
2025-11-26T07:33:04.734120Z
2025-11-26T07:33:04.281574Z
2025-11-26T07:32:42.225876Z
2025-11-26T07:32:42.142547Z
2025-11-26T07:32:38.724794Z
2025-11-26T07:32:27.317499Z
2025-11-26T07:32:26.924784Z
2025-11-26T07:32:26.388828Z
2025-11-26T07:29:24.901961Z
2025-11-26T07:29:24.822854Z
2025-11-26T07:29:19.783418Z
2025-11-26T07:28:35.865726Z
2025-11-26T07:28:35.481646Z
2025-11-26T07:28:34.304472Z
```

- No detailed application logs available
- Only timestamp entries without textPayload or jsonPayload.message
- This suggests the service is failing at the infrastructure level (secrets access) before application code can run

### 3.5 HTTP health check

**SKIPPED** - Service is not ready and has no public URL available.

Reason: Cloud Run service directus-test is failing the SecretsAccessCheck, so no traffic can be served. The service has no status.url value.

## 4. Preliminary Conclusions

- **Cloud SQL instance**: GREEN - Instance is RUNNABLE with proper configuration
- **Database "directus"**: GREEN - Database exists with correct charset/collation settings
- **Directus Cloud Run runtime**: RED - Service completely failed due to missing secrets
- **Overall Directus stack readiness for Nuxt (Task 0028)**: RED - Cannot proceed until secrets are restored and service is healthy

## 5. Recommendations / Questions for next CLI

1. **Immediate priority**: Restore the missing Google Secret Manager secrets:
   - DIRECTUS_DB_PASSWORD_test
   - DIRECTUS_KEY_test  
   - DIRECTUS_SECRET_test

2. **Question for supervising agents**: Should the secrets be recreated via Terraform apply, or injected externally as per HP-05 compliance?

3. **Next CLI should**: Once secrets are available, redeploy the Cloud Run service and perform health checks

4. **Alternative approach**: If secrets cannot be restored, consider recreating the entire infrastructure stack with new secret values

5. **Monitoring**: After fix, implement proper logging to capture application-level errors beyond infrastructure failures
