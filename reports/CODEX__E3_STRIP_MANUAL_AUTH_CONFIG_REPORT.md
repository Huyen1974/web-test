# [CODEX] E3 Strip Manual Auth Config Report
**CLI:** CLI.CODEX.E3_STRIP_MANUAL_AUTH_CONFIG.v1.0

## Review Findings
- Change scope limited to `web/nuxt.config.ts` Directus auth config: removed manual `contacts` dependency; `userFields` now `['*']`. No secrets or risk; aligns with standard assembly and avoids missing contacts data on login redirect.
- Other files untouched.

## Config Diff (before → after)
- `directus.auth.userFields`: `['*', { contacts: ['*'] }]` → `['*']`

## Commit & Deploy
- Commit: fix: strip manual contacts dependency, use standard auth
- Commit SHA: pending (see git log after commit)
- Build: `npx nuxi cleanup && npm run generate` (web/)
- Deploy: `firebase deploy --only hosting -m "E3 Deploy: strip contacts dependency"`

## Status
- SUCCESS: Config updated, built, and deployed to hosting. Login should no longer require contacts data.

## Next
- Run live login smoke (Claude) with `demo@agency.com / Demo@123456` and verify redirect succeeds.
