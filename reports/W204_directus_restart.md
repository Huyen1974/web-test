# W204 – Directus Force Restart (Cloud Run, web-test)

## 1. Metadata

- CLI ID: CLI.CURSOR.W204
- Datetime (local): 2025-11-27T08:05:00+07:00
- Project ID: github-chatgpt-ggcloud
- Region: asia-southeast1
- Cloud Run service name: directus-test

## 2. Summary (for supervising agents)

- Was the update command successful? NO - Deployment failed with HealthCheckContainerError
- Is the service Ready (True/False)? False
- Final `status.url` (if any): empty (service not ready)
- HTTP code for `/server/health` (if checked): N/A (no URL available)

## 3. Detailed actions

### Commands executed:
1. `gcloud config set project github-chatgpt-ggcloud` - Success
2. `gcloud run services update directus-test --region=asia-southeast1 --platform=managed --update-env-vars=RESTART_TRIGGER=$(date +%s)` - Failed with deployment error
3. `gcloud run services describe directus-test --region=asia-southeast1 --format="yaml(metadata.name,status.conditions,status.latestReadyRevisionName,status.url)"` - Success

### Polling attempts:
- No polling loop performed (deployment failed immediately)
- Single status check after failure

### Final condition states:
- **Ready**: False (HealthCheckContainerError)
- **ConfigurationsReady**: True (secrets now accessible - no more SecretsAccessCheckFailed)
- **RoutesReady**: False (HealthCheckContainerError)
- Latest revision: directus-test-00002-bjh

## 4. Result classification

**RED** - Cloud Run deployment failed due to container startup probe checks failure. Root cause identified: database access denied for user 'directus'.

## 5. Suggested next steps

Critical issue discovered: Database connection failure despite secrets being accessible. The logs show "Access denied for user 'directus'@'%' to database 'directus'" (errno 1044). This indicates a password mismatch between:

1. The password stored in Secret Manager (DIRECTUS_DB_PASSWORD_test)
2. The actual password of the 'directus' user in Cloud SQL

Recommended immediate actions:
1. W205 – Sync SQL user password with Secret Manager value, or regenerate both in coordination
2. Verify that W203 script actually updated the SQL user password correctly
3. Consider recreating the SQL user entirely if password sync is unreliable


