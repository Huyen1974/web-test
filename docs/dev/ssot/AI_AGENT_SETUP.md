# AI Agent Setup Guide

This guide explains how to set up external AI models (GPT, Gemini, Claude) to interact with the Business OS Knowledge Base.

## Overview

The AI Gateway provides a secure proxy for external AI models to:
1. **Read** documents from Directus (public, no auth)
2. **Search** the vector knowledge base (requires AI_GATEWAY_TOKEN)
3. **Write** feedback and comments (requires Directus AI_Agent token)

## Architecture

```
┌─────────────┐     ┌───────────────────┐     ┌──────────────────┐
│ External AI │────▶│   AI Gateway      │────▶│  Agent Data      │
│ (GPT/Gemini)│     │ (Nuxt Proxy)      │     │  (Vector Store)  │
└─────────────┘     └───────────────────┘     └──────────────────┘
       │
       │            ┌───────────────────┐     ┌──────────────────┐
       └───────────▶│   Directus        │◀───│  GitHub Sync     │
                    │   (CMS)           │     │  (Webhook)       │
                    └───────────────────┘     └──────────────────┘
```

## Part 1: Create Directus AI_Agent User

### 1.1 Create the Role

1. Go to Directus Admin: https://directus-test-pfne2mqwja-as.a.run.app/admin
2. Navigate to **Settings > Roles & Permissions**
3. Click **Create Role**
4. Configure:
   - **Name**: `AI_Agent`
   - **Description**: `Role for external AI models (GPT, Gemini, Claude)`
   - **Admin Access**: OFF
   - **App Access**: OFF (API only)

### 1.2 Set Permissions

For the AI_Agent role, configure these permissions:

| Collection | Create | Read | Update | Delete |
|------------|--------|------|--------|--------|
| agent_views | ❌ | ✅ (all) | ❌ | ❌ |
| feedbacks | ✅ (limited) | ✅ (non-archived) | ❌ | ❌ |

**Feedbacks Create Fields** (whitelist only):
- feedback_type, priority, title, content, context_snippet
- linked_entity_ref, linked_entity_url, parent_id
- fingerprint_id, author_type, author_name

### 1.3 Create the User

1. Navigate to **User Directory**
2. Click **Create User**
3. Configure:
   - **Email**: `ai-agent@incomexsaigoncorp.vn`
   - **First Name**: `AI`
   - **Last Name**: `Agent`
   - **Role**: Select `AI_Agent`
   - **Status**: Active
4. Save the user

### 1.4 Generate Static Token

