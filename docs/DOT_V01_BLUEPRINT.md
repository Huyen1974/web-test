# DOT (Directus Operations Toolkit) v0.1 Blueprint

## Phase B Closure (Verified)
- Directus base URL: `https://directus-test-pfne2mqwja-as.a.run.app`
- Agent Data base URL: `https://agent-data-test-pfne2mqwja-as.a.run.app`
- DOT v0.1 merged via PR #227 (CI green)
- Issue #228 (E2E proof/observability): https://github.com/Huyen1974/web-test/issues/228
- Flows (active):
  - [DOT] Agent Data Health Check - ID `7159a2b0-a82b-4b32-94ca-e8442f3b3c5c`
  - [DOT] Agent Data Chat Test - ID `b13237cb-e5f3-45d0-b83f-739d0a6cb93e`
- Agent Data endpoints verified: `/info` 200, `/health` 200, `/chat` 200 with response
- Directus env readiness verified: `AGENT_DATA_URL`, `AGENT_DATA_API_KEY` secret mounted, `FLOWS_ENV_ALLOW_LIST` includes both

## Trigger Behavior and Evidence Gap
- NOTE: Webhook trigger is CANONICAL for DOT flows. Manual UI trigger (Play/Run) is debug-only and NOT a success criterion.
- Directus webhook trigger is async by design; trigger response does not include operation result.
- UI manual trigger/log inspection is informational only and not a pass/fail gate.
- Deterministic E2E evidence plan is tracked in Issue #228.

## Notes
- This document records verified outcomes only; no secrets are stored here.
