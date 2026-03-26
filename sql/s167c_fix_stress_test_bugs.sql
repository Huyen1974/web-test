-- S167C: Fix 3 bugs discovered by S167B CRUD stress-test
-- D1: DELETE meta_catalog → v_registry_counts orphan
-- U2: composition_level accepts invalid values
-- R1: measurement_registry not auto-populated

-- ═══════════════════════════════════════
-- FIX D1: DELETE trigger on meta_catalog
-- Cleans up v_registry_counts + counting trigger when meta_catalog entry removed
-- ═══════════════════════════════════════
CREATE OR REPLACE FUNCTION fn_auto_cleanup_on_meta_delete()
RETURNS trigger AS $$
DECLARE
  v_trigger_name text;
BEGIN
  -- 1. Remove v_registry_counts row
  DELETE FROM v_registry_counts WHERE cat_code = OLD.code;

  -- 2. Drop counting trigger if it exists and collection is specific to this entry
  IF OLD.registry_collection IS NOT NULL AND OLD.registry_collection != '' THEN
    v_trigger_name := 'trg_count_' || OLD.registry_collection;
    -- Only drop if no other meta_catalog entry references the same collection
    IF NOT EXISTS (
      SELECT 1 FROM meta_catalog
      WHERE registry_collection = OLD.registry_collection AND code != OLD.code
    ) THEN
      EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I', v_trigger_name, OLD.registry_collection);
    END IF;
  END IF;

  -- 3. Refresh CAT-ALL (bypass guard)
  PERFORM set_config('app.allow_meta_update', 'true', true);
  UPDATE meta_catalog SET
    record_count = (SELECT COALESCE(SUM(record_count), 0) FROM meta_catalog WHERE identity_class = 'managed' AND code != 'CAT-ALL'),
    active_count = (SELECT COALESCE(SUM(active_count), 0) FROM meta_catalog WHERE identity_class = 'managed' AND code != 'CAT-ALL')
  WHERE code = 'CAT-ALL';

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_cleanup_on_meta_delete ON meta_catalog;
CREATE TRIGGER trg_auto_cleanup_on_meta_delete
  AFTER DELETE ON meta_catalog
  FOR EACH ROW
  EXECUTE FUNCTION fn_auto_cleanup_on_meta_delete();

-- ═══════════════════════════════════════
-- FIX U2: CHECK constraint on composition_level
-- ═══════════════════════════════════════
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'chk_composition_level'
  ) THEN
    ALTER TABLE meta_catalog ADD CONSTRAINT chk_composition_level
    CHECK (composition_level IN ('atom', 'molecule', 'compound', 'material', 'product', 'building'));
  END IF;
END $$;

-- ═══════════════════════════════════════
-- FIX R1: Auto-create measurement_registry row
-- Extends fn_auto_create_counting_trigger to also create a basic measurement
-- ═══════════════════════════════════════
CREATE OR REPLACE FUNCTION fn_auto_create_measurement()
RETURNS trigger AS $$
DECLARE
  v_measurement_id text;
BEGIN
  IF NEW.identity_class != 'managed' OR NEW.registry_collection IS NULL OR NEW.registry_collection = '' THEN
    RETURN NEW;
  END IF;

  v_measurement_id := 'MSR-AUTO-' || UPPER(REPLACE(NEW.code, '-', '_'));

  -- Skip if measurement already exists
  IF EXISTS (SELECT 1 FROM measurement_registry WHERE measurement_id = v_measurement_id) THEN
    RETURN NEW;
  END IF;

  -- Skip if table doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = NEW.registry_collection
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO measurement_registry (
    measurement_id, measurement_name, law_code, method,
    source_query, target_type, target_query,
    category, severity, comparison, enabled, auto_generated
  ) VALUES (
    v_measurement_id,
    NEW.name || ' record count > 0',
    'dieu26',
    2,
    format('SELECT record_count FROM meta_catalog WHERE code = %L', NEW.code),
    'pg_query',
    format('SELECT COUNT(*)::integer FROM %I', NEW.registry_collection),
    'consistency',
    'warning',
    'strict_equals',
    true,
    true
  );

  RAISE NOTICE 'Auto-created measurement % for %', v_measurement_id, NEW.code;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_create_measurement ON meta_catalog;
CREATE TRIGGER trg_auto_create_measurement
  AFTER INSERT ON meta_catalog
  FOR EACH ROW
  EXECUTE FUNCTION fn_auto_create_measurement();

-- ═══════════════════════════════════════
-- VERIFY: constraints + triggers exist
-- ═══════════════════════════════════════
SELECT 'chk_composition' as check_name, EXISTS(
  SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'chk_composition_level'
)::text as result;

SELECT 'trg_delete' as check_name, EXISTS(
  SELECT 1 FROM pg_trigger WHERE tgname = 'trg_auto_cleanup_on_meta_delete'
)::text as result;

SELECT 'trg_measurement' as check_name, EXISTS(
  SELECT 1 FROM pg_trigger WHERE tgname = 'trg_auto_create_measurement'
)::text as result;
