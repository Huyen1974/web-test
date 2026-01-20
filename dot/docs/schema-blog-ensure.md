# dot-schema-blog-ensure

## Purpose
Fixes the Phase C blog schema gap where `pages_blog.featured_post` was a string and Nuxt expects a relation object. This tool aligns Directus schema so `featured_post.slug` can be expanded and SSR does not fail.

## Preconditions
- Directus base URL set via `DIRECTUS_BASE_URL` or default in tool
- Admin auth available via `dot/bin/dot-auth`
- No UI usage; run via API only

## What it changes
- Ensures collections exist: `posts`, `pages_blog`, `categories`, `team`
- Ensures fields on `posts`: `slug`, `title`, `summary`, `type`, `date_published`
- Ensures M2O relations on `posts`: `image` -> `directus_files`, `author` -> `team`, `category` -> `categories`
- Ensures M2O relations on `pages_blog`:
  - `featured_post` -> `posts`
  - `seo` -> `seo`

### Recreate behavior
If `pages_blog.featured_post` or `pages_blog.seo` exists but is not an M2O relation, the tool will:
1) Require the current value to be null
2) Delete the field
3) Recreate it as M2O
If a non-null value exists, the tool stops and reports an error.

## Usage
```bash
source dot/bin/dot-auth

dot/bin/dot-schema-blog-ensure
```

Expected output includes:
```
[OK] Blog schema ready
```

## Verification
Anonymous expansion should return an object with `slug`:

```bash
curl --globoff -sS \
  "${DIRECTUS_BASE_URL}/items/pages_blog?fields=featured_post.id,featured_post.slug" \
  | jq '.data.featured_post'
```

Posts should be readable with a slug:

```bash
curl --globoff -sS \
  "${DIRECTUS_BASE_URL}/items/posts?limit=1&fields=id,slug" \
  | jq '.data[0]'
```

## Rollback notes
- Prefer restoring from a known schema snapshot.
- If you must revert without UI:
  1) Set `pages_blog.featured_post` and `pages_blog.seo` to null.
  2) Delete the relations and fields for `featured_post` and `seo`.
  3) Recreate them as plain string fields if needed.
- Do not proceed if data would be lost; take a backup first.
