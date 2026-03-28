-- S170C: Mission 3 — VIEW Cross-Table (Điều 26 v3.5 §II BT2)
-- pivot_query() extends pivot_count() with GROUP BY / metric support
-- §0-AU: reads group_spec/metric_spec from pivot_definitions. NO hardcode.

-- Fix pivot_count() filter parsing (FOR loop syntax)
CREATE OR REPLACE FUNCTION pivot_count(p_code TEXT DEFAULT NULL)
RETURNS TABLE(code TEXT, name TEXT, source_object TEXT, count_value BIGINT)
LANGUAGE plpgsql AS $$
DECLARE
  r RECORD;
  sql_text TEXT;
  elem JSONB;
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
      FOR elem IN SELECT value FROM jsonb_array_elements(r.filter_spec->'filters')
      LOOP
        IF NOT (elem->>'op' = ANY(allowed_ops)) THEN CONTINUE; END IF;
        CASE elem->>'op'
          WHEN '=','!=','>','<','>=','<=' THEN
            where_clauses := array_append(where_clauses,
              format('%I %s %L', elem->>'field', elem->>'op', elem->>'value'));
          WHEN 'in' THEN
            where_clauses := array_append(where_clauses,
              format('%I = ANY(ARRAY(SELECT jsonb_array_elements_text(%L::jsonb)))', elem->>'field', elem->'value'));
          WHEN 'not_in' THEN
            where_clauses := array_append(where_clauses,
              format('%I != ALL(ARRAY(SELECT jsonb_array_elements_text(%L::jsonb)))', elem->>'field', elem->'value'));
          WHEN 'is_null' THEN
            where_clauses := array_append(where_clauses, format('%I IS NULL', elem->>'field'));
          WHEN 'is_not_null' THEN
            where_clauses := array_append(where_clauses, format('%I IS NOT NULL', elem->>'field'));
          WHEN 'like' THEN
            where_clauses := array_append(where_clauses, format('%I LIKE %L', elem->>'field', elem->>'value'));
          ELSE CONTINUE;
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

-- pivot_query(): GROUP BY + metric support
CREATE OR REPLACE FUNCTION pivot_query(p_code TEXT DEFAULT NULL)
RETURNS TABLE(
  pivot_code TEXT,
  pivot_name TEXT,
  source_object TEXT,
  group_values JSONB,
  metric_values JSONB
)
LANGUAGE plpgsql AS $$
DECLARE
  r RECORD;
  sql_text TEXT;
  elem JSONB;
  gelem JSONB;
  melem JSONB;
  where_clauses TEXT[];
  group_cols TEXT[];
  group_aliases TEXT[];
  metric_exprs TEXT[];
  metric_aliases TEXT[];
  select_parts TEXT[];
  allowed_ops TEXT[] := ARRAY['=','!=','>','<','>=','<=','in','not_in','is_null','is_not_null','like'];
  allowed_funcs TEXT[] := ARRAY['count','sum','avg','min','max'];
  has_groups BOOLEAN;
  json_result JSONB;
  row_elem JSONB;
  gv JSONB;
  mv JSONB;
  cnt BIGINT;
  func_name TEXT;
  field_name TEXT;
  alias_name TEXT;
  i INT;
