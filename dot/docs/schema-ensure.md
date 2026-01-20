# dot-schema-ensure

## Purpose
Ensures the core Directus collection `agent_views` exists with required fields. This is the base DOT schema tool and does not modify other collections.

## Preconditions
- Directus base URL set via `DIRECTUS_BASE_URL` or default in tool
- Admin auth available via `dot/bin/dot-auth`
- No UI usage; run via API only

## What it does
- Creates collection `agent_views` if missing
- Ensures required fields exist:
  - source_id, permalink, title, content, summary, tags, is_global
- Verifies all required fields and exits with [OK]

## What it does NOT do
- Does not modify existing data
- Does not touch any collection outside `agent_views`

## Usage
```bash
source dot/bin/dot-auth

dot/bin/dot-schema-ensure
```

Expected output includes:
```
[OK] Collection agent_views ready
```

## Verification
```bash
curl --globoff -sS -H "Authorization: Bearer $DOT_TOKEN" \
  "${DIRECTUS_BASE_URL}/fields/agent_views" | jq '.data | length'
```
