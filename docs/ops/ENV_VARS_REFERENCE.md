# Environment Variables Reference

This document lists all environment variables used by the Business OS services.

## Nuxt SSR (Cloud Run: nuxt-ssr-pfne2mqwja)

### Core Configuration

| Variable | Value | Description |
|----------|-------|-------------|
| `NODE_ENV` | `production` | Node.js environment |
| `NUXT_PUBLIC_SITE_URL` | `https://ai.incomexsaigoncorp.vn` | Public site URL |
| `NUXT_PUBLIC_DIRECTUS_URL` | `https://directus-test-pfne2mqwja-as.a.run.app` | Directus CMS URL |

### AI Gateway Configuration

| Variable | Value | Description |
|----------|-------|-------------|
| `NUXT_PUBLIC_AGENT_DATA_BASE_URL` | `https://agent-data-test-pfne2mqwja-as.a.run.app` | Agent Data service URL |
| `NUXT_PUBLIC_AGENT_DATA_ENABLED` | `true` | Enable AI Gateway features |

### Secrets (Managed via Secret Manager)

| Secret Name | Description |
|-------------|-------------|
| `AI_GATEWAY_TOKEN` | Bearer token for AI Gateway authentication |

---

## Agent Data (Cloud Run: agent-data-test)

| Variable | Description |
|----------|-------------|
| `QDRANT_URL` | Qdrant vector database URL |
| `OPENAI_API_KEY` | OpenAI API key for embeddings |
| `COLLECTION_NAME` | Qdrant collection name |

*These are managed in Google Secret Manager*

---

## Directus (Cloud Run: directus-test-pfne2mqwja)

| Variable | Description |
|----------|-------------|
| `DB_CLIENT` | Database client (postgres) |
| `DB_HOST` | Cloud SQL host |
| `DB_PORT` | Database port |
| `DB_DATABASE` | Database name |
| `DB_USER` | Database user |
| `DB_PASSWORD` | Database password (from Secret Manager) |
| `ADMIN_EMAIL` | Admin user email |
| `ADMIN_PASSWORD` | Admin password (from Secret Manager) |
| `SECRET` | Directus secret key |
| `PUBLIC_URL` | Public Directus URL |

---

## Manual Configuration

### Set Nuxt Env Vars (if CI/CD fails)

```bash
gcloud run services update nuxt-ssr-pfne2mqwja \
  --region=asia-southeast1 \
  --update-env-vars="NUXT_PUBLIC_AGENT_DATA_BASE_URL=https://agent-data-test-pfne2mqwja-as.a.run.app,NUXT_PUBLIC_AGENT_DATA_ENABLED=true" \
  --update-secrets="AI_GATEWAY_TOKEN=AI_GATEWAY_TOKEN:latest"
```

### Verify Env Vars

```bash
gcloud run services describe nuxt-ssr-pfne2mqwja \
  --region=asia-southeast1 \
  --format="yaml(spec.template.spec.containers[0].env)"
```

### Verify Secrets

```bash
gcloud run services describe nuxt-ssr-pfne2mqwja \
  --region=asia-southeast1 \
  --format="yaml(spec.template.spec.containers[0].env)" | grep -i secret
```

---

## CI/CD Integration

Environment variables are automatically set during deploy via `.github/workflows/firebase-deploy.yml`.

Key flags used:
- `--set-env-vars`: Set standard environment variables
- `--update-secrets`: Link Secret Manager secrets to env vars

The deploy job runs on push to `main` branch only.
