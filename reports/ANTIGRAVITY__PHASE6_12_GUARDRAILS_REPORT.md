# Phase 6.12 Report: Guardrails & Nuxt URL Fix

## Scope
- Fix Nuxt Frontend Authentication failure by updating Directus URL.
- Establish Ops Guardrails to prevent regression.

## 1. Nuxt URL Fix
- **File Updated**: `web/nuxt.config.ts`
- **Change**: Replaced `https://directus-test-812872501910.asia-southeast1.run.app` (Old) with `https://directus-test-pfne2mqwja-as.a.run.app` (Golden).
- **Note**: No `.env.example` update was needed (file not present in target scope).

## 2. Guardrails Created
| File | Purpose |
| :--- | :--- |
| `.github/CODEOWNERS` | Enforce review for ops/scripts changes. Owner: `@Huyen1974`. |
| `.github/workflows/ops-smoke.yml` | CI Smoke Test checking Ping, File Access, and Page API. |
| `.github/pull_request_template.md` | Mandatory checklist preventing `set-env-vars` usage. |
| `docs/ops/DIRECTUS_GOLDEN_STATE.md` | Runbook with immutable Golden URLs and verification steps. |

## 3. Verification
- **Automated**: `grep` check will confirm old URL is gone from `web/nuxt.config.ts`.
- **CI**: The `ops-smoke` workflow is committed and will run on PR.

## NEXT STEPS
1. Push branch `chore/guardrails-nuxt-fix`.
2. Verify `ops-smoke` Action passes on GitHub.
3. Merge.