BEGIN
  FOR r IN
    SELECT pd.code, pd.name, pd.source_object, pd.filter_spec, pd.group_spec, pd.metric_spec
    FROM pivot_definitions pd
    WHERE pd.is_active = true
      AND (p_code IS NULL OR pd.code = p_code)
    ORDER BY pd.display_order
  LOOP
    -- Build WHERE
    where_clauses := ARRAY[]::TEXT[];
    IF r.filter_spec IS NOT NULL AND r.filter_spec->'filters' IS NOT NULL THEN
      FOR elem IN SELECT value FROM jsonb_array_elements(r.filter_spec->'filters')
      LOOP
        IF NOT (elem->>'op' = ANY(allowed_ops)) THEN CONTINUE; END IF;
        CASE elem->>'op'
          WHEN '=','!=','>','<','>=','<=' THEN
            where_clauses := array_append(where_clauses,
              format('%I %s %L', elem->>'field', elem->>'op', elem->>'value'));
          WHEN 'in' THEN
            where_clauses := array_append(where_clauses,
              format('%I = ANY(ARRAY(SELECT jsonb_array_elements_text(%L::jsonb)))', elem->>'field', elem->'value'));
          WHEN 'not_in' THEN
            where_clauses := array_append(where_clauses,
              format('%I != ALL(ARRAY(SELECT jsonb_array_elements_text(%L::jsonb)))', elem->>'field', elem->'value'));
          WHEN 'is_null' THEN
            where_clauses := array_append(where_clauses, format('%I IS NULL', elem->>'field'));
          WHEN 'is_not_null' THEN
            where_clauses := array_append(where_clauses, format('%I IS NOT NULL', elem->>'field'));
          WHEN 'like' THEN
            where_clauses := array_append(where_clauses, format('%I LIKE %L', elem->>'field', elem->>'value'));
          ELSE CONTINUE;
        END CASE;
      END LOOP;
    END IF;

    -- Build GROUP BY
    group_cols := ARRAY[]::TEXT[];
    group_aliases := ARRAY[]::TEXT[];
    has_groups := false;
    IF r.group_spec IS NOT NULL AND jsonb_array_length(COALESCE(r.group_spec->'groups', '[]'::jsonb)) > 0 THEN
      has_groups := true;
      FOR gelem IN SELECT value FROM jsonb_array_elements(r.group_spec->'groups')
      LOOP
        group_cols := array_append(group_cols, format('%I', gelem->>'field'));
        group_aliases := array_append(group_aliases, COALESCE(gelem->>'alias', gelem->>'field'));
      END LOOP;
    END IF;

    -- Build metrics
    metric_exprs := ARRAY[]::TEXT[];
    metric_aliases := ARRAY[]::TEXT[];
    IF r.metric_spec IS NOT NULL AND jsonb_array_length(COALESCE(r.metric_spec->'metrics', '[]'::jsonb)) > 0 THEN
      FOR melem IN SELECT value FROM jsonb_array_elements(r.metric_spec->'metrics')
      LOOP
        func_name := lower(COALESCE(melem->>'func', melem->>'op', 'count'));
        field_name := COALESCE(melem->>'field', '*');
        alias_name := COALESCE(melem->>'alias', func_name);
        IF NOT (func_name = ANY(allowed_funcs)) THEN CONTINUE; END IF;
        IF field_name = '*' THEN
          metric_exprs := array_append(metric_exprs, format('%s(*)', func_name));
        ELSE
          metric_exprs := array_append(metric_exprs, format('%s(%I)', func_name, field_name));
        END IF;
        metric_aliases := array_append(metric_aliases, alias_name);
      END LOOP;
    END IF;
    IF array_length(metric_exprs, 1) IS NULL THEN
      metric_exprs := ARRAY['count(*)'];
      metric_aliases := ARRAY['count'];
    END IF;

    IF has_groups THEN
      select_parts := ARRAY[]::TEXT[];
      FOR i IN 1..array_length(group_cols, 1) LOOP
        select_parts := array_append(select_parts, format('%s AS %I', group_cols[i], group_aliases[i]));
      END LOOP;
      FOR i IN 1..array_length(metric_exprs, 1) LOOP
        select_parts := array_append(select_parts, format('%s AS %I', metric_exprs[i], metric_aliases[i]));
      END LOOP;

      sql_text := format('SELECT %s FROM %I', array_to_string(select_parts, ', '), r.source_object);
      IF array_length(where_clauses, 1) > 0 THEN
        sql_text := sql_text || ' WHERE ' || array_to_string(where_clauses, ' AND ');
      END IF;
      sql_text := sql_text || ' GROUP BY ' || array_to_string(group_cols, ', ');

      sql_text := format('SELECT jsonb_agg(row_to_json(sub)::jsonb) FROM (%s) sub', sql_text);

      EXECUTE sql_text INTO json_result;
      IF json_result IS NOT NULL THEN
        FOR row_elem IN SELECT value FROM jsonb_array_elements(json_result)
        LOOP
          gv := '{}'::jsonb;
          FOR i IN 1..array_length(group_aliases, 1) LOOP
            gv := gv || jsonb_build_object(group_aliases[i], row_elem->group_aliases[i]);
          END LOOP;
          mv := '{}'::jsonb;
          FOR i IN 1..array_length(metric_aliases, 1) LOOP
            mv := mv || jsonb_build_object(metric_aliases[i], row_elem->metric_aliases[i]);
          END LOOP;
          pivot_code := r.code;
          pivot_name := r.name;
          source_object := r.source_object;
          group_values := gv;
          metric_values := mv;
          RETURN NEXT;
        END LOOP;
      END IF;
    ELSE
      sql_text := format('SELECT count(*) FROM %I', r.source_object);
      IF array_length(where_clauses, 1) > 0 THEN
        sql_text := sql_text || ' WHERE ' || array_to_string(where_clauses, ' AND ');
      END IF;
      EXECUTE sql_text INTO cnt;
      pivot_code := r.code;
      pivot_name := r.name;
      source_object := r.source_object;
      group_values := '{}'::jsonb;
      metric_values := jsonb_build_object('count', cnt);
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$;

