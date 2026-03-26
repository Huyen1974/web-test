-- S169B: Fix C1 regression + scanner blind spots
-- Fix 1: fn_validate_dot_origin — whitelist BEFORE pipe check (O1, E1)
-- Fix 2: verify_counts() — detect phantom + NULL registry (P1, O3)

BEGIN;

-- ═══════════════════════════════════════════════════════════════
-- FIX 1: fn_validate_dot_origin — whitelist check BEFORE pipe parse
-- Root cause: S168 set DEFAULT 'DIRECTUS' but fn_validate_dot_origin
-- tries split_part('DIRECTUS', '|', 1) → 'DIRECTUS' not in dot_tools → SUSPECT
-- Fix: Check whitelist first, skip pipe validation for known prefixes
-- TODO TD-411: move whitelist to dot_origin_whitelist table for full meta-driven approach
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION fn_validate_dot_origin()
  RETURNS trigger
  LANGUAGE plpgsql
AS $function$
DECLARE
  dot_code text;
  -- TODO TD-411: move to dot_origin_whitelist table for meta-driven whitelist
  _whitelist constant text[] := ARRAY['DIRECTUS', 'LEGACY', 'MIGRATION'];
BEGIN
  -- Skip if _dot_origin is NULL (legacy record, allowed)
  IF NEW._dot_origin IS NULL THEN
    RETURN NEW;
  END IF;

  -- Whitelist: known non-pipe origins — skip pipe format check
  -- TODO TD-411: replace with SELECT FROM dot_origin_whitelist table
  IF NEW._dot_origin = ANY(_whitelist) THEN
    RETURN NEW;
  END IF;

  -- Skip if already marked SUSPECT
  IF NEW._dot_origin LIKE 'SUSPECT:%' THEN
    RETURN NEW;
  END IF;

  -- Extract DOT code (part before first '|')
  dot_code := split_part(NEW._dot_origin, '|', 1);

  -- Check DOT code exists in dot_tools
  IF NOT EXISTS (SELECT 1 FROM dot_tools WHERE code = dot_code) THEN
    NEW._dot_origin := 'SUSPECT:' || NEW._dot_origin;
  END IF;

  RETURN NEW;
END;
$function$;

-- ═══════════════════════════════════════════════════════════════
-- FIX 2: verify_counts() — detect phantom + NULL registry entries
-- Root cause: meta_catalog with non-existent registry_collection (phantom)
-- or NULL registry_collection silently excluded from verify_counts loop
-- Fix: Dynamic checks using pg_tables + meta_catalog (no hardcoded table names)
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION verify_counts()
RETURNS TABLE(
  cat_code text,
  collection_name text,
  stored_record bigint,
  live_record bigint,
  stored_orphan bigint,
  live_orphan bigint,
  status text
) LANGUAGE plpgsql AS $$
DECLARE
  r RECORD;
  tbl text;
  cc text;
  lr bigint;
  lo bigint;
  has_dot_origin boolean;
  has_code_col boolean;
BEGIN
  -- Main loop: existing verify logic
  FOR r IN
    SELECT vrc.cat_code AS vcat, mc.registry_collection, vrc.code_column,
           vrc.record_count AS sr, vrc.orphan_count AS so
    FROM v_registry_counts vrc
    JOIN meta_catalog mc ON mc.code = vrc.cat_code
    WHERE mc.registry_collection IS NOT NULL
      AND mc.registry_collection != ''
      AND mc.registry_collection != '_uncategorized'
      AND to_regclass('public.' || mc.registry_collection) IS NOT NULL
  LOOP
    tbl := r.registry_collection;
    cc := r.code_column;
    EXECUTE format('SELECT count(*) FROM %I', tbl) INTO lr;

    SELECT EXISTS(
      SELECT 1 FROM information_schema.columns
      WHERE table_name = tbl AND column_name = '_dot_origin'
    ) INTO has_dot_origin;

    IF has_dot_origin THEN
      EXECUTE format(
        'SELECT count(*) FROM %I WHERE _dot_origin IS NULL OR _dot_origin LIKE ''SUSPECT:%%''',
        tbl
      ) INTO lo;
    ELSE
      SELECT EXISTS(
        SELECT 1 FROM information_schema.columns
        WHERE table_name = tbl AND column_name = cc
      ) INTO has_code_col;

      IF has_code_col THEN
        EXECUTE format(
          'SELECT count(*) FROM %I WHERE %I IS NULL OR btrim(%I) = ''''',
          tbl, cc, cc
        ) INTO lo;
      ELSE
        lo := 0;
      END IF;
    END IF;

    cat_code := r.vcat;
    collection_name := tbl;
    stored_record := r.sr;
    live_record := lr;
    stored_orphan := r.so;
    live_orphan := lo;
    IF r.sr = lr AND r.so = lo THEN
      status := 'OK';
    ELSE
      status := 'MISMATCH';
    END IF;
    RETURN NEXT;
  END LOOP;

  -- PHANTOM CHECK: managed meta_catalog points to table NOT in pg_tables (dynamic)
  FOR r IN
    SELECT mc.code AS vcat, mc.registry_collection
    FROM meta_catalog mc
    WHERE mc.identity_class = 'managed'
      AND mc.registry_collection IS NOT NULL
      AND mc.registry_collection != ''
      AND mc.registry_collection != '_uncategorized'
      AND mc.registry_collection NOT IN (
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'
      )
  LOOP
    cat_code := r.vcat;
    collection_name := r.registry_collection;
    stored_record := 0;
    live_record := 0;
    stored_orphan := 0;
    live_orphan := 0;
    status := 'PHANTOM';
    RETURN NEXT;
  END LOOP;

  -- NULL REGISTRY CHECK: managed meta_catalog with NULL/empty registry_collection (dynamic)
  FOR r IN
    SELECT mc.code AS vcat
    FROM meta_catalog mc
    WHERE mc.identity_class = 'managed'
      AND (mc.registry_collection IS NULL OR mc.registry_collection = '')
  LOOP
    cat_code := r.vcat;
    collection_name := '(null)';
    stored_record := 0;
    live_record := 0;
    stored_orphan := 0;
    live_orphan := 0;
    status := 'NULL_REGISTRY';
    RETURN NEXT;
  END LOOP;
END;
$$;

COMMIT;
