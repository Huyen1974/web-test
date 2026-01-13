[CODEX] Gate Report – PR #142 (fix/broken-auth-links-cleanup)

## PR
- Number: 142
- URL: https://github.com/Huyen1974/web-test/pull/142
- Head/Base: fix/broken-auth-links-cleanup -> main
- Mergeable: yes; State: open (now merged)

## CI Status (all required checks)
- build: SUCCESS
- Pass Gate: SUCCESS
- Quality Gate: SUCCESS
- E2E Smoke Test: SUCCESS

## Diff Scope
- Files changed only:
  - web/components/navigation/TheHeader.vue (Login button → /auth/signin)
  - web/modules/directus/index.ts (redirect.login → /auth/signin; logout → /)
  - web/modules/directus/runtime/composables/useDirectusAuth.ts (fallback redirects → /auth/signin)
- No other files/config/deps touched.

## Safety Check (/auth/login references)
- Repo scan `rg "/auth/login" web .github` → no matches (login route does not exist; signin exists).
- Route existence: web/pages/auth/signin.vue present; web/pages/auth/login.vue missing.
- Covers header login, Directus module redirects, and auth composable.

## Decision
- APPROVED & MERGED via squash/delete.
- Merge commit: 35f328a07265614cad787338c28a17c794012815 (mergedAt 2025-12-16T02:22:28Z).

## Deploy
- Firebase Deploy (main) run 20254322515: SUCCESS (Build and Deploy to Firebase).

## Manual spot-check (post-deploy)
1) Incognito → https://github-chatgpt-ggcloud.web.app → click Header "Login" → lands on /auth/signin (not 404), redirect preserved.
2) Visit /portal while logged out → should redirect to /auth/signin?redirect=/portal.
3) (Optional) Mobile menu: any Login link should point to /auth/signin.
