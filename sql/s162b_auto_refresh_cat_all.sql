-- S162B: Auto-refresh CAT-ALL when any managed meta_catalog record_count changes
-- Root cause: CAT-ALL only updated during deploy step. If data changes between
-- deploys → CI contract check sees drift → FAIL → no deploy → stuck loop.
--
-- Fix: PG trigger on meta_catalog AFTER UPDATE that recalculates CAT-ALL
-- whenever a managed collection's record_count or active_count changes.
-- Bypasses S129-A guard via session variable (same pattern as deploy step).

-- ═══════════════════════════════════════
-- FUNCTION: fn_refresh_cat_all()
-- ═══════════════════════════════════════
CREATE OR REPLACE FUNCTION fn_refresh_cat_all()
RETURNS trigger AS $$
DECLARE
  v_new_record_count integer;
  v_new_active_count integer;
BEGIN
  -- Only fire for managed collections (not CAT-ALL itself, not log, not virtual)
  IF NEW.identity_class != 'managed' THEN
    RETURN NEW;
  END IF;
  -- Skip if code is CAT-ALL (prevent infinite loop)
  IF NEW.code = 'CAT-ALL' THEN
    RETURN NEW;
  END IF;
  -- Skip if record_count and active_count didn't actually change
  IF OLD.record_count IS NOT DISTINCT FROM NEW.record_count
     AND OLD.active_count IS NOT DISTINCT FROM NEW.active_count THEN
    RETURN NEW;
  END IF;

  -- Bypass S129-A guard for this transaction
  PERFORM set_config('app.allow_meta_update', 'true', true);

  -- Recalculate CAT-ALL totals from all managed collections
  SELECT
    COALESCE(SUM(record_count), 0),
    COALESCE(SUM(active_count), 0)
  INTO v_new_record_count, v_new_active_count
  FROM meta_catalog
  WHERE identity_class = 'managed'
    AND code != 'CAT-ALL';

  -- Update CAT-ALL
  UPDATE meta_catalog
  SET record_count = v_new_record_count,
      active_count = v_new_active_count,
      last_scan_date = NOW()
  WHERE code = 'CAT-ALL';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════
-- TRIGGER: trg_refresh_cat_all
-- ═══════════════════════════════════════
DROP TRIGGER IF EXISTS trg_refresh_cat_all ON meta_catalog;
CREATE TRIGGER trg_refresh_cat_all
  AFTER UPDATE ON meta_catalog
  FOR EACH ROW
  EXECUTE FUNCTION fn_refresh_cat_all();

-- ═══════════════════════════════════════
-- ONE-TIME: Sync CAT-ALL now (in case it's currently stale)
-- ═══════════════════════════════════════
SELECT set_config('app.allow_meta_update', 'true', true);
UPDATE meta_catalog
SET record_count = (
  SELECT COALESCE(SUM(record_count), 0)
  FROM meta_catalog
  WHERE identity_class = 'managed' AND code != 'CAT-ALL'
),
active_count = (
  SELECT COALESCE(SUM(active_count), 0)
  FROM meta_catalog
  WHERE identity_class = 'managed' AND code != 'CAT-ALL'
),
last_scan_date = NOW()
WHERE code = 'CAT-ALL';

-- Verify
SELECT code, record_count, active_count, last_scan_date
FROM meta_catalog WHERE code = 'CAT-ALL';

SELECT SUM(record_count) AS managed_sum
FROM meta_catalog
WHERE identity_class = 'managed' AND code != 'CAT-ALL';
