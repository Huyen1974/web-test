# WEB-60: Directus Flow Write Pipeline

## Status: VERIFIED (E2E tested with live Directus + Agent Data)

## Summary

Built auto-sync pipeline: Directus `knowledge_documents` CRUD events trigger
Directus Flows that sync to Agent Data (vectorize). All content (draft + published)
is searchable with smart status filtering.

## Phase 0: Survey Results

| Capability | Before | After |
|---|---|---|
| Upsert idempotent | YES (uuid5 deterministic) | YES (unchanged) |
| Document CRUD | YES (POST/PUT/DELETE /documents) | YES + upsert flag |
| Search filter by status | NO (only tags + tenant_id) | YES (status filter added) |
| /ingest with document_id | NO (random uuid4) | N/A (using /documents instead) |
| Directus Flow → Agent Data | NO | YES (2 flows configured) |
| dot-knowledge-search filter | NO | YES (--status flag) |

### Key Decision: /documents NOT /ingest

The `/ingest` endpoint uses random IDs (`inline-{uuid4()}`), making it non-idempotent.
The `/documents` endpoints already support explicit `document_id` with full CRUD + vector sync.
Added `?upsert=true` flag to POST /documents for create-or-update in a single call.

## Changes Made

### Agent Data (agent-data-test)

**1. POST /documents upsert flag** (`agent_data/server.py`)
- Added `upsert: bool = Query(False)` parameter
- When `upsert=True` and document exists: updates content, metadata, re-embeds vectors
- When `upsert=False`: existing 409 CONFLICT behavior (backwards compatible)
- Directus Flow calls `POST /documents?upsert=true` for both create and update events

**2. Status filter in search** (`agent_data/server.py` + `agent_data/vector_store.py`)
- Added `status: str | None` to `QueryFilters` model
- Vector store search now accepts `filter_status` parameter
- Uses Qdrant `FieldCondition` on `metadata.status` with `MatchValue`
- Firestore fallback also filters by `metadata.status`

### Directus Flows (web-test, via API)

**3. Knowledge Sync Flow** `[DOT] Knowledge Sync to Agent Data`
- Trigger: `items.create` + `items.update` on `knowledge_documents`
- Op0: `exec` — pass-through flow start (required by Directus 11.x for event flows)
- Op1: `item-read` — reads full item (needed for update events that only have changed fields)
- Op2: `request` — POST to Agent Data `/documents?upsert=true`
- Document ID format: `directus-{item_id}` (traceable, unique)
- Metadata includes: title, status (workflow_status), source ("directus"), collection

**4. Knowledge Delete Flow** `[DOT] Knowledge Delete from Agent Data`
- Trigger: `items.delete` on `knowledge_documents`
- Op0: `exec` — pass-through flow start (required by Directus 11.x)
- Op1: `request` — DELETE from Agent Data `/documents/directus-{item_id}`

### DOT Tools (web-test)

**5. dot-flow-setup-sync** (NEW)
- Bash script: `dot/bin/dot-flow-setup-sync`
- Creates/replaces Directus Flows via API
- Supports `--local` / `--cloud` / `--dry-run`
- Idempotent: finds ALL existing flows by name, deletes all, then recreates
- Uses Python for Directus API calls (curl mangles JWT tokens in bash)

**6. dot-knowledge-search** (UPDATED)
- Added `--status=published|draft|all` flag (default: published)
- Added `--collection=NAME` flag
- Passes `filters.status` to Agent Data `/chat` endpoint
- Shows status tag in source listings

**7. directus_flows.v0.2.json** (UPDATED)
- Flow spec with exec-first pattern (Directus 11.x requirement)
- Documents env requirements (FLOWS_ENV_ALLOW_LIST, AGENT_DATA_URL, AGENT_DATA_API_KEY)

### Architecture Guard (web-test + agent-data-test)

**8. dot-arch-check** (NEW, both repos)
- web-test: 5 rules (data flow, cloud URLs, secrets, SA creation, protected files)
- agent-data-test: 2 rules (secrets, SA creation)
- Pre-commit hook via `.githooks/pre-commit`

## Architecture

