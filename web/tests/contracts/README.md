# Contracts — Điều 31: System Integrity Verification

> Schema: `schema.json` | Validation: `scripts/validate-contracts.sh`

## Quick start

```bash
# Validate all contracts against schema
bash scripts/validate-contracts.sh

# Run from web/ directory
cd web && node ../scripts/validate-contracts.js
```

## Contract files

| File | ID | Type | Tier | Description |
|------|-----|------|------|-------------|
| `registries-l1.json` | CTR-001 | dom_vs_db | A | Registries dashboard — 15 checks |
| `health.json` | CTR-002 | dom_vs_db | A | Health dashboard — 5 checks |
| `species-matrix.json` | CTR-003 | dom_vs_db | A | Species matrix — 10 checks |
| `sync-directus-vector.json` | CTR-SYNC-001 | directus_vs_vector | A | Directus ↔ Agent Data sync |
| `watchdog.json` | CTR-WATCHDOG | dom_vs_contract | A | Runner liveness (always_fail) |

## Adding a new contract

1. Create `tests/contracts/<name>.json` with required fields (see `schema.json`)
2. Required fields: `contract_id` (CTR-*), `name`, `tier`, `type`, `owner`, `enabled`, `contract_version`, `last_verified_at`, `grace_seconds`, `checks`
3. Each check needs: `check_id` (CTR-*-NN), `description`, `operator`, `severity`
4. Run `bash scripts/validate-contracts.sh` to verify
5. CI automatically validates on every PR

## Schema fields

- **contract_id**: Unique ID, pattern `CTR-*`
- **tier**: A (critical), B (important), C (nice-to-have)
- **type**: `dom_vs_db`, `db_vs_db`, `dom_vs_contract`, `api_vs_db`, `directus_vs_vector`
- **operator**: `strict_equals`, `eventual_equals`, `within_window`, `exists`, `not_exists`, `always_fail`, `equals`
- **severity**: `CRITICAL` (blocks), `WARNING` (alerts), `INFO` (logs)

## Existing Điều 30 contracts

`registries.json` is a legacy Điều 30 contract (used by Playwright E2E tests). It does NOT have `contract_id` and is skipped by Điều 31 validation.

## Reference

- Điều 31: `search_knowledge("system integrity verification law v1.2")`
- Điều 30: `search_knowledge("regression test law")`
