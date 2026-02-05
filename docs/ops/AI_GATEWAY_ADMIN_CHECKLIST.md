# AI Gateway Admin Checklist

This document provides operational procedures for managing the AI Gateway.

## Pre-Launch Checklist

- [ ] E2E tests passing: `./dot/bin/dot-e2e-test` (10/10)
- [ ] AI Gateway Token exists in Secret Manager
- [ ] Directus AI Agent Token exists in Secret Manager
- [ ] Nuxt env vars configured in CI/CD workflow
- [ ] IAM: Nuxt SA has `run.invoker` on Agent Data
- [ ] IAM: Deployer SA has `secretAccessor` on secrets
- [ ] Static files accessible: `/llms.txt`, `/agent_data_openapi.yaml`

---

## Token Management

### Generate New AI Gateway Token

```bash
# Generate secure token (64 chars)
NEW_TOKEN=$(openssl rand -base64 48)
echo "New token: $NEW_TOKEN"

# Store in Secret Manager
echo -n "$NEW_TOKEN" | gcloud secrets versions add AI_GATEWAY_TOKEN --data-file=-

# Verify
gcloud secrets versions access latest --secret=AI_GATEWAY_TOKEN
```

### Rotate Token

1. Generate new token (see above)
2. Update Secret Manager version
3. Update ChatGPT/Gemini configurations with new token
4. Nuxt will automatically use latest secret version on next request

### Verify Token Works

```bash
TOKEN=$(gcloud secrets versions access latest --secret=AI_GATEWAY_TOKEN)
curl -X POST https://ai.incomexsaigoncorp.vn/api/ai/search \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "test", "limit": 1}'
```

---

## Health Monitoring

### Check Service Health

```bash
# Check Nuxt info endpoint
curl -s https://ai.incomexsaigoncorp.vn/api/ai/info | jq .

# Check static files
curl -s -o /dev/null -w "%{http_code}" https://ai.incomexsaigoncorp.vn/llms.txt
curl -s -o /dev/null -w "%{http_code}" https://ai.incomexsaigoncorp.vn/agent_data_openapi.yaml

# Full E2E test
./dot/bin/dot-e2e-test
```

### View Logs

```bash
# Nuxt logs (last 50 entries)
gcloud logging read 'resource.labels.service_name="nuxt-ssr-pfne2mqwja"' \
  --limit=50 --project=github-chatgpt-ggcloud

# Agent Data logs
gcloud logging read 'resource.labels.service_name="agent-data-test"' \
  --limit=50 --project=github-chatgpt-ggcloud

# Filter for errors only
gcloud logging read 'resource.labels.service_name="nuxt-ssr-pfne2mqwja" AND severity>=ERROR' \
  --limit=20 --project=github-chatgpt-ggcloud
```

### Check Cloud Run Metrics

```bash
# List recent revisions
gcloud run revisions list \
  --service=nuxt-ssr-pfne2mqwja \
  --region=asia-southeast1 \
  --limit=5

# Check active revision
gcloud run services describe nuxt-ssr-pfne2mqwja \
  --region=asia-southeast1 \
  --format="value(status.traffic[0].revisionName)"
```

---

## Emergency Procedures

### If AI Gateway Returns 503 "Disabled"

1. Check env vars are set:
   ```bash
   gcloud run services describe nuxt-ssr-pfne2mqwja \
     --region=asia-southeast1 \
     --format="yaml(spec.template.spec.containers[0].env)"
   ```

2. If missing, re-apply env vars:
   ```bash
   gcloud run services update nuxt-ssr-pfne2mqwja \
     --region=asia-southeast1 \
     --update-env-vars="NUXT_PUBLIC_AGENT_DATA_BASE_URL=https://agent-data-test-pfne2mqwja-as.a.run.app,NUXT_PUBLIC_AGENT_DATA_ENABLED=true" \
     --update-secrets="AI_GATEWAY_TOKEN=AI_GATEWAY_TOKEN:latest"
   ```

### If AI Gateway Returns 403

1. Check IAM binding:
   ```bash
   gcloud run services get-iam-policy agent-data-test \
     --region=asia-southeast1
   ```

2. If missing run.invoker:
   ```bash
   gcloud run services add-iam-policy-binding agent-data-test \
     --region=asia-southeast1 \
     --member="serviceAccount:chatgpt-deployer@github-chatgpt-ggcloud.iam.gserviceaccount.com" \
     --role="roles/run.invoker"
   ```

### If Agent Data Cold Start Timeout

1. Check Agent Data service status:
   ```bash
   curl -s -o /dev/null -w "%{http_code}" \
     https://agent-data-test-pfne2mqwja-as.a.run.app/health
   ```

2. Trigger warm-up:
   ```bash
   # Make a light request to wake the service
   curl -X GET https://agent-data-test-pfne2mqwja-as.a.run.app/health \
     -H "Authorization: Bearer $(gcloud auth print-identity-token)"
   ```

### Rollback to Previous Revision

```bash
# List revisions
gcloud run revisions list \
  --service=nuxt-ssr-pfne2mqwja \
  --region=asia-southeast1 \
  --limit=5

# Rollback to previous
PREVIOUS_REV="nuxt-ssr-pfne2mqwja-00119-xxx"  # replace with actual
gcloud run services update-traffic nuxt-ssr-pfne2mqwja \
  --to-revisions=${PREVIOUS_REV}=100 \
  --region=asia-southeast1
```

---

## Scheduled Maintenance

### Weekly Checks

1. Run E2E tests: `./dot/bin/dot-e2e-test`
2. Check error logs for patterns
3. Verify token hasn't been compromised
4. Check rate limit usage

### Monthly Checks

1. Review Cloud Run costs
2. Review Secret Manager access logs
3. Consider token rotation
4. Update documentation if needed

---

## IAM Reference

### Required Roles

| Service Account | Role | Resource |
|-----------------|------|----------|
| chatgpt-deployer | roles/run.invoker | agent-data-test |
| chatgpt-deployer | roles/secretmanager.secretAccessor | AI_GATEWAY_TOKEN |
| chatgpt-deployer | roles/artifactregistry.writer | web-test repository |

### Verify IAM

```bash
# Check run.invoker on Agent Data
gcloud run services get-iam-policy agent-data-test \
  --region=asia-southeast1 | grep chatgpt-deployer

# Check secret access
gcloud secrets get-iam-policy AI_GATEWAY_TOKEN | grep chatgpt-deployer
```

---

## Useful Commands

```bash
# Generate AI manifest
./dot/bin/dot-ai-manifest

# Run full E2E test
./dot/bin/dot-e2e-test

# Check permissions
./dot/bin/dot-permissions-setup --cloud --dry-run

# View all DOT tools
ls ./dot/bin/
```

---

## Support Contacts

- Infrastructure issues: Check `reports/` directory for recent reports
- Documentation: `docs/` directory
- Tool reference: `dot/README.md`
