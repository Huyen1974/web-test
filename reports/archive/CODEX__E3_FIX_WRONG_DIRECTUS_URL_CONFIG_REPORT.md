# [CODEX] E3 Fix Wrong Directus URL Config
**CLI:** CLI.CODEX.E3_FIX_WRONG_DIRECTUS_URL_CONFIG.v1.0

## Before → After
- `runtimeConfig.public.directus` (was missing): now set to env-first, fallback golden  
  `url: process.env.NUXT_PUBLIC_DIRECTUS_URL || process.env.DIRECTUS_URL || 'https://directus-test-pfne2mqwja-as.a.run.app'`  
  `rest.baseUrl: same as above`  
  `rest.nuxtBaseUrl: process.env.NUXT_PUBLIC_SITE_URL || 'https://github-chatgpt-ggcloud.web.app'`
- Legacy `directusUrl` key retained but now aligned to the same env-first golden fallback.

## Review Findings
- Change is scoped to configuration only; no runtime code added. Aligns with Directus module expectations (`config.public.directus?.rest?.baseUrl || config.public.directus?.url`). Removes stale hardcode and uses golden URL with env override. No secrets introduced.

## PR / Merge Status
- Not yet merged: local changes only (main is protected). Branch/PR required to land change.

## Status
- FAILURE (awaiting PR/merge; deploy not run).

## Next
- Create PR with this change, merge (squash) after CI green, then deploy hosting and verify.