```
Directus (knowledge_documents)
    │
    ├─ items.create / items.update
    │   └─ Flow: exec start → Read Full Item → POST /documents?upsert=true
    │       └─ Agent Data: Firestore + Qdrant (deterministic uuid5 vectors)
    │
    └─ items.delete
        └─ Flow: exec start → DELETE /documents/directus-{id}
            └─ Agent Data: soft-delete Firestore + remove Qdrant vectors

DOT Tools
    ├─ dot-content-create → Directus → Flow auto-syncs to Agent Data
    ├─ dot-content-update → Directus → Flow auto-syncs (upsert, same vector count)
    ├─ dot-content-delete → Directus → Flow auto-deletes from Agent Data
    └─ dot-knowledge-search --status=all → Agent Data /chat with filter
```

## E2E Verification Results

| # | Check | Status | Detail |
|---|---|---|---|
| 1 | Upsert idempotent | PASS | POST same doc twice, second returns `status: "updated"`, revision increments |
| 2 | Search --status=published | PASS | Filters correctly, excludes draft documents |
| 3 | Search --status=all | PASS | Returns all documents regardless of status |
| 4 | dot-flow-setup-sync idempotent | PASS | Runs twice without error, cleans up duplicates |
| 5 | Flow create sync | PASS | Directus create → flow fires → Agent Data receives `directus-137` |
| 6 | Metadata correct | PASS | title, status, source="directus", collection="knowledge_documents" |
| 7 | Flow chain works | PASS | flow_start → read_item → send_to_ad — all 3 ops fire correctly |
| 8 | Architecture check | PASS | Both repos pass all rules (4 web-test + 2 agent-data) |

## Critical Findings During E2E Testing

### 1. Directus 11.x: Event flows must start with exec operation
Event-triggered flows that start with `item-read` as the first operation silently fail to execute.
Adding a pass-through `exec` operation (`module.exports = async function(data) { return data.$trigger; }`)
as the first operation in the chain resolves this.

### 2. FLOWS_ENV_ALLOW_LIST required
Directus does not expose environment variables to flows by default. The env var
`FLOWS_ENV_ALLOW_LIST=AGENT_DATA_URL,AGENT_DATA_API_KEY` must be set for `{{$env.VAR}}`
templates to resolve in flow operations.

### 3. Docker networking for local development
Directus runs in Docker; Agent Data runs on host. Use `http://host.docker.internal:8000`
as `AGENT_DATA_URL` for local development.

## Files

```
agent-data-test/
├── agent_data/
│   ├── server.py           (MODIFIED — upsert flag + status filter)
│   └── vector_store.py     (MODIFIED — status filter in search)
└── dot/bin/
    └── dot-arch-check      (NEW — architecture compliance)

web-test/
├── .githooks/
│   └── pre-commit          (NEW — runs dot-arch-check)
├── dot/bin/
│   ├── dot-arch-check      (NEW — 5-rule architecture compliance)
│   ├── dot-flow-setup-sync (NEW — Flow setup via API)
│   └── dot-knowledge-search (MODIFIED — --status flag)
├── dot/specs/
│   └── directus_flows.v0.2.json (UPDATED — exec-first pattern)
└── reports/
    └── WEB-60-DIRECTUS-FLOW-WRITE.md (this report)
```

## Directus Environment Variables Required

| Variable | Local | Cloud |
|---|---|---|
| AGENT_DATA_URL | http://host.docker.internal:8000 | https://agent-data-test-pfne2mqwja-as.a.run.app |
| AGENT_DATA_API_KEY | test-key-local | (from Secret Manager) |
| FLOWS_ENV_ALLOW_LIST | AGENT_DATA_URL,AGENT_DATA_API_KEY | AGENT_DATA_URL,AGENT_DATA_API_KEY |

## Notes

- Directus 11.x event flows MUST start with exec operation (item-read as first op silently fails)
- FLOWS_ENV_ALLOW_LIST must include all vars referenced by `{{$env.VAR}}` in flow templates
- Agent Data upsert is backwards-compatible (default `upsert=false` preserves 409 behavior)
- Status filter in search is additive (existing tag/tenant_id filters still work)
- Python used for Directus API calls in scripts (curl mangles JWT tokens in bash)
