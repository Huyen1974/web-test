# dot-schema-redirects-ensure

## Purpose
Ensures the Directus `redirects` collection exists and has the fields Nuxt uses to build route rules.
This addresses the Phase C mismatch where `redirects` was missing.

## Preconditions
- Directus base URL set via `DIRECTUS_BASE_URL` or default in tool
- Admin auth available via `dot/bin/dot-auth`
- API-only; no UI required

## What it changes
- Creates collection `redirects` if missing
- Ensures fields:
  - `url_old` (string, required)
  - `url_new` (string, required)
  - `response_code` (integer, optional)
  - `notice_redirects` (string, optional)

## What it does NOT do
- Does not configure public permissions. If public reads return 403, set Public role READ on `redirects` separately.
- Does not seed any redirect rows.

## Usage
```bash
source dot/bin/dot-auth

dot/bin/dot-schema-redirects-ensure
```

Expected output includes:
```
[OK] Collection redirects ready
```

## Verification
```bash
# Admin check
curl --globoff -sS -H "Authorization: Bearer $DOT_TOKEN" \
  "${DIRECTUS_BASE_URL}/items/redirects?limit=1&fields=url_old,url_new,response_code" \
  | jq '.data'

# Anonymous check (requires public READ permission)
curl --globoff -sS \
  "${DIRECTUS_BASE_URL}/items/redirects?limit=1&fields=url_old,url_new,response_code" \
  | jq '.data'
```

## Rollback notes
- Remove the collection only if you have a schema snapshot.
- Prefer disabling public permissions instead of deleting the collection when debugging.
