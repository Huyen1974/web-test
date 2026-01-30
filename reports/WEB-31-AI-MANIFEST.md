# WEB-31 AI Integration Manifest

**Generated:** 2026-01-30
**Status:** READY FOR GPT/GEMINI INTEGRATION

---

## Quick Setup for GPT Actions / Gemini Extensions

### Step 1: Import OpenAPI Spec

```
https://ai.incomexsaigoncorp.vn/agent_data_openapi.yaml
```

### Step 2: Configure Authentication

| Setting | Value |
|---------|-------|
| Type | Bearer Token |
| Token | `[Retrieved from GCP Secret Manager - AI_GATEWAY_TOKEN]` |

### Step 3: Paste System Prompt Instructions

```
You are an AI Agent for Incomex Saigon Corp. Your capabilities:

1. KNOWLEDGE SEARCH: Use /api/ai/search to find relevant documents
   from the company knowledge base. Always search before answering
   domain-specific questions.

2. FEEDBACK SUBMISSION: Use /items/feedbacks to submit:
   - Suggestions for improving content
   - Error reports when information is outdated
   - Action requests when human review is needed

3. DOCUMENT ACCESS: Use /items/agent_views to read published
   documents directly when you have a specific document ID.

Guidelines:
- Cite sources using linked_entity_ref when available
- Submit feedback_type="action_request" for tasks requiring human action
- Use context_snippet to preserve relevant excerpts (max 2000 chars)
- Include source_model in all feedback submissions
```

---

## Token Access Verification

| Secret | Status | Notes |
|--------|--------|-------|
| AI_GATEWAY_TOKEN | ACCESSIBLE | Retrieved from GCP Secret Manager |
| DIRECTUS_AI_AGENT_TOKEN | ACCESSIBLE | Retrieved from GCP Secret Manager |

**Service Account Permissions:** Verified working with current authentication context.

---

## Endpoint Reference

### Public Endpoints (No Auth Required)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/llms.txt` | GET | AI-readable index of knowledge base |
| `/agent_data_openapi.yaml` | GET | OpenAPI 3.1 specification |
| `/api/ai/info` | GET | System status and capabilities |
| `/items/agent_views` | GET | Read published documents |

### Authenticated Endpoints (Bearer Token Required)

| Endpoint | Method | Token | Description |
|----------|--------|-------|-------------|
| `/api/ai/search` | POST | AI_GATEWAY_TOKEN | Semantic vector search |
| `/items/feedbacks` | POST | DIRECTUS_AI_AGENT_TOKEN | Create feedback |
| `/items/feedbacks/{id}` | GET | DIRECTUS_AI_AGENT_TOKEN | Read own feedback |

---

## Test Commands

### Test Search (Requires AI_GATEWAY_TOKEN)

```bash
curl -X POST https://ai.incomexsaigoncorp.vn/api/ai/search \
  -H "Authorization: Bearer $AI_GATEWAY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "Hien phap he thong la gi?", "top_k": 3}'
```

### Test Create Feedback (Requires DIRECTUS_AI_AGENT_TOKEN)

```bash
curl -X POST https://directus-test-pfne2mqwja-as.a.run.app/items/feedbacks \
  -H "Authorization: Bearer $DIRECTUS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "linked_entity_ref": "doc:example",
    "feedback_type": "suggestion",
    "content": "Test feedback",
    "source_model": "gpt-4",
    "status": "pending"
  }'
```

### Test Read Documents (Public)

```bash
curl https://directus-test-pfne2mqwja-as.a.run.app/items/agent_views?limit=5
```

---

## Known Limitations

1. **Agent Data Search**: Currently returns 503 via Nuxt proxy (backend IAM protected)
2. **Feedback Delete**: AI_Agent cannot delete feedbacks (read/create only)
3. **Rate Limits**: Standard Cloud Run limits apply

---

## Retrieve Tokens (Admin Only)

```bash
# AI Gateway Token
gcloud secrets versions access latest \
  --secret="AI_GATEWAY_TOKEN" \
  --project="github-chatgpt-ggcloud"

# Directus AI Agent Token
gcloud secrets versions access latest \
  --secret="DIRECTUS_AI_AGENT_TOKEN" \
  --project="github-chatgpt-ggcloud"
```
