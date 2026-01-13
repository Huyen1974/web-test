# PR133 internal API removal report

## Summary
- Removed all internal `/api/*` dependencies for SPA/Firebase hosting.
- Deleted Nitro server route `web/layers/portal/server/api/portal/search.get.ts`.
- `agentDataClient` now hits Agent Data base URL paths (`search`, `log/page-view`, `log/search`) instead of relative `/api/...`.
- Cleaned `nuxt.config.ts` to drop commented `/api/_sitemap-urls` reference.

## Proof (after fixes)
- `/api` grep: `reports/pr133_api_hits_after.txt` (empty)
- server api grep: `reports/pr133_server_api_hits_after.txt` (empty)

## Build/Checks
- `pnpm -C web lint` → fails (ESLint v9 expects eslint.config.js; see `reports/pr133_pnpm_lint.txt`).
- `pnpm -C web install --frozen-lockfile` → ok (`reports/pr133_pnpm_install.txt`).
- `pnpm -C web generate` → SUCCESS after install (`reports/pr133_pnpm_generate.txt`).
- CI triggered: see `reports/pr133_runs_after_fix.txt`.

## Notes/Risks
- Lint config migration still needed (existing issue on main); not addressed in this PR per scope.
- No changes to docs/E1_Plan.md (Appendix F stays intact on main).
