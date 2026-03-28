-- S170: Mission 1 — Pivot CHẠY (Điều 26 v3.5)
-- Creates pivot_definitions table + pivot_count() function
-- Replaces 17+ counting triggers with dynamic, meta-driven counting
-- §0-AU: NO HARDCODE — reads from meta_catalog

-- Step 2a: CREATE TABLE pivot_definitions
CREATE TABLE IF NOT EXISTS pivot_definitions (
  id SERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  source_object TEXT NOT NULL,
  filter_spec JSONB DEFAULT '{"filters":[]}',
  group_spec JSONB DEFAULT '{"groups":[]}',
  metric_spec JSONB DEFAULT '{"metrics":[{"op":"count"}]}',
  registry_group TEXT,
  composition_level TEXT DEFAULT 'atom',
  species TEXT,
  parent_code TEXT,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  cache_tier TEXT DEFAULT 'cold',
  superseded_by TEXT,
  normalized_signature TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pivot_def_group ON pivot_definitions(registry_group);
CREATE INDEX IF NOT EXISTS idx_pivot_def_active ON pivot_definitions(is_active) WHERE is_active = true;

-- Step 2b: CREATE FUNCTION pivot_count()
CREATE OR REPLACE FUNCTION pivot_count(p_code TEXT DEFAULT NULL)
RETURNS TABLE(code TEXT, name TEXT, source_object TEXT, count_value BIGINT)
LANGUAGE plpgsql AS $$
DECLARE
  r RECORD;
  sql_text TEXT;
  f RECORD;
  where_clauses TEXT[];
  allowed_ops TEXT[] := ARRAY['=','!=','>','<','>=','<=','in','not_in','is_null','is_not_null','like'];
BEGIN
  FOR r IN
    SELECT pd.code, pd.name, pd.source_object, pd.filter_spec
    FROM pivot_definitions pd
    WHERE pd.is_active = true
      AND (p_code IS NULL OR pd.code = p_code)
    ORDER BY pd.display_order
  LOOP
    where_clauses := ARRAY[]::TEXT[];

    IF r.filter_spec IS NOT NULL AND r.filter_spec->'filters' IS NOT NULL THEN
      FOR f IN SELECT * FROM jsonb_array_elements(r.filter_spec->'filters') AS elem
      LOOP
        IF NOT (f.elem->>'op' = ANY(allowed_ops)) THEN
          CONTINUE;
        END IF;

        CASE f.elem->>'op'
          WHEN '=', '!=', '>', '<', '>=', '<=' THEN
            where_clauses := array_append(where_clauses,
              format('%I %s %L', f.elem->>'field', f.elem->>'op', f.elem->>'value'));
          WHEN 'in' THEN
            where_clauses := array_append(where_clauses,
              format('%I = ANY(ARRAY(SELECT jsonb_array_elements_text(%L::jsonb)))',
                f.elem->>'field', f.elem->'value'));
          WHEN 'not_in' THEN
            where_clauses := array_append(where_clauses,
              format('%I != ALL(ARRAY(SELECT jsonb_array_elements_text(%L::jsonb)))',
                f.elem->>'field', f.elem->'value'));
          WHEN 'is_null' THEN
            where_clauses := array_append(where_clauses,
              format('%I IS NULL', f.elem->>'field'));
          WHEN 'is_not_null' THEN
            where_clauses := array_append(where_clauses,
              format('%I IS NOT NULL', f.elem->>'field'));
          WHEN 'like' THEN
            where_clauses := array_append(where_clauses,
              format('%I LIKE %L', f.elem->>'field', f.elem->>'value'));
          ELSE
            CONTINUE;
        END CASE;
      END LOOP;
    END IF;

    sql_text := format('SELECT COUNT(*) FROM %I', r.source_object);
    IF array_length(where_clauses, 1) > 0 THEN
      sql_text := sql_text || ' WHERE ' || array_to_string(where_clauses, ' AND ');
    END IF;

    code := r.code;
    name := r.name;
    source_object := r.source_object;
    EXECUTE sql_text INTO count_value;
    RETURN NEXT;
  END LOOP;
END;
$$;

-- Step 2c: SEED from meta_catalog (§0-AU: derives from meta_catalog, NO hardcode)
INSERT INTO pivot_definitions (code, name, source_object, filter_spec, registry_group, composition_level, display_order)
SELECT
  'PIV-' || LPAD(ROW_NUMBER() OVER (ORDER BY mc.code)::TEXT, 3, '0'),
  mc.name || ' — Total',
  mc.registry_collection,
  '{"filters":[]}',
  COALESCE(mc.atom_group, 'default'),
  COALESCE(mc.composition_level, 'atom'),
  ROW_NUMBER() OVER (ORDER BY mc.code)
FROM meta_catalog mc
WHERE mc.registry_collection IS NOT NULL
  AND mc.status = 'active'
ON CONFLICT (code) DO NOTHING;

-- Deactivate _uncategorized (virtual, no real table)
UPDATE pivot_definitions SET is_active = false WHERE source_object = '_uncategorized';

-- Step 3: #DISABLE counting triggers
-- #DISABLED-D26v3: replaced by pivot_count() [2026-03-28]
-- Disable all trg_count_* triggers
DO $$
DECLARE
  t RECORD;
BEGIN
  FOR t IN
    SELECT tgname, relname
    FROM pg_trigger
    JOIN pg_class ON pg_class.oid = tgrelid
    WHERE tgname LIKE 'trg_count_%'
      AND NOT tgisinternal
  LOOP
    EXECUTE format('ALTER TABLE %I DISABLE TRIGGER %I', t.relname, t.tgname);
    RAISE NOTICE '#DISABLED-D26v3: % on %', t.tgname, t.relname;
  END LOOP;
END;
$$;

-- #DISABLED-D26v3: refresh_registry_counts() body replaced
CREATE OR REPLACE FUNCTION refresh_registry_counts()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  -- #DISABLED-D26v3: replaced by pivot_count() [2026-03-28]
  RETURN;
END;
$$;

-- Backward compat alias view (Gemini R2 recommendation)
CREATE OR REPLACE VIEW v_registry_counts_compat AS
SELECT
  pd.code AS cat_code,
  pd.name AS entity_type,
  pc.count_value AS record_count,
  pc.count_value AS active_count,
  0::BIGINT AS orphan_count,
  0::BIGINT AS prev_count,
  pd.composition_level
FROM pivot_definitions pd
JOIN LATERAL (SELECT * FROM pivot_count(pd.code)) pc ON true
WHERE pd.is_active = true;
