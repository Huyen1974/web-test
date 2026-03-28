-- S170B: Mission 2.5 — Register pivot_definitions in Directus + refresh function
-- Điều 26 v3.5 fix kiến trúc: PG → Directus → Nuxt

-- Register pivot_definitions in meta_catalog
INSERT INTO meta_catalog (code, name, name_en, entity_type, source_model, source_location,
  registry_collection, record_count, status, composition_level, identity_class, description, _dot_origin)
VALUES (
  'CAT-024', 'Pivot Definitions', 'Pivot Definitions', 'pivot_definition', 'A', 'PostgreSQL table',
  'pivot_definitions', (SELECT COUNT(*) FROM pivot_definitions), 'active', 'molecule', 'managed',
  'Khai báo pivot counting cho Registries. Mỗi dòng = 1 báo cáo. Điều 26 v3.5.',
  'dot-pivot-declare'
)
ON CONFLICT (code) DO NOTHING;

-- PG function to refresh meta_catalog.record_count from pivot_count()
-- Replaces per-table COUNT(*) loops with single pivot_count() call
CREATE OR REPLACE FUNCTION refresh_meta_catalog_from_pivot()
RETURNS TABLE(cat_code TEXT, old_count INT, new_count BIGINT, changed BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT mc.code AS cat_code, mc.record_count AS old_count, pc.count_value AS new_count
    FROM pivot_count() pc
    JOIN pivot_definitions pd ON pd.code = pc.code
    JOIN meta_catalog mc ON mc.registry_collection = pd.source_object
    WHERE pd.is_active = true
  LOOP
    IF r.old_count IS DISTINCT FROM r.new_count THEN
      -- Re-set guard bypass before each update (fn_refresh_virtual_summaries resets it)
      PERFORM set_config('app.allow_meta_update', 'true', false);
      UPDATE meta_catalog
      SET record_count = r.new_count,
          active_count = r.new_count,
          last_scan_date = NOW()
      WHERE code = r.cat_code;
    END IF;

    cat_code := r.cat_code;
    old_count := r.old_count;
    new_count := r.new_count;
    changed := (r.old_count IS DISTINCT FROM r.new_count);
    RETURN NEXT;
  END LOOP;

  PERFORM set_config('app.allow_meta_update', 'false', false);
END;
$$;
