-- S146-M4d-B: Complete Pivot L1 — 9 dòng + display_order + species_count + auto-refresh
-- Luật Pivot v4.0 §II-BIS: 9 dòng bắt buộc, thứ tự 1-9

-- ===================================================================
-- VIỆC 1: Add display_order + species_count columns
-- ===================================================================
ALTER TABLE meta_catalog ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;
ALTER TABLE meta_catalog ADD COLUMN IF NOT EXISTS species_count INTEGER DEFAULT 0;

-- ===================================================================
-- VIỆC 2: Insert 2 virtual rows — DOT + Collections
-- ===================================================================
-- DOT Tools (dòng 8)
INSERT INTO meta_catalog (code, name, entity_type, source_model, identity_class, composition_level, status, record_count, active_count)
SELECT 'CAT-DOT', 'Tổng DOT Tools', 'dot_total', 'A', 'virtual', 'meta', 'active',
       (SELECT COUNT(*) FROM dot_tools WHERE status IN ('active','published')),
       (SELECT COUNT(*) FROM dot_tools WHERE status IN ('active','published'))
WHERE NOT EXISTS (SELECT 1 FROM meta_catalog WHERE code = 'CAT-DOT');

-- Collections (dòng 9)
INSERT INTO meta_catalog (code, name, entity_type, source_model, identity_class, composition_level, status, record_count, active_count)
SELECT 'CAT-COL', 'Tổng Collections', 'collection_total', 'A', 'virtual', 'meta', 'active',
       (SELECT COUNT(*) FROM collection_registry),
       (SELECT COUNT(*) FROM collection_registry)
WHERE NOT EXISTS (SELECT 1 FROM meta_catalog WHERE code = 'CAT-COL');

-- ===================================================================
-- VIỆC 3: Set display_order (Pivot v4.0 §II-BIS thứ tự bắt buộc)
-- ===================================================================
DO $$ BEGIN
  PERFORM set_config('app.allow_meta_update', 'true', false);
  UPDATE meta_catalog SET display_order = 1 WHERE code = 'CAT-ALL';
  UPDATE meta_catalog SET display_order = 2 WHERE code = 'CAT-MOL';
  UPDATE meta_catalog SET display_order = 3 WHERE code = 'CAT-CMP';
  UPDATE meta_catalog SET display_order = 4 WHERE code = 'CAT-MAT';
  UPDATE meta_catalog SET display_order = 5 WHERE code = 'CAT-PRD';
  UPDATE meta_catalog SET display_order = 6 WHERE code = 'CAT-BLD';
  UPDATE meta_catalog SET display_order = 7 WHERE code = 'CAT-SPE';
  UPDATE meta_catalog SET display_order = 8 WHERE code = 'CAT-DOT';
  UPDATE meta_catalog SET display_order = 9 WHERE code = 'CAT-COL';
  PERFORM set_config('app.allow_meta_update', 'false', false);
END $$;

-- ===================================================================
-- VIỆC 4: Auto-refresh triggers — copy M4c species pattern
-- ===================================================================

-- DOT count auto-refresh
CREATE OR REPLACE FUNCTION fn_refresh_dot_count()
RETURNS TRIGGER AS $fn$
BEGIN
  PERFORM set_config('app.allow_meta_update', 'true', true);
  UPDATE meta_catalog
  SET record_count = (SELECT COUNT(*) FROM dot_tools WHERE status IN ('active','published')),
      active_count = (SELECT COUNT(*) FROM dot_tools WHERE status IN ('active','published')),
      last_scan_date = NOW()
  WHERE code = 'CAT-DOT';
  RETURN NULL;
END;
$fn$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_refresh_dot_count ON dot_tools;
CREATE TRIGGER trg_refresh_dot_count
  AFTER INSERT OR UPDATE OF status OR DELETE ON dot_tools
  FOR EACH STATEMENT
  EXECUTE FUNCTION fn_refresh_dot_count();

-- Collections count auto-refresh
CREATE OR REPLACE FUNCTION fn_refresh_collection_count()
RETURNS TRIGGER AS $fn$
BEGIN
  PERFORM set_config('app.allow_meta_update', 'true', true);
  UPDATE meta_catalog
  SET record_count = (SELECT COUNT(*) FROM collection_registry),
      active_count = (SELECT COUNT(*) FROM collection_registry),
      last_scan_date = NOW()
  WHERE code = 'CAT-COL';
  RETURN NULL;
END;
$fn$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_refresh_collection_count ON collection_registry;
CREATE TRIGGER trg_refresh_collection_count
  AFTER INSERT OR DELETE ON collection_registry
  FOR EACH STATEMENT
  EXECUTE FUNCTION fn_refresh_collection_count();

-- ===================================================================
-- VIỆC 5: species_count per level — function + initial populate
-- ===================================================================
CREATE OR REPLACE FUNCTION fn_refresh_species_per_level()
RETURNS void AS $fn$
BEGIN
  PERFORM set_config('app.allow_meta_update', 'true', true);
  UPDATE meta_catalog mc
  SET species_count = COALESCE(
    (SELECT COUNT(*) FROM entity_species es WHERE es.composition_level = mc.composition_level),
    0
  )
  WHERE mc.identity_class = 'virtual' AND mc.composition_level IS NOT NULL;
  -- Species row: species_count = record_count (total species)
  UPDATE meta_catalog SET species_count = record_count WHERE code = 'CAT-SPE';
  -- DOT + Collections: species_count = 0 (not applicable)
  UPDATE meta_catalog SET species_count = 0 WHERE code IN ('CAT-DOT', 'CAT-COL');
  PERFORM set_config('app.allow_meta_update', 'false', true);
END;
$fn$ LANGUAGE plpgsql;

-- Initial populate
SELECT fn_refresh_species_per_level();
