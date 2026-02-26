# CLAUDE.md — Web Test (web-test)

> **⛔ FIRST: `search_knowledge('operating rules SSOT')` before any work.**

## Rules

### Rule 1: start_session
Before any task, run `search_knowledge('operating rules SSOT')` to load the latest operating rules from the knowledge base. These rules are the single source of truth and override any stale instructions.

### Rule 2: crud_method
**MCP is the ONLY channel for knowledge-base CRUD.** Never use raw HTTP calls, curl, or direct Firestore/Qdrant access for document operations. All reads and writes go through MCP tools:
- **Read**: `search_knowledge`, `get_document`, `get_document_for_rewrite`, `batch_read`, `list_documents`
- **Write**: `upload_document`, `update_document`, `patch_document`, `delete_document`, `move_document`
- **Ingest**: `ingest_document`

### Rule 3: git_workflow
All changes follow the **2-Mũ (Two-Hat) process**:
1. **Mũ 1** — Code → branch → push → CI GREEN
2. **Mũ 2** — Review → Merge PR → Deploy VPS → Verify

Never push directly to `main`. The pre-push hook blocks it. Always use feature branches and PRs.

### Rule 4: deploy
Deploy to VPS only after PR merge to `main`:
```bash
ssh -i ~/.ssh/contabo_vps root@38.242.240.89 \
  "cd /opt/incomex/docker && docker compose pull nuxt && docker compose up -d nuxt"
```
Verify with health check after deploy.

### Rule 5: search_first
Before creating any document, search first: `search_knowledge('topic')` and `list_documents('prefix')`. Prevent duplicates. If a document exists, update it — don't create a new one.

### Rule 6: verify
After any CRUD operation, verify the result:
- After create/update: `get_document` to confirm content
- After delete: `list_documents` to confirm removal
- After deploy: verify site loads correctly

## MCP Tools (11)

| Tool | Type | Description |
|------|------|-------------|
| `search_knowledge` | Read | Semantic/RAG search across knowledge base |
| `list_documents` | Read | List documents by path prefix |
| `get_document` | Read | Truncated content + related docs (vector search) |
| `get_document_for_rewrite` | Read | Full content for rewriting |
| `batch_read` | Read | Read up to 20 documents in one call |
| `upload_document` | Write | Create new document |
| `update_document` | Write | Replace document content |
| `patch_document` | Write | Find-and-replace within document |
| `delete_document` | Write | Delete document |
| `move_document` | Write | Move document to new parent |
| `ingest_document` | Write | Ingest from GCS URI or URL |

## Project Conventions

- **Language**: TypeScript (Nuxt 3, Vue 3, Directus SDK)
- **Runtime**: Docker on VPS (38.242.240.89) — Nuxt SSR container
- **Directus**: `https://directus.incomexsaigoncorp.vn` (ops data)
- **Agent Data**: `https://vps.incomexsaigoncorp.vn/api` (knowledge base)
- **Knowledge proxy**: `web/server/api/knowledge/` routes proxy to Agent Data
- **Directus internal URL**: `NUXT_DIRECTUS_INTERNAL_URL` for SSR (Docker network)
- **DOT tools**: `dot/bin/` — operational automation scripts
- **Commit style**: `feat:`, `fix:`, `docs:` prefix + ticket number e.g. `(WEB-87)`
- **Subdomain routing**: `vps.incomexsaigoncorp.vn` (Nuxt + Agent Data), `directus.incomexsaigoncorp.vn` (Directus)