-- Seed cross-table pivot_definitions (field-verified before INSERT)
DO $$
BEGIN
  -- PIV-101: meta_catalog by composition_level
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='meta_catalog' AND column_name='composition_level') THEN
    INSERT INTO pivot_definitions (code, name, source_object, filter_spec, group_spec, metric_spec, registry_group, composition_level, display_order, is_active)
    VALUES ('PIV-101', 'Danh mục theo Lớp', 'meta_catalog',
      '{"filters":[{"field":"status","op":"=","value":"active"}]}',
      '{"groups":[{"field":"composition_level","alias":"level"}]}',
      '{"metrics":[{"func":"count","field":"*","alias":"total"}]}',
      'cross-table', 'molecule', 101, true) ON CONFLICT (code) DO NOTHING;
  END IF;

  -- PIV-102: meta_catalog by identity_class
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='meta_catalog' AND column_name='identity_class') THEN
    INSERT INTO pivot_definitions (code, name, source_object, filter_spec, group_spec, metric_spec, registry_group, composition_level, display_order, is_active)
    VALUES ('PIV-102', 'Danh mục theo Loại quản lý', 'meta_catalog',
      '{"filters":[{"field":"status","op":"=","value":"active"}]}',
      '{"groups":[{"field":"identity_class","alias":"identity"}]}',
      '{"metrics":[{"func":"count","field":"*","alias":"total"}]}',
      'cross-table', 'molecule', 102, true) ON CONFLICT (code) DO NOTHING;
  END IF;

  -- PIV-103: entity_species by composition_level
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='entity_species' AND column_name='composition_level') THEN
    INSERT INTO pivot_definitions (code, name, source_object, filter_spec, group_spec, metric_spec, registry_group, composition_level, display_order, is_active)
    VALUES ('PIV-103', 'Loài theo Lớp', 'entity_species',
      '{"filters":[]}',
      '{"groups":[{"field":"composition_level","alias":"level"}]}',
      '{"metrics":[{"func":"count","field":"*","alias":"total"}]}',
      'cross-table', 'atom', 103, true) ON CONFLICT (code) DO NOTHING;
  END IF;

  -- PIV-104: dot_tools by category
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='dot_tools' AND column_name='category') THEN
    INSERT INTO pivot_definitions (code, name, source_object, filter_spec, group_spec, metric_spec, registry_group, composition_level, display_order, is_active)
    VALUES ('PIV-104', 'DOT Tools theo Nhóm', 'dot_tools',
      '{"filters":[{"field":"status","op":"=","value":"published"}]}',
      '{"groups":[{"field":"category","alias":"category"}]}',
      '{"metrics":[{"func":"count","field":"*","alias":"total"}]}',
      'cross-table', 'atom', 104, true) ON CONFLICT (code) DO NOTHING;
  END IF;

  -- PIV-105: collection_registry by classification
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='collection_registry' AND column_name='classification') THEN
    INSERT INTO pivot_definitions (code, name, source_object, filter_spec, group_spec, metric_spec, registry_group, composition_level, display_order, is_active)
    VALUES ('PIV-105', 'Collections theo Phân loại', 'collection_registry',
      '{"filters":[]}',
      '{"groups":[{"field":"classification","alias":"classification"}]}',
      '{"metrics":[{"func":"count","field":"*","alias":"total"}]}',
      'cross-table', 'molecule', 105, true) ON CONFLICT (code) DO NOTHING;
  END IF;

  -- PIV-106: meta_catalog by level × identity (2-dimensional)
  INSERT INTO pivot_definitions (code, name, source_object, filter_spec, group_spec, metric_spec, registry_group, composition_level, display_order, is_active)
  VALUES ('PIV-106', 'Danh mục: Lớp × Loại quản lý', 'meta_catalog',
    '{"filters":[{"field":"status","op":"=","value":"active"}]}',
    '{"groups":[{"field":"composition_level","alias":"level"},{"field":"identity_class","alias":"identity"}]}',
    '{"metrics":[{"func":"count","field":"*","alias":"total"}]}',
    'cross-table', 'molecule', 106, true) ON CONFLICT (code) DO NOTHING;
END;
$$;

-- Warm-tier VIEWs
CREATE OR REPLACE VIEW v_pivot_by_level AS
SELECT mc.composition_level AS level, COUNT(*) AS total, SUM(mc.record_count) AS total_records
FROM meta_catalog mc WHERE mc.status = 'active' AND mc.registry_collection IS NOT NULL
GROUP BY mc.composition_level ORDER BY mc.composition_level;

CREATE OR REPLACE VIEW v_pivot_species_by_level AS
SELECT es.composition_level AS level, COUNT(*) AS total
FROM entity_species es GROUP BY es.composition_level ORDER BY es.composition_level;

CREATE OR REPLACE VIEW v_pivot_dot_by_category AS
SELECT COALESCE(dt.category, 'uncategorized') AS category, COUNT(*) AS total
FROM dot_tools dt WHERE dt.status = 'published'
GROUP BY dt.category ORDER BY dt.category;
