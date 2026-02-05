# AI Action Setup Guide - Agent Data Knowledge Manager

This guide explains how to configure AI Actions (Gemini Gems, ChatGPT GPTs, Claude MCP) to connect with the Agent Data Knowledge Manager API.

## Quick Links

| Resource | URL |
|----------|-----|
| OpenAPI Spec | `https://raw.githubusercontent.com/Huyen1974/agent-data-test/main/specs/agent-data-openapi.yaml` |
| API Base URL | `https://agent-data-test-pfne2mqwja-as.a.run.app` |
| Web Console | `https://ai.incomexsaigoncorp.vn/admin/super-session` |

---

## Understanding the Two Systems (S29)

The platform has **two separate systems** with **different authentication**:

| System | Purpose | API Key Secret | Header |
|--------|---------|----------------|--------|
| **Directus** | AI Discussion Management (Super Session) | `directus-admin-token` | `Authorization: Bearer <token>` |
| **Agent Data (Langroid)** | Knowledge Search & Document Management | `agent-data-api-key` | `X-API-Key: <key>` |

### When to Use Which Key

- **Viewing/Managing AI Discussions** (Super Session, DOT Console) → Use `directus-admin-token`
- **Searching Knowledge Base** (`/chat` endpoint) → Use `agent-data-api-key`
- **Managing Documents** (`/documents/*` endpoints) → Use `agent-data-api-key`

---

## Step 1: Get the OpenAPI Spec (S28)

The OpenAPI specification is publicly accessible at:

```
https://raw.githubusercontent.com/Huyen1974/agent-data-test/main/specs/agent-data-openapi.yaml
```

You can import this URL directly into AI Action configuration interfaces (recommended) or copy-paste the content.

---

## Step 2: Get API Keys

### Agent Data API Key (for Knowledge Search)

```bash
gcloud secrets versions access latest \
  --secret=agent-data-api-key \
  --project=mpc-rag-langroid
```

### Directus Admin Token (for Discussion Management)

```bash
gcloud secrets versions access latest \
  --secret=directus-admin-token \
  --project=github-chatgpt-ggcloud
```

---

## Step 3: Configure by AI Platform

### Gemini (Google AI Studio Gems)

1. Go to [Google AI Studio](https://aistudio.google.com) → **Gems**
2. Create new Gem or edit existing
3. Click **Advanced** → **Actions** → **Add Action**
4. Choose **Import from URL**
5. Paste: `https://raw.githubusercontent.com/Huyen1974/agent-data-test/main/specs/agent-data-openapi.yaml`
6. Configure Authentication:
   - Type: **API Key**
   - Header Name: `X-API-Key`
   - Value: `<your agent-data-api-key>`
7. Save and test with: "Search for approval workflow documentation"

### ChatGPT (OpenAI GPTs)

1. Go to [ChatGPT](https://chat.openai.com) → **My GPTs** → **Create/Edit**
2. Click **Configure** → **Actions** → **Create new action**
3. Choose **Import from URL**
4. Paste: `https://raw.githubusercontent.com/Huyen1974/agent-data-test/main/specs/agent-data-openapi.yaml`
5. Configure Authentication:
   - Type: **API Key**
   - Auth Type: **Custom**
   - Custom Header Name: `X-API-Key`
6. Save and test

### Claude (MCP - Model Context Protocol)

Claude MCP configuration requires desktop app setup:

1. Install [Claude Desktop](https://claude.ai/download)
2. Create/edit `~/.claude/mcp.json`:

```json
{
  "mcpServers": {
    "agent-data": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-server-http"],
      "env": {
        "MCP_HTTP_URL": "https://agent-data-test-pfne2mqwja-as.a.run.app",
        "MCP_HTTP_HEADERS": "X-API-Key: <your agent-data-api-key>"
      }
    }
  }
}
```

3. Restart Claude Desktop
4. The Knowledge Manager tools will appear in Claude's tool list

---

## Available API Endpoints

### Public Endpoints (No Auth Required)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/info` | GET | Service information |
| `/chat` | POST | Query knowledge base (RAG) |
| `/ingest` | POST | Ingest document |
| `/api/docs/tree` | GET | Get documentation tree |
| `/api/docs/file` | GET | Get documentation file |

### Protected Endpoints (API Key Required)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/documents` | POST | Create document |
| `/documents/{id}` | PUT | Update document |
| `/documents/{id}` | DELETE | Delete document |
| `/documents/{id}/move` | POST | Move document |

---

## Example Queries

### Search Knowledge Base

```bash
curl -X POST https://agent-data-test-pfne2mqwja-as.a.run.app/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "What is the approval workflow?"}'
```

### Search with Filters

```bash
curl -X POST https://agent-data-test-pfne2mqwja-as.a.run.app/chat \
  -H "Content-Type: application/json" \
  -d '{
    "query": "security policy",
    "filters": {"tags": ["policy", "security"]},
    "top_k": 10
  }'
```

### Ingest Document (GCS)

```bash
curl -X POST https://agent-data-test-pfne2mqwja-as.a.run.app/ingest \
  -H "Content-Type: application/json" \
  -d '{"text": "gs://mpc-rag-langroid/knowledge/new-doc.pdf"}'
```

### Create Document (Requires API Key)

```bash
curl -X POST https://agent-data-test-pfne2mqwja-as.a.run.app/documents \
  -H "Content-Type: application/json" \
  -H "X-API-Key: <your-api-key>" \
  -d '{
    "document_id": "doc_001",
    "content": {"mime_type": "text/markdown", "body": "# Title\n\nContent..."},
    "metadata": {"title": "My Document", "tags": ["example"]}
  }'
```

---

## Troubleshooting

### 401 Unauthorized

- **Cause**: Wrong API key or using Directus token for Agent Data
- **Fix**: Make sure you're using `agent-data-api-key` (not `directus-admin-token`)

### 403 Forbidden

- **Cause**: API key not configured on server
- **Fix**: Contact AI Platform team

### CORS Errors

- **Cause**: Browser direct access blocked
- **Fix**: Use the Nuxt proxy (`/api/directus/*`) for browser requests

### Empty Results from /chat

- **Cause**: Qdrant not available or no matching documents
- **Fix**: Check `/info` endpoint for Qdrant status, ingest relevant documents

---

## DOT Console Commands

The web console at `https://ai.incomexsaigoncorp.vn/admin/super-session` supports DOT commands:

| Command | Description |
|---------|-------------|
| `/dot-help` | Show all commands |
| `/dot-diag` | System diagnostics |
| `/dot-status` | Current discussion status |
| `/dot-create --topic:"Title" --coordinator:claude --reviewers:gemini,chatgpt` | Create new discussion |

---

## Support

- **Issues**: https://github.com/Huyen1974/agent-data-test/issues
- **Web Console**: https://ai.incomexsaigoncorp.vn/admin/super-session
