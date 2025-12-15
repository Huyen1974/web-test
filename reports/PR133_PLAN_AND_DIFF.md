# PR133 Client-side Datafix Plan & Diff

## Objectives
- Remove SPA dependencies on internal `/api/*` routes (proxy/feedback/stripe/search).
- Fetch data client-side from Directus using `NUXT_PUBLIC_DIRECTUS_URL`.
- Align public config defaults (`siteUrl` set to live host) and ensure agentData flags come from env.

## Changes Summary
- Directus plugin now points to Directus base URL instead of `/api/proxy` and guards when missing.
- Global/portal search call Directus collections client-side; removed `/api/search` and `/api/portal/search` usage.
- Help feedback flow no longer posts to missing `/api/feedback`; succeeds locally.
- Stripe composable guarded: no `/api/stripe/*` calls; surfaces disabled message when invoked.
- Runtime config defaults updated for `siteUrl` and agentData env wiring.

## Diffstat
```
$(cat reports/PR133_diffstat.txt)
```

## Evidence files
- API usage scan: `reports/PR133_api_usage.txt`
- `/api/proxy` grep proof: `reports/PR133_no_api_proxy_grep_proof.txt`
- Diffstat: `reports/PR133_diffstat.txt`

## Next steps
- Build/preview and verify key flows (search, auth guard, UI) against Directus URL.
- Run post-deploy smoke plan (global search, portal search, page loads) on https://github-chatgpt-ggcloud.web.app.
