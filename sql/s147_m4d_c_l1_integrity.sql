-- S147-M4d-C: L1 Integrity — 45 ô ALL ≠ NULL + orphan auto-refresh
-- §0-BD: Tab Pivot L1 = 9 dòng × 5 cột = 45 ô. MỌI ô PHẢI NUMBER, KHÔNG NULL.

-- ===================================================================
-- VIỆC 1: SET DEFAULT 0 + fix NULLs
-- ===================================================================
ALTER TABLE meta_catalog ALTER COLUMN species_count SET DEFAULT 0;
ALTER TABLE meta_catalog ALTER COLUMN orphan_count SET DEFAULT 0;
ALTER TABLE meta_catalog ALTER COLUMN display_order SET DEFAULT 0;

DO $$ BEGIN
  PERFORM set_config('app.allow_meta_update', 'true', false);
  UPDATE meta_catalog SET species_count = 0 WHERE species_count IS NULL;
  UPDATE meta_catalog SET orphan_count = 0 WHERE orphan_count IS NULL;
  UPDATE meta_catalog SET display_order = 0 WHERE display_order IS NULL;
  PERFORM set_config('app.allow_meta_update', 'false', false);
END $$;

-- ===================================================================
-- VIỆC 2: Orphan functions for 3 meta-rows
-- ===================================================================

-- SPE orphan: species with 0 mapped collections (Điều 19 Side B)
CREATE OR REPLACE FUNCTION fn_refresh_orphan_species()
RETURNS void AS $fn$
BEGIN
  PERFORM set_config('app.allow_meta_update', 'true', true);
  UPDATE meta_catalog SET orphan_count = (
    SELECT COUNT(*) FROM entity_species es
    WHERE NOT EXISTS (
      SELECT 1 FROM species_collection_map scm WHERE scm.species_code = es.species_code
    )
  ), last_scan_date = NOW()
  WHERE code = 'CAT-SPE';
END;
$fn$ LANGUAGE plpgsql;

-- DOT orphan: published/active DOT missing description OR category (Điều 3)
CREATE OR REPLACE FUNCTION fn_refresh_orphan_dot()
RETURNS void AS $fn$
BEGIN
  PERFORM set_config('app.allow_meta_update', 'true', true);
  UPDATE meta_catalog SET orphan_count = (
    SELECT COUNT(*) FROM dot_tools
    WHERE status IN ('active','published')
      AND (description IS NULL OR description = '' OR category IS NULL OR category = '')
  ), last_scan_date = NOW()
  WHERE code = 'CAT-DOT';
END;
$fn$ LANGUAGE plpgsql;

-- COL orphan: Directus collections not registered in collection_registry (Điều 2)
CREATE OR REPLACE FUNCTION fn_refresh_orphan_col()
RETURNS void AS $fn$
BEGIN
  PERFORM set_config('app.allow_meta_update', 'true', true);
  UPDATE meta_catalog SET orphan_count = (
    SELECT COUNT(*) FROM directus_collections dc
    WHERE dc.collection NOT LIKE 'directus_%'
      AND dc.collection NOT IN (SELECT collection_name FROM collection_registry)
  ), last_scan_date = NOW()
  WHERE code = 'CAT-COL';
END;
$fn$ LANGUAGE plpgsql;

-- Triggers for realtime refresh (ĐƯỜNG 1)
DROP TRIGGER IF EXISTS trg_refresh_orphan_species ON entity_species;
CREATE TRIGGER trg_refresh_orphan_species
  AFTER INSERT OR UPDATE OR DELETE ON entity_species
  FOR EACH STATEMENT
  EXECUTE FUNCTION fn_refresh_orphan_species();

-- Note: fn_refresh_orphan_species returns void, wrap in trigger fn
CREATE OR REPLACE FUNCTION trg_fn_refresh_orphan_species()
RETURNS TRIGGER AS $fn$
BEGIN
  PERFORM fn_refresh_orphan_species();
  RETURN NULL;
END;
$fn$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_refresh_orphan_species ON entity_species;
CREATE TRIGGER trg_refresh_orphan_species
  AFTER INSERT OR UPDATE OR DELETE ON entity_species
  FOR EACH STATEMENT
  EXECUTE FUNCTION trg_fn_refresh_orphan_species();

CREATE OR REPLACE FUNCTION trg_fn_refresh_orphan_dot()
RETURNS TRIGGER AS $fn$
BEGIN
  PERFORM fn_refresh_orphan_dot();
  RETURN NULL;
END;
$fn$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_refresh_orphan_dot ON dot_tools;
CREATE TRIGGER trg_refresh_orphan_dot
  AFTER INSERT OR UPDATE OR DELETE ON dot_tools
  FOR EACH STATEMENT
  EXECUTE FUNCTION trg_fn_refresh_orphan_dot();

CREATE OR REPLACE FUNCTION trg_fn_refresh_orphan_col()
RETURNS TRIGGER AS $fn$
BEGIN
  PERFORM fn_refresh_orphan_col();
  RETURN NULL;
END;
$fn$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_refresh_orphan_col ON collection_registry;
CREATE TRIGGER trg_refresh_orphan_col
  AFTER INSERT OR DELETE ON collection_registry
  FOR EACH STATEMENT
  EXECUTE FUNCTION trg_fn_refresh_orphan_col();

-- ===================================================================
-- VIỆC 4: Initial populate
-- ===================================================================
SELECT fn_refresh_orphan_species();
SELECT fn_refresh_orphan_dot();
SELECT fn_refresh_orphan_col();
