# S150-P1 — PG Matrix Foundation Report

> Session: S150-P1 | OR v7.30 | 2026-04-01
> Agent: Claude Code (claude-go)

---

## Bước 0.5: Directus Insights

**Kết quả: KHÔNG ĐỦ** — Directus Insights hỗ trợ aggregation charts 1D (count/sum/avg). KHÔNG có cross-tab/pivot matrix config-driven. → Cần PG function.

## Bước 0: Xác minh hiện trạng

| Item | Kết quả |
|------|---------|
| pivot_results | TỒN TẠI. 92 rows → nay có thêm 19 matrix rows. Thêm field `needs_refresh` (boolean) |
| pivot_definitions | TỒN TẠI. 18 cols → thêm `matrix_spec` (json). Có 2 matrix configs mới |
| birth_registry | 25,301 entities. 4 composition_level, 3 governance_role |
| collection_registry | birth_registry = COL-140 ✅ |
| Cron | */10 refresh + 4AM health đã có. Thêm */10 refresh_matrix_results() + 4:05AM dot-matrix-health |
| identity_class | KHÔNG TỒN TẠI → dùng governance_role. TD ghi nhận |

## V1: pivot_matrix() → JSONB

```json
[
  {"row": "atom",     "total": 24574, "columns": {"excluded": 5563, "governed": 1806, "observed": 17205}},
  {"row": "compound", "total": 35,    "columns": {"governed": 32, "observed": 3}},
  {"row": "meta",     "total": 35,    "columns": {"governed": 35}},
  {"row": "molecule", "total": 657,   "columns": {"excluded": 113, "governed": 276, "observed": 268}}
]
```

## V2: EXPLAIN ANALYZE → 34ms ✅

Scale assessment: **OK** (34ms trên 25,301 rows). Dưới 1s. TD: cần materialized view khi data >1M.

## V3: Matrix Configs ✅

| Code | Name | Spec |
|------|------|------|
| MTX-L1-OVERVIEW | Ma trận L1: Lớp cấu tạo × Lớp quản lý | row=composition_level, col=governance_role |
| MTX-L2-ATOM | Ma trận L2 Atom: Loài | row=species_code, filter=atom |

## V4: Independent Cross-check ✅

- Matrix SUM (MTX-L1-OVERVIEW): **25,301**
- Raw COUNT(*) FROM birth_registry: **25,301**
- **KHỚP** ✅

## V5: dot-matrix-health → ALL PASS ✅

```
MTX-L1-OVERVIEW: Check A ✅ Check B ✅ (25301=25301) Check C ✅
MTX-L2-ATOM:     Check A ✅ Check B ✅ (24574=24574) Check C ✅
Summary: 2 PASS, 0 FAIL
```

## V6: Trigger → ✅

- PG trigger `trg_matrix_config_changed` on pivot_definitions → sets needs_refresh=true ✅
- PG trigger `trg_birth_change_flag_matrix` on birth_registry (STATEMENT level) → flags all active matrix ✅
- `refresh_matrix_results()` resets needs_refresh=false after refresh ✅
- Cron */10 min picks up and refreshes ✅

## V7: DOT Lifecycle → ✅

- DOT-matrix-declare: MTX-TEST created → 4 rows ✅
- DOT-matrix-retire: MTX-TEST → is_active=false, superseded_by='deprecated' ✅

## V8: DOT Registration ✅

4 DOTs registered in dot_tools:
| Code | Name | Tier | Trigger |
|------|------|------|---------|
| DOT-312 | dot-matrix-declare | A | manual |
| DOT-313 | dot-matrix-update | A | manual |
| DOT-314 | dot-matrix-retire | A | manual |
| DOT-315 | dot-matrix-health | B | cron |

Birth records: birth trigger trên dot_tools tự tạo.

## V9: Directus Permissions ✅

matrix_spec field readable via API: **present** trên cả MTX-L1-OVERVIEW và MTX-L2-ATOM.

## V10: 5 Tầng Sync

| Tầng | Kết quả |
|------|---------|
| 1 (PG) | ✅ matrix_spec có data |
| 2 (Directus) | ✅ API trả matrix_spec |
| 3 (Nuxt) | S150-P2 (chưa làm) |
| 4 (Agent Data) | ✅ Agent Data biết MTX-L1-OVERVIEW |
| 5 (Qdrant) | Theo tầng 4 |

---

## PG Objects Created

| Type | Name | Description |
|------|------|-------------|
| FUNCTION | `pivot_matrix(source, row, col, agg, filter)` | Dynamic 2D matrix, JSONB output |
| FUNCTION | `refresh_matrix_results()` | Refresh all active matrix → pivot_results |
| FUNCTION | `fn_matrix_config_changed()` | Trigger fn: config change → needs_refresh |
| FUNCTION | `fn_birth_change_flag_matrix()` | Trigger fn: data change → flag all matrix |
| TRIGGER | `trg_matrix_config_changed` | ON pivot_definitions AFTER INSERT/UPDATE |
| TRIGGER | `trg_birth_change_flag_matrix` | ON birth_registry AFTER INSERT/UPDATE/DELETE (STATEMENT) |
| FIELD | `pivot_definitions.matrix_spec` | JSON — matrix config |
| FIELD | `pivot_results.needs_refresh` | BOOLEAN — refresh flag |

## Files Changed

| File | Action |
|------|--------|
| dot/bin/dot-matrix-declare | NEW — DOT-312 |
| dot/bin/dot-matrix-update | NEW — DOT-313 |
| dot/bin/dot-matrix-retire | NEW — DOT-314 |
| dot/bin/dot-matrix-health | NEW — DOT-315 |
| dot/bin/dot-cron-matrix-setup | NEW — cron setup script |

## TD (Technical Debt)

1. **Scale >1M**: pivot_matrix() = 34ms/25K rows. Cần materialized view hoặc partition khi >1M.
2. **td-matrix-dimensions**: Trục #3 ghi sai field — `identity_class` không tồn tại trên birth_registry, cần update → `governance_role`.
3. **Nuxt TPL-002 DirectusMatrix**: S150-P2 — render component chưa có.
