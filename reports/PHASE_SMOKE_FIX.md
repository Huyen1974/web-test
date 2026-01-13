# ops-smoke Stability Fix Report

## Summary
- Date: 2026-01-13
- Executor: Codex
- Status: SUCCESS

## Diagnosis
- Failure pattern: Asset check returned HTTP 403 (ops-smoke run #20955412776)
- Cold start duration observed: 16s (Cloud Run log: "Directus is healthy after 16s")
- Root cause: Smoke asset access was not public; ops-smoke consistently hit 403 even after health/pages were 200

## Evidence (Logs)
- ops-smoke failure: `Asset Status: 403` (Run #20955412776)
- Cloud Run cold start: "Directus is healthy after 16s" (2026-01-13T11:28:57Z)

## Solution Implemented
- Polling timeout: 300 seconds (5 minutes)
- Retry interval: 10 seconds
- Fail-fast on 500 errors: YES
- Key changes:
  - `.github/workflows/ops-smoke.yml`: robust polling + retry loop, schedule every 6h
  - `scripts/directus/fix_permissions.py`: enforce smoke asset `access=public` and patch on import

## Verification
- Test run on branch: Run #20955872409 - SUCCESS
- Final run on main: Run #20956022804 - SUCCESS
- Live asset check: HTTP 200 after re-hydration

## Conclusion
- System stable for E1 assembly: YES
- ops-smoke reliability: GREEN after asset access fix + polling tolerance

## Notes
- Directus health/pages were already 200 while asset stayed 403; fixing asset access resolved the instability.
