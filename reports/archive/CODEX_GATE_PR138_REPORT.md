# CODEX Gate Report – PR #138 (fix/approval-desk-remove-proxy)

## PR Identity & Checks
- PR: https://github.com/Huyen1974/web-test/pull/138
- Head/Base: fix/approval-desk-remove-proxy -> main
- Mergeable: MERGEABLE
- Status checks: build, Pass Gate, Quality Gate, E2E Smoke Test – all SUCCESS (Nuxt 3 CI / Terraform Deploy)

## Diff Review (files changed)
- web/nuxt.config.ts: adds `runtimeConfig.public.directusUrl` from NUXT_PUBLIC_DIRECTUS_URL || DIRECTUS_URL || directus-test URL (public scope; no secrets). Keeps existing siteUrl default to prod host.
- .github/workflows/firebase-deploy.yml: adds bundle guard to fail deploy if `"/api/proxy"` remains and retains localhost check.
No other files touched.

## Logic & Safety
- directusUrl exposed under runtimeConfig.public (client-side) to prevent fallback to siteUrl (avoids localhost/SPA proxy issues). No secret values added.
- Workflow guard aligns with SPA baseline: stops deploy if legacy `/api/proxy` path appears in bundle.
- Local dev unaffected: fallbacks remain (env → DIRECTUS_URL → directus-test default).

## Merge Decision
- APPROVED & MERGED via squash/delete.
- Merge commit: 534affed6b0efa9a87bc43209bb375b5e9713b97 (mergedAt 2025-12-15T08:59:20Z).

## Deploy Verification
- Firebase Deploy workflow triggered on main: run 20226209751 → SUCCESS (build/generate + bundle guards + hosting deploy).

## Outcome
- PR #138 merged safely; deploy completed with new bundle guard and correct public Directus URL exposure.
