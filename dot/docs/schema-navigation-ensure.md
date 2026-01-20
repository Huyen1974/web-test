# dot-schema-navigation-ensure

## Purpose
Converts Directus `navigation` from an empty singleton into a collection with string IDs, then ensures `main` and `footer` records exist. This aligns Directus with Agency OS requests to `/items/navigation/main` and `/items/navigation/footer`.

## Preconditions
- Directus base URL set via `DIRECTUS_BASE_URL` or default in tool
- Admin auth available via `dot/bin/dot-auth`
- The existing singleton must be empty. If it is not empty, the tool stops.

## What it changes
- If `navigation` is a singleton and empty, deletes the collection and recreates it as a regular collection.
- Creates `navigation` with string primary key `id`.
- Adds `items` field as JSON.
- Ensures `main` and `footer` records exist with `items: []`.
- Ensures Public READ permission for `navigation`.

## What it does NOT do
- Does not seed any navigation items beyond empty arrays.
- Does not touch Nuxt code or other collections.

## Usage
```bash
source dot/bin/dot-auth

dot/bin/dot-schema-navigation-ensure
```

Expected output includes:
```
[OK] Collection navigation ready
```

## Verification
```bash
# Anonymous access should return 200
curl -s -o /dev/null -w "%{http_code}\n" \
  "${DIRECTUS_BASE_URL}/items/navigation/main"

curl -s -o /dev/null -w "%{http_code}\n" \
  "${DIRECTUS_BASE_URL}/items/navigation/footer"

# JSON snippets
curl -s "${DIRECTUS_BASE_URL}/items/navigation/main" | jq '.data' | head -20
curl -s "${DIRECTUS_BASE_URL}/items/navigation/footer" | jq '.data' | head -20
```

## Rollback notes
- If you need to revert, restore from a schema snapshot.
- Do not delete the collection if it contains real data.
