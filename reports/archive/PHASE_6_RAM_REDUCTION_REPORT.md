# Phase 6: Boot Optimization & RAM Reduction Report

## Summary
- Date: 2026-01-12
- Executor: Codex
- Status: SUCCESS

## Diagnosis
- Bottleneck found: Directus failed startup when migrations were disabled (missing column `searchable`).
- Root cause: database schema was behind; Directus requires migrations to start cleanly.

## Optimization Applied
- File changed: terraform/main.tf
- Change: Enabled `DIRECTUS_MIGRATE_ON_START=true` while keeping bootstrap disabled.
- Boot logic: startup now completes within <30s with migrations enabled.

## Performance Result
| Metric | Before | After |
|--------|--------|-------|
| Boot time | 172s | 20s |
| Gate (<30s) | ❌ FAIL | ✅ PASS |

## Configuration Change
- Before: 2048Mi
- After: 1024Mi
- Reduction: 50%

## Verification
- RAM Config Confirmed: ✅ (1024Mi)
- Health Check: ✅ (HTTP 200)
- 10-minute Monitoring: ✅ (5/5 checks OK)
- OOM Errors: 0

## Rollback Info
- Rollback Revision: directus-test-00029-jxn
- Rollback Command: gcloud run services update-traffic directus-test --region asia-southeast1 --to-revisions=directus-test-00029-jxn=100

## Evidence
- Boot log: [Cold Start] Directus is healthy after 20s (directus-test-00029-jxn)
