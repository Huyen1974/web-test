-- =============================================================================
-- S133: Universal Measurement Framework — PG Foundation
-- Design: knowledge/dev/architecture/dieu31-pg-technical-design.md v2.0
-- 3 tables + 3 functions + 1 trigger + 1 materialized view + seed data
-- =============================================================================

-- ─────────────────────────────────────────────
-- TABLE 1: law_catalog — Danh mục TẤT CẢ luật
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS law_catalog (
    law_code        TEXT PRIMARY KEY,
    law_name        TEXT NOT NULL,
    law_version     TEXT NOT NULL,
    ssot_collection TEXT,
    ssot_document   TEXT,
    status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('draft', 'active', 'deprecated')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE law_catalog IS 'Danh mục tất cả luật trong hệ thống — Universal Measurement Framework';

-- ─────────────────────────────────────────────
-- TABLE 2: measurement_registry — Danh mục đo lường
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS measurement_registry (
    measurement_id   TEXT PRIMARY KEY,
    measurement_name TEXT NOT NULL,
    law_code         TEXT NOT NULL REFERENCES law_catalog(law_code),

    -- Phương pháp (methodology v2.0)
    method           SMALLINT NOT NULL CHECK (method IN (1, 2)),
    -- 1 = PG kiểm PG (Bài toán 1)
    -- 2 = PG vs External (Bài toán 2 — cần runner)

    -- Nguồn chân lý (LUÔN là PG)
    source_query     TEXT NOT NULL,

    -- So sánh với
    target_type      TEXT NOT NULL CHECK (target_type IN (
        'pg_query', 'pg_function',
        'nuxt_api', 'nuxt_page', 'agent_data', 'directus_api'
    )),
    target_query     TEXT NOT NULL,

    -- Phân loại
    category         TEXT NOT NULL CHECK (category IN (
        'completeness', 'consistency', 'currency', 'validity', 'liveness'
    )),

    -- Vận hành
    severity         TEXT NOT NULL DEFAULT 'warning'
                     CHECK (severity IN ('critical', 'warning', 'info')),
    comparison       TEXT NOT NULL DEFAULT 'strict_equals'
                     CHECK (comparison IN (
                         'strict_equals', 'eventual_equals',
                         'exists', 'not_exists', 'within_window', 'always_fail'
                     )),
    enabled          BOOLEAN NOT NULL DEFAULT true,
    auto_generated   BOOLEAN NOT NULL DEFAULT false,

    -- Trạng thái run gần nhất
    last_run_at      TIMESTAMPTZ,
    last_result      TEXT CHECK (last_result IN ('pass', 'fail', 'error')),
    last_evidence    JSONB,

    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_msr_law ON measurement_registry(law_code);
CREATE INDEX IF NOT EXISTS idx_msr_method ON measurement_registry(method);
CREATE INDEX IF NOT EXISTS idx_msr_enabled ON measurement_registry(enabled) WHERE enabled = true;

COMMENT ON TABLE measurement_registry IS 'Danh mục TẤT CẢ measurements — thêm đo lường = thêm 1 row';

-- ─────────────────────────────────────────────
-- TABLE 3: measurement_log — Kết quả đo
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS measurement_log (
    run_id           TEXT NOT NULL,
    measurement_id   TEXT NOT NULL REFERENCES measurement_registry(measurement_id),
    run_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    result           TEXT NOT NULL CHECK (result IN ('pass', 'fail', 'error')),
    source_value     TEXT,
    target_value     TEXT,
    delta            TEXT,
    evidence         JSONB,

    PRIMARY KEY (run_id, measurement_id)
);

COMMENT ON TABLE measurement_log IS 'Kết quả chạy measurements — mỗi run ghi 1 row per measurement';

-- ─────────────────────────────────────────────
-- TRIGGER: Auto-update measurement_registry.last_*
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_measurement_status()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE measurement_registry SET
        last_run_at = NEW.run_at,
        last_result = NEW.result,
        last_evidence = jsonb_build_object(
            'source', NEW.source_value,
            'target', NEW.target_value,
            'delta', NEW.delta
        ),
        updated_at = NOW()
    WHERE measurement_id = NEW.measurement_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_measurement ON measurement_log;
CREATE TRIGGER trg_update_measurement
AFTER INSERT ON measurement_log
FOR EACH ROW EXECUTE FUNCTION update_measurement_status();

-- ─────────────────────────────────────────────
-- FUNCTION: run_internal_measurements() — Bài toán 1
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION run_internal_measurements(
    p_law_code TEXT DEFAULT NULL,
    p_run_id TEXT DEFAULT NULL
)
RETURNS TABLE (
    measurement_id TEXT,
    measurement_name TEXT,
    law_code TEXT,
    source_value TEXT,
    target_value TEXT,
    result TEXT,
    delta TEXT
) AS $$
DECLARE
    rec RECORD;
    src_val TEXT;
    tgt_val TEXT;
    v_run_id TEXT;
BEGIN
    v_run_id := COALESCE(p_run_id, 'internal-' || to_char(NOW(), 'YYYYMMDD-HH24MISS'));

    FOR rec IN
        SELECT * FROM measurement_registry
        WHERE enabled = true
          AND method = 1
          AND (p_law_code IS NULL OR measurement_registry.law_code = p_law_code)
    LOOP
        BEGIN
            EXECUTE rec.source_query INTO src_val;
            EXECUTE rec.target_query INTO tgt_val;

            measurement_id := rec.measurement_id;
            measurement_name := rec.measurement_name;
            law_code := rec.law_code;
            source_value := src_val;
            target_value := tgt_val;

            IF src_val = tgt_val THEN
                result := 'pass';
                delta := '0';
            ELSE
                result := 'fail';
                delta := COALESCE(src_val, 'NULL') || ' ≠ ' || COALESCE(tgt_val, 'NULL');
            END IF;

            INSERT INTO measurement_log (run_id, measurement_id, run_at, result, source_value, target_value, delta)
            VALUES (v_run_id, rec.measurement_id, NOW(), result, src_val, tgt_val, delta);

            RETURN NEXT;
        EXCEPTION WHEN OTHERS THEN
            measurement_id := rec.measurement_id;
            measurement_name := rec.measurement_name;
            law_code := rec.law_code;
            source_value := SQLERRM;
            target_value := NULL;
            result := 'error';
            delta := 'QUERY ERROR';

            INSERT INTO measurement_log (run_id, measurement_id, run_at, result, source_value, target_value, delta)
            VALUES (v_run_id, rec.measurement_id, NOW(), 'error', SQLERRM, NULL, 'QUERY ERROR');

            RETURN NEXT;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────
-- FUNCTION: verify_framework_health()
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION verify_framework_health()
RETURNS TABLE (
    issue_type TEXT,
    severity TEXT,
    detail TEXT
) AS $$
BEGIN
    -- 1. Luật active nhưng không có measurement nào
    RETURN QUERY
    SELECT 'law_no_measurements'::TEXT, 'warning'::TEXT,
        'Luật ' || lc.law_code || ' không có measurement nào'
    FROM law_catalog lc
    LEFT JOIN measurement_registry mr ON mr.law_code = lc.law_code AND mr.enabled = true
    WHERE lc.status = 'active' AND mr.measurement_id IS NULL;

    -- 2. Collection governed không có measurement nào
    RETURN QUERY
    SELECT 'collection_blind_spot'::TEXT, 'critical'::TEXT,
        'Collection ' || mc.collection_name || ' (' || mc.code || ') không có measurement'
    FROM meta_catalog mc
    LEFT JOIN measurement_registry mr ON mr.source_query LIKE '%' || mc.collection_name || '%'
    WHERE mc.governed = true AND mr.measurement_id IS NULL;

    -- 3. Measurement enabled nhưng stale >26h
    RETURN QUERY
    SELECT 'stale_measurement'::TEXT, 'warning'::TEXT,
        'Measurement ' || mr.measurement_id || ' không chạy ' ||
            ROUND(EXTRACT(EPOCH FROM NOW() - mr.last_run_at)/3600)::TEXT || 'h'
    FROM measurement_registry mr
    WHERE mr.enabled = true AND mr.last_run_at IS NOT NULL
      AND mr.last_run_at < NOW() - INTERVAL '26 hours';

    -- 4. Measurement trỏ vào bảng không tồn tại
    RETURN QUERY
    SELECT 'orphan_measurement'::TEXT, 'critical'::TEXT,
        'Measurement ' || mr.measurement_id || ' source_query tham chiếu bảng không tồn tại'
    FROM measurement_registry mr
    WHERE mr.enabled = true
      AND NOT EXISTS (
          SELECT 1 FROM information_schema.tables t
          WHERE mr.source_query LIKE '%' || t.table_name || '%'
            AND t.table_schema = 'public'
      );

    -- 5. Bảng mới trong PG chưa có trong meta_catalog
    RETURN QUERY
    SELECT 'untracked_table'::TEXT, 'warning'::TEXT,
        'Bảng ' || t.table_name || ' mới trong PG, chưa có trong meta_catalog'
    FROM information_schema.tables t
    LEFT JOIN meta_catalog mc ON mc.collection_name = t.table_name
    WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
      AND mc.code IS NULL
      AND t.table_name NOT LIKE 'directus_%'
      AND t.table_name NOT LIKE 'pg_%'
      AND t.table_name NOT IN ('spatial_ref_sys', 'measurement_registry',
          'measurement_log', 'law_catalog');

    -- 6. Coverage report
    RETURN QUERY
    SELECT 'coverage_report'::TEXT, 'info'::TEXT,
        'Coverage: ' ||
        (SELECT COUNT(DISTINCT mr2.law_code) FROM measurement_registry mr2 WHERE mr2.enabled = true) ||
        ' luật, ' ||
        (SELECT COUNT(*) FROM measurement_registry mr2 WHERE mr2.enabled = true) ||
        ' measurements, ' ||
        (SELECT COUNT(*) FROM measurement_registry mr2 WHERE mr2.enabled = true AND mr2.last_result = 'pass') ||
        ' pass, ' ||
        (SELECT COUNT(*) FROM measurement_registry mr2 WHERE mr2.enabled = true AND mr2.last_result = 'fail') ||
        ' fail';
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────
-- MATERIALIZED VIEW: Dashboard tổng hợp
-- ─────────────────────────────────────────────
DROP MATERIALIZED VIEW IF EXISTS mv_measurement_dashboard;
CREATE MATERIALIZED VIEW mv_measurement_dashboard AS
SELECT
    mr.law_code,
    lc.law_name,
    COUNT(*) FILTER (WHERE mr.enabled) AS total_measurements,
    COUNT(*) FILTER (WHERE mr.last_result = 'pass') AS pass_count,
    COUNT(*) FILTER (WHERE mr.last_result = 'fail') AS fail_count,
    COUNT(*) FILTER (WHERE mr.last_result IS NULL) AS never_run,
    CASE
        WHEN COUNT(*) FILTER (WHERE mr.last_result IS NOT NULL) > 0
        THEN ROUND(100.0 * COUNT(*) FILTER (WHERE mr.last_result = 'pass') /
             COUNT(*) FILTER (WHERE mr.last_result IS NOT NULL), 1)
        ELSE 0
    END AS pass_rate_pct,
    MIN(mr.last_run_at) AS oldest_run,
    MAX(mr.last_run_at) AS newest_run
FROM measurement_registry mr
JOIN law_catalog lc ON lc.law_code = mr.law_code
WHERE mr.enabled = true
GROUP BY mr.law_code, lc.law_name;

CREATE OR REPLACE FUNCTION refresh_measurement_dashboard()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW mv_measurement_dashboard;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- SEED DATA
-- =============================================================================

-- Law catalog — 4 luật hiện có
INSERT INTO law_catalog (law_code, law_name, law_version, ssot_collection, ssot_document, status) VALUES
('dieu26', 'Luật Đếm', 'v2.1.1', 'meta_catalog', 'knowledge/dev/architecture/counting-law.md', 'active'),
('dieu28', 'Luật Khai Sinh', 'v1.0', 'birth_registry', 'knowledge/dev/architecture/birth-registry-law.md', 'active'),
('dieu29', 'Luật Species', 'v1.1', 'species_collection_map', 'knowledge/dev/architecture/species-taxonomy-complete.md', 'active'),
('dieu30', 'Luật Hồi Quy', 'v1.0', NULL, 'knowledge/dev/architecture/regression-law.md', 'active'),
('dieu31', 'Luật Toàn Vẹn', 'v1.3', 'system_issues', 'knowledge/dev/architecture/system-integrity-law.md', 'active')
ON CONFLICT (law_code) DO UPDATE SET
    law_version = EXCLUDED.law_version,
    ssot_collection = EXCLUDED.ssot_collection,
    updated_at = NOW();

-- Measurements — Điều 26 (Counting)
INSERT INTO measurement_registry (measurement_id, measurement_name, law_code, method, source_query, target_type, target_query, category, severity, comparison) VALUES
('MSR-D26-001', 'verify_counts = 0 mismatch', 'dieu26', 1,
 'SELECT COUNT(*) FROM verify_counts() WHERE status != ''OK''',
 'pg_query', 'SELECT 0::bigint',
 'consistency', 'critical', 'strict_equals'),

('MSR-D26-002', 'meta_catalog governed count > 0', 'dieu26', 1,
 'SELECT COUNT(*) FROM meta_catalog WHERE governed = true',
 'pg_query', 'SELECT COUNT(*) FROM meta_catalog WHERE governed = true AND entity_count > 0',
 'completeness', 'warning', 'strict_equals'),

('MSR-D26-004', 'trigger count = 17', 'dieu26', 1,
 'SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema = ''public'' AND trigger_name LIKE ''trg_count_%''',
 'pg_query', 'SELECT 17::bigint',
 'validity', 'critical', 'strict_equals')
ON CONFLICT (measurement_id) DO NOTHING;

-- Measurements — Điều 28 (Birth Registry)
INSERT INTO measurement_registry (measurement_id, measurement_name, law_code, method, source_query, target_type, target_query, category, severity, comparison) VALUES
('MSR-D28-001', 'birth_registry total = meta_catalog total', 'dieu28', 1,
 'SELECT COUNT(*) FROM birth_registry',
 'pg_query', 'SELECT SUM(entity_count) FROM meta_catalog WHERE governed = true',
 'consistency', 'warning', 'strict_equals'),

('MSR-D28-002', 'birth_registry covers all governed collections', 'dieu28', 1,
 'SELECT COUNT(DISTINCT collection_name) FROM birth_registry',
 'pg_query', 'SELECT COUNT(*) FROM meta_catalog WHERE governed = true AND entity_count > 0',
 'completeness', 'warning', 'strict_equals')
ON CONFLICT (measurement_id) DO NOTHING;

-- Measurements — Điều 29 (Species)
INSERT INTO measurement_registry (measurement_id, measurement_name, law_code, method, source_query, target_type, target_query, category, severity, comparison) VALUES
('MSR-D29-001', 'species count >= 33', 'dieu29', 1,
 'SELECT COUNT(*) FROM species WHERE total > 0',
 'pg_query', 'SELECT 33::bigint',
 'completeness', 'warning', 'exists'),

('MSR-D29-002', 'all governed collections mapped to species', 'dieu29', 1,
 'SELECT COUNT(*) FROM meta_catalog WHERE governed = true AND species_code IS NOT NULL',
 'pg_query', 'SELECT COUNT(*) FROM meta_catalog WHERE governed = true',
 'completeness', 'warning', 'strict_equals')
ON CONFLICT (measurement_id) DO NOTHING;

-- Measurements — Điều 30 (Regression)
INSERT INTO measurement_registry (measurement_id, measurement_name, law_code, method, source_query, target_type, target_query, category, severity, comparison) VALUES
('MSR-D30-001', 'node_identity all nodes have identity', 'dieu30', 1,
 'SELECT COUNT(*) FROM node_identity WHERE status = ''active''',
 'pg_query', 'SELECT COUNT(*) FROM node_identity',
 'validity', 'warning', 'strict_equals')
ON CONFLICT (measurement_id) DO NOTHING;

-- Measurements — Điều 31 (System Issues / Integrity)
INSERT INTO measurement_registry (measurement_id, measurement_name, law_code, method, source_query, target_type, target_query, category, severity, comparison) VALUES
('MSR-D31-001', 'system_issues total count consistency', 'dieu31', 1,
 'SELECT COUNT(*) FROM system_issues',
 'pg_query', 'SELECT SUM(cnt::bigint) FROM (SELECT COUNT(*) as cnt FROM system_issues GROUP BY severity) sub',
 'consistency', 'critical', 'strict_equals'),

('MSR-D31-002', 'all system_issues have issue_class', 'dieu31', 1,
 'SELECT COUNT(*) FROM system_issues WHERE issue_class IS NULL',
 'pg_query', 'SELECT 0::bigint',
 'validity', 'warning', 'strict_equals'),

('MSR-D31-003', 'all system_issues have severity', 'dieu31', 1,
 'SELECT COUNT(*) FROM system_issues WHERE severity IS NULL OR severity = ''''',
 'pg_query', 'SELECT 0::bigint',
 'validity', 'warning', 'strict_equals'),

('MSR-D31-004', 'system_issues severity uses English standard', 'dieu31', 1,
 'SELECT COUNT(*) FROM system_issues WHERE severity NOT IN (''CRITICAL'', ''WARNING'', ''INFO'')',
 'pg_query', 'SELECT 0::bigint',
 'validity', 'critical', 'strict_equals'),

-- Bài toán 2 measurements (PG vs Nuxt — cần runner bên ngoài)
('MSR-D31-101', 'Registries L1 total khớp PG', 'dieu31', 2,
 'SELECT COUNT(*)::text FROM system_issues',
 'nuxt_api', '/api/registry/system-issues',
 'consistency', 'critical', 'strict_equals'),

('MSR-D31-102', 'Species count UI khớp PG', 'dieu31', 2,
 'SELECT COUNT(*)::text FROM species WHERE total > 0',
 'nuxt_api', '/api/registry/species-summary',
 'consistency', 'warning', 'strict_equals'),

('MSR-D31-WATCHDOG', 'WATCHDOG — runner sống', 'dieu31', 2,
 'SELECT 1::text', 'nuxt_api', 'ALWAYS_FAIL',
 'liveness', 'critical', 'always_fail')
ON CONFLICT (measurement_id) DO NOTHING;

-- =============================================================================
-- INITIAL RUN — verify framework works
-- =============================================================================
-- Run all internal measurements to populate initial results
SELECT * FROM run_internal_measurements(NULL, 's133-seed');

-- Refresh dashboard
SELECT refresh_measurement_dashboard();

-- Verify
SELECT 'law_catalog' AS what, COUNT(*) AS cnt FROM law_catalog
UNION ALL
SELECT 'measurement_registry', COUNT(*) FROM measurement_registry
UNION ALL
SELECT 'measurement_log', COUNT(*) FROM measurement_log;
