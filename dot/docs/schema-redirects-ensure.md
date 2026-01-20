# dot-schema-redirects-ensure

## Purpose
Ensures the Directus `redirects` collection exists with the minimal schema required for Nuxt redirect rules, and configures Public READ access for anonymous requests.

## Preconditions
- Directus base URL set via `DIRECTUS_BASE_URL` or default in tool
- Admin auth available via `dot/bin/dot-auth`
- API-only; no UI required

## What it changes
- Creates collection `redirects` if missing
- Ensures fields:
  - `from` (string, required)
  - `to` (string, required)
  - `status_code` (integer, default 301)
  - `enabled` (boolean, default true)
  - `sort` (integer, optional)
  - `note` (text, optional)
- Ensures Public role READ permission on `redirects` for the fields above

## What it does NOT do
- Does not seed any redirect rows
- Does not change Nuxt configuration

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
# Anonymous check (should be HTTP 200)
curl -s -o /dev/null -w "%{http_code}\n" \
  "${DIRECTUS_BASE_URL}/items/redirects?limit=1"

curl -s \
  "${DIRECTUS_BASE_URL}/items/redirects?limit=1&fields=from,to,status_code,enabled" \
  | jq '.'
```

## Rollback notes
- Remove the collection only if you have a schema snapshot.
- Prefer disabling Public permissions instead of deleting the collection when debugging.
