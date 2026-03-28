-- S170D: Mission 3.5 — Automation Hardening (§0-AI Compliance)
-- DUAL-TRIGGER: cron + on-demand for all automation features

-- Fix refresh_meta_catalog_from_pivot() to only use total (unfiltered/ungrouped) pivots
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
      AND pd.filter_spec = '{"filters":[]}'::jsonb
      AND pd.group_spec = '{"groups":[]}'::jsonb
  LOOP
    IF r.old_count IS DISTINCT FROM r.new_count THEN
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

-- A3: PG trigger on pivot_definitions → auto refresh meta_catalog
CREATE OR REPLACE FUNCTION trg_pivot_def_refresh()
RETURNS trigger AS $$
BEGIN
  PERFORM refresh_meta_catalog_from_pivot();
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_after_pivot_definitions_change ON pivot_definitions;
CREATE TRIGGER trg_after_pivot_definitions_change
  AFTER INSERT OR UPDATE OR DELETE ON pivot_definitions
  FOR EACH STATEMENT
  EXECUTE FUNCTION trg_pivot_def_refresh();

-- Crontab entries (for reference, applied via VPS crontab -e):
-- */10 * * * * cd /opt/incomex/docker && docker exec postgres psql -U directus -d directus -c "SELECT refresh_meta_catalog_from_pivot();" >> /var/log/incomex/pivot-refresh.log 2>&1
-- 0 4 * * * cd /opt/incomex/deploys/web-test && dot/bin/dot-pivot-health >> /var/log/incomex/pivot-health.log 2>&1
