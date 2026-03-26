-- S167: Auto-expansion for Điều 31
-- Goal: INSERT into meta_catalog → everything auto-expands
-- 1. Auto-create counting trigger on new managed collections
-- 2. Auto-sync v_registry_counts from meta_catalog

-- ═══════════════════════════════════════
-- FUNCTION: auto_create_counting_trigger()
-- Called AFTER INSERT on meta_catalog for managed collections.
-- Checks if registry_collection has a counting trigger; creates one if missing.
-- ═══════════════════════════════════════
CREATE OR REPLACE FUNCTION fn_auto_create_counting_trigger()
RETURNS trigger AS $$
DECLARE
  v_collection text;
  v_trigger_name text;
  v_exists boolean;
BEGIN
  -- Only act on managed collections with a registry_collection
  IF NEW.identity_class != 'managed' OR NEW.registry_collection IS NULL OR NEW.registry_collection = '' THEN
    RETURN NEW;
  END IF;

  v_collection := NEW.registry_collection;
  v_trigger_name := 'trg_count_' || v_collection;

  -- Check if table exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = v_collection
  ) THEN
    RAISE NOTICE 'Table % does not exist, skipping trigger creation', v_collection;
    RETURN NEW;
  END IF;

  -- Check if trigger already exists
  SELECT EXISTS(
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    WHERE t.tgname = v_trigger_name AND c.relname = v_collection
  ) INTO v_exists;

  IF v_exists THEN
    RAISE NOTICE 'Trigger % already exists on %, skipping', v_trigger_name, v_collection;
    RETURN NEW;
  END IF;

  -- Ensure generic counting function exists
  -- (update_record_count already created by s134_m5b)

  -- Create the counting trigger
  EXECUTE format(
    'CREATE TRIGGER %I AFTER INSERT OR DELETE ON %I FOR EACH STATEMENT EXECUTE FUNCTION update_record_count()',
    v_trigger_name, v_collection
  );

  RAISE NOTICE 'Auto-created counting trigger % on %', v_trigger_name, v_collection;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: fires AFTER INSERT on meta_catalog
DROP TRIGGER IF EXISTS trg_auto_create_counting ON meta_catalog;
CREATE TRIGGER trg_auto_create_counting
  AFTER INSERT ON meta_catalog
  FOR EACH ROW
  EXECUTE FUNCTION fn_auto_create_counting_trigger();

-- ═══════════════════════════════════════
-- FUNCTION: auto_sync_v_registry_counts()
-- Ensures v_registry_counts has a row for every managed meta_catalog entry.
-- Called AFTER INSERT on meta_catalog.
-- ═══════════════════════════════════════
CREATE OR REPLACE FUNCTION fn_auto_sync_v_registry_counts()
RETURNS trigger AS $$
BEGIN
  IF NEW.identity_class != 'managed' OR NEW.code IS NULL THEN
    RETURN NEW;
  END IF;

  -- Insert into v_registry_counts if not exists
  IF NOT EXISTS (SELECT 1 FROM v_registry_counts WHERE cat_code = NEW.code) THEN
    INSERT INTO v_registry_counts (cat_code, entity_type, record_count, orphan_count, composition_level, code_column, prev_count, count_b, count_c, cross_check, active_count)
    VALUES (
      NEW.code,
      COALESCE(NEW.entity_type, ''),
      COALESCE(NEW.record_count, 0),
      COALESCE(NEW.orphan_count, 0),
      COALESCE(NEW.composition_level, ''),
      'code',
      0,
      COALESCE(NEW.record_count, 0),
      0,
      'NEW',
      COALESCE(NEW.active_count, 0)
    );
    RAISE NOTICE 'Auto-added % to v_registry_counts', NEW.code;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_sync_registry_counts ON meta_catalog;
CREATE TRIGGER trg_auto_sync_registry_counts
  AFTER INSERT ON meta_catalog
  FOR EACH ROW
  EXECUTE FUNCTION fn_auto_sync_v_registry_counts();

-- ═══════════════════════════════════════
-- VERIFY: Check existing gaps (managed entries without v_registry_counts rows)
-- ═══════════════════════════════════════
SELECT mc.code, mc.registry_collection,
  CASE WHEN vr.cat_code IS NULL THEN 'MISSING' ELSE 'OK' END as v_reg_status,
  CASE WHEN t.tgname IS NULL THEN 'MISSING' ELSE 'OK' END as trigger_status
FROM meta_catalog mc
LEFT JOIN v_registry_counts vr ON vr.cat_code = mc.code
LEFT JOIN pg_trigger t ON t.tgname = 'trg_count_' || mc.registry_collection
  AND t.tgrelid = (SELECT oid FROM pg_class WHERE relname = mc.registry_collection LIMIT 1)
WHERE mc.identity_class = 'managed' AND mc.registry_collection IS NOT NULL AND mc.registry_collection != ''
ORDER BY mc.code;
