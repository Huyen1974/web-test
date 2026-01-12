
---

## ADR-006: Directus Boot Optimization (2026-01-12)

### Status
ACCEPTED

### Context
- Directus cold start took 172s, causing ops-smoke failures
- RAM was over-provisioned at 2048Mi

### Decision
1. Docker Architecture: Build-time install (dependencies baked into image)
2. Infrastructure: Cloud Run with 1024Mi RAM (reduced from 2048Mi)
3. Boot Config: DIRECTUS_MIGRATE_ON_START=true (required for schema sync)
4. Bootstrap: DIRECTUS_BOOTSTRAP_ON_START=false (admin already exists)

### Consequences
- Cold start: 172s -> 20s (~8x improvement)
- Cost: ~50% reduction in Cloud Run compute
- Stability: Schema always in sync with code

### Performance Metrics
| Metric | Before | After |
|--------|--------|-------|
| Cold Start | 172s | 20s |
| RAM | 2048Mi | 1024Mi |
| ops-smoke | UNSTABLE | STABLE |

