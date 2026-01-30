# AI Gateway Instructions for ChatGPT/Gemini

This guide explains how to set up and use the Business OS AI Gateway with ChatGPT Custom GPTs or Gemini Extensions.

## Quick Setup

### For ChatGPT (Custom GPT)

1. Go to: https://chat.openai.com/gpts/editor
2. Create new GPT or edit existing one
3. In "Configure" tab:
   - **Name:** "Agency OS Knowledge Assistant"
   - **Description:** "Search and interact with company knowledge base"
4. In "Actions" section:
   - Click "Create new action"
   - Import OpenAPI: `https://ai.incomexsaigoncorp.vn/agent_data_openapi.yaml`
   - Authentication: **API Key** (Bearer Token)
   - Header: `Authorization`
   - Token: Get from admin (AI_GATEWAY_TOKEN)

### For Gemini Extensions

1. Go to Gemini Extensions settings
2. Add custom extension
3. OpenAPI URL: `https://ai.incomexsaigoncorp.vn/agent_data_openapi.yaml`
4. Configure Bearer Token authentication

---

## Available Operations

### 1. Vector Search

**Endpoint:** `POST /api/ai/search`

Search the knowledge base using semantic similarity.

**Example prompt to AI:**
> "Search for documents about inventory management"

**Request:**
```json
{
  "query": "inventory management best practices",
  "limit": 5
}
```

**Response:**
```json
{
  "response": "Based on the knowledge base...",
  "context": [...],
  "usage": {
    "latency_ms": 150,
    "qdrant_hits": 5
  }
}
```

### 2. Read Documents

**Endpoint:** `GET /items/agent_views`

Read published documents from the knowledge base (public, no auth required).

**Example prompt to AI:**
> "Show me the list of HR policy documents"

### 3. Submit Feedback

**Endpoint:** `POST /items/feedbacks`

Submit feedback, corrections, or action requests.

**Example prompt to AI:**
> "I found an error in the inventory document. Please flag it for review."

**Request:**
```json
{
  "linked_entity_ref": "agent_views/123",
  "feedback_type": "correction",
  "content": "The inventory count mentioned is outdated",
  "source_model": "gpt-4",
  "status": "pending"
}
```

**Feedback Types:**
- `suggestion` - General improvement suggestion
- `correction` - Error or inaccuracy report
- `action_request` - Request human action/review
- `positive` - Positive feedback

---

## System Prompt Instructions

Add this to your GPT's system prompt for best results:

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
- Primary language: Vietnamese (documents may be in Vietnamese)
```

---

## Test Prompts

### Basic Search Test
> "Search the knowledge base for documents about customer service procedures"

Expected: Returns relevant documents with context

### Context Retrieval Test
> "What are the main topics covered in the knowledge base about HR policies?"

Expected: Lists HR-related documents and summaries

### Feedback Test
> "I'd like to request an update to the inventory documentation - the reorder levels seem outdated"

Expected: Creates feedback with action_request type

---

## Troubleshooting

### 401 Unauthorized

**Cause:** Missing or invalid Bearer Token

**Fix:**
1. Check if Bearer Token is correctly configured in GPT Actions
2. Verify token hasn't expired
3. Contact admin for new token if needed

### 503 Service Unavailable

**Cause:** Agent Data service cold starting

**Fix:**
1. Wait 30 seconds and retry
2. System has automatic retry with backoff
3. If persistent, check service health

### No Results Found

**Cause:** Query doesn't match indexed content

**Fix:**
1. Try different search terms
2. Use semantic/conceptual terms rather than exact keywords
3. Try broader queries first, then narrow down

### Rate Limited (429)

**Cause:** Too many requests

**Fix:**
1. Wait and retry
2. Check X-RateLimit-Remaining header
3. Limit: 100 requests per minute per token

---

## API Endpoints Reference

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/ai/search` | POST | Bearer | Vector search |
| `/api/ai/info` | GET | None | System status |
| `/items/agent_views` | GET | None | Read documents |
| `/items/feedbacks` | POST | Bearer | Submit feedback |
| `/llms.txt` | GET | None | AI-readable index |
| `/agent_data_openapi.yaml` | GET | None | OpenAPI spec |

---

## Get Tokens (Admin Only)

```bash
# Get AI Gateway Token
gcloud secrets versions access latest \
  --secret="AI_GATEWAY_TOKEN" \
  --project="github-chatgpt-ggcloud"

# Get Directus AI Agent Token
gcloud secrets versions access latest \
  --secret="DIRECTUS_AI_AGENT_TOKEN" \
  --project="github-chatgpt-ggcloud"
```

---

## Support

For issues with the AI Gateway:
1. Check service status: https://ai.incomexsaigoncorp.vn/api/ai/info
2. Run E2E tests: `./dot/bin/dot-e2e-test`
3. Check reports in `reports/` directory
