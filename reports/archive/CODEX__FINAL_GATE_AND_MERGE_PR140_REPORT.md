[CODEX] Final Gate – PR #140 (fix/portal-directus-auth)

## CI / Required Checks
- Base: main; Head: fix/portal-directus-auth; Mergeable: MERGEABLE
- Required checks all SUCCESS: build, Pass Gate, Quality Gate, E2E Smoke Test

## Diff Scope
- Files changed: only `web/layers/portal/pages/portal.vue`
- No config/deps/workflow changes; no /api/proxy or internal /api additions.

## Logic Review
- Removed Firebase `middleware: ['auth']` from portal page; added client-side Directus guard in `onMounted`.
- Guard: if `user.value` is falsy on mount, redirect to `/auth/login` with `redirect` query to current route.
- Success path unchanged: when user already populated, portal renders.
- Risk: brief null window could redirect even if session is restoring. Acceptable given prior blank portal; redirect loop unlikely (login page should set user then navigate). No sensitive data logged.

## Merge & Deploy
- Decision: MERGED via squash/delete.
- Merge commit: 69bb8b1a2b53062d0573d4dc8a3ecc6b1da9a8b8 (mergedAt 2025-12-15T10:51:21Z)
- Firebase Deploy (main) run 20229532762: SUCCESS (Build and Deploy to Firebase)

## Outcome
- Portal now uses Directus auth guard client-side to avoid blank page; deploy completed successfully.
