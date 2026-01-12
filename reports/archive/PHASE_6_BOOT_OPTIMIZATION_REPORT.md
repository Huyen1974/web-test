# Phase 6: Boot Optimization & RAM Reduction Report

## Summary
- Date: 2026-01-12
- Executor: Codex
- Status: SUCCESS

## Diagnosis
- Bottleneck: Directus failed to start when migrations were disabled (schema mismatch).
- Root cause: missing column `searchable` in `directus_fields` until migrations ran.

## Optimization Applied
- start.sh uses local Directus binary and optional boot flags.
- Terraform sets `DIRECTUS_MIGRATE_ON_START=true` and keeps bootstrap disabled.

## Performance Result
| Metric | Before | After |
|--------|--------|-------|
| Boot time | 172s | 20s |
| Gate (<30s) | ❌ FAIL | ✅ PASS |

## RAM Reduction
- Applied: YES
- Before: 2048Mi
- After: 1024Mi

## Verification
- Cold start log: [Cold Start] Directus is healthy after 20s
- RAM Config: 1024Mi
- Health Check: 200 OK
- 10-minute Monitoring: PASSED (5/5)
- OOM Errors: 0

## Rollback Info
- Revision: directus-test-00029-jxn
- Command: gcloud run services update-traffic directus-test --region asia-southeast1 --to-revisions=directus-test-00029-jxn=100