1. Open the AI_Agent user profile
2. Scroll to **Token** section
3. Click **Generate Token**
4. Copy the token immediately (it won't be shown again)
5. Store securely in Secret Manager as `DIRECTUS_AI_AGENT_TOKEN`

## Part 2: Configure AI Gateway Token

### 2.1 Generate Token

Create a secure random token:

```bash
# Generate a 32-character random token
openssl rand -base64 32
# Example output: K8xY2mN3pQ7rT9wZ1aB4cD6eF8gH0jKL
```

### 2.2 Store in Secret Manager

```bash
# Create secret in GCP Secret Manager
echo -n "YOUR_GENERATED_TOKEN" | \
  gcloud secrets create AI_GATEWAY_TOKEN \
    --data-file=- \
    --replication-policy=automatic

# Grant access to Cloud Run service account
gcloud secrets add-iam-policy-binding AI_GATEWAY_TOKEN \
  --member="serviceAccount:chatgpt-deployer@github-chatgpt-ggcloud.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### 2.3 Configure Cloud Run

Add environment variable in Cloud Run:

```yaml
env:
  - name: AI_GATEWAY_TOKEN
    valueFrom:
      secretKeyRef:
        name: AI_GATEWAY_TOKEN
        key: latest
```

Or set directly (less secure):

```bash
gcloud run services update nuxt-ssr \
  --update-env-vars AI_GATEWAY_TOKEN=YOUR_TOKEN
```

## Part 3: Import Feedbacks Schema

### 3.1 Manual Import

The feedbacks schema is documented in `scripts/directus-feedbacks-schema.json`.

Follow these steps in Directus Admin:

1. **Create Collection**
   - Name: `feedbacks`
   - Primary Key: UUID (auto-generate)

2. **Add Fields** (in order):
   - `feedback_code` (string, max 20, unique, readonly)
   - `status` (string, dropdown: open/in_review/resolved/archived)
   - `feedback_type` (string, dropdown: comment/review/request/suggestion/question/praise/ai_analysis)
   - `priority` (string, dropdown: low/normal/high/urgent)
   - `title` (string, max 500)
   - `content` (text, rich-text-md, required)
   - `context_snippet` (text, max 2000)
   - `linked_entity_ref` (string, max 255)
   - `linked_entity_url` (string, max 2048)
   - `parent_id` (uuid, M2O relation to feedbacks)
   - `fingerprint_id` (string, max 64)
   - `author_type` (string, dropdown: human/ai_agent/system)
   - `author_name` (string, max 255)
   - `user_created` (uuid, system field)
   - `date_created` (timestamp, system field)
   - `user_updated` (uuid, system field)
   - `date_updated` (timestamp, system field)

3. **Set up Relation**
   - `parent_id` → `feedbacks.id` (self-referential)
   - One-side field: `replies`
   - On delete: SET NULL

## Part 4: Create Directus Flow for feedback_code

### 4.1 Create Flow

1. Go to **Settings > Flows**
2. Click **Create Flow**
3. Configure trigger:
   - **Name**: Auto Generate Feedback Code
   - **Type**: Event Hook
   - **Scope**: items.create
   - **Collections**: feedbacks

### 4.2 Add Operations

**Operation 1: Run Script**
```javascript
module.exports = async function(data) {
  const year = new Date().getFullYear();

  // Get current count
  const result = await this.database('feedbacks')
    .count('id as count')
    .first();

  const seq = String((result?.count || 0) + 1).padStart(5, '0');

  return {
    feedback_code: `FB-${year}-${seq}`
  };
}
```

**Operation 2: Update Data**
- Type: Update Data
- Collection: feedbacks
- Key: `{{$trigger.key}}`
- Payload:
  ```json
  {
    "feedback_code": "{{$last.feedback_code}}"
  }
  ```

### 4.3 Enable Flow

Toggle the flow to **Active** status.

## Part 5: Testing with curl

### 5.1 Test System Info (No Auth)

```bash
curl -s https://ai.incomexsaigoncorp.vn/api/ai/info | jq .
```

Expected response:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "environment": "test"
}
```

### 5.2 Test Search (With Token)

```bash
curl -X POST https://ai.incomexsaigoncorp.vn/api/ai/search \
  -H "Authorization: Bearer YOUR_AI_GATEWAY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "Hien phap he thong la gi?", "top_k": 5}' | jq .
```

### 5.3 Test Read Documents (No Auth)

```bash
curl -s "https://directus-test-pfne2mqwja-as.a.run.app/items/agent_views?limit=3&fields=id,title,path" | jq .
```

### 5.4 Test Create Feedback (With Directus Token)

```bash
curl -X POST https://directus-test-pfne2mqwja-as.a.run.app/items/feedbacks \
  -H "Authorization: Bearer YOUR_DIRECTUS_AI_AGENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Test feedback from AI Agent setup guide",
    "feedback_type": "comment",
    "author_type": "ai_agent",
    "author_name": "Setup Test"
  }' | jq .
```

### 5.5 Test Without Token (Should Fail)

```bash
# Should return 401
curl -s -o /dev/null -w "%{http_code}" \
  -X POST https://ai.incomexsaigoncorp.vn/api/ai/search \
  -H "Content-Type: application/json" \
  -d '{"query": "test"}'
```

## Part 6: GPT Actions Configuration

### 6.1 Import OpenAPI Spec

1. Go to **GPT Builder** in ChatGPT
2. Click **Configure** > **Actions**
3. Click **Import from URL**
4. Enter: `https://ai.incomexsaigoncorp.vn/agent_data_openapi.yaml`

### 6.2 Configure Authentication

1. In Actions settings, set **Authentication**:
   - Type: **API Key**
   - Auth Type: **Bearer**
   - API Key: Your `AI_GATEWAY_TOKEN`

2. For Directus operations (feedbacks):
   - Add second authentication for Directus server
   - Type: **API Key**
   - Auth Type: **Bearer**
   - API Key: Your `DIRECTUS_AI_AGENT_TOKEN`

### 6.3 Test Actions

Use GPT to:
1. "Check the knowledge base status"
2. "Search for documents about approval workflow"
3. "Create a feedback suggesting improvements"

## Part 7: Gemini Extensions Configuration

### 7.1 Create Extension

1. Go to **Google AI Studio**
2. Navigate to **Extensions**
3. Click **Create Extension**
4. Select **OpenAPI**
5. Upload or link: `https://ai.incomexsaigoncorp.vn/agent_data_openapi.yaml`

### 7.2 Configure Auth

1. In Extension settings:
   - Authentication: OAuth 2.0 / API Key
   - Add `AI_GATEWAY_TOKEN` as Bearer token

### 7.3 Enable in Gemini

1. Go to **Gemini Advanced**
2. Enable your custom extension
3. Test with: "@extension search for approval process"

## Troubleshooting

### 401 Unauthorized on /api/ai/search

- Verify `AI_GATEWAY_TOKEN` is set in Cloud Run env
- Check token matches exactly (no extra whitespace)
- Ensure header format: `Authorization: Bearer <token>`

### 403 Forbidden on /items/feedbacks

- Verify AI_Agent user exists and is active
- Check role has create permission on feedbacks
- Verify token is correct (regenerate if needed)

### 429 Rate Limited

- AI Gateway: 100 requests/minute per token
- Wait for rate limit window to reset
- Consider implementing backoff in your AI model

### 502 Backend Error

- Agent Data service may be down
- Check /api/ai/info for status
- View Cloud Run logs for details

## Security Checklist

- [ ] Tokens stored in Secret Manager (not hardcoded)
- [ ] AI_Agent role has minimal permissions
- [ ] Rate limiting enabled (100 req/min)
- [ ] Audit logging captures all requests
- [ ] CORS restricted to necessary origins

## Related Documents

- [OpenAPI Specification](/agent_data_openapi.yaml)
- [llms.txt Index](/llms.txt)
- [Feedbacks Schema](../scripts/directus-feedbacks-schema.json)
- [UNIVERSAL_FEEDBACK_SYSTEM.md](./UNIVERSAL_FEEDBACK_SYSTEM.md)
