-- S146-M4b: Fix virtual summaries — CAT-ALL = atoms only + status='active'
-- Blocker 1: fn_refresh_virtual_summaries + fn_refresh_cat_all tính sai
-- Root cause:
--   1. fn_refresh_virtual_summaries SUM tất cả managed (không filter status='active', không filter composition_level cho CAT-ALL)
--   2. fn_refresh_cat_all SUM tất cả managed (không filter status='active', không filter by level)
-- Fix: Mỗi virtual row (CAT-ALL/MOL/CMP/MAT/PRD/BLD) chỉ SUM managed + active + đúng level

-- FIX 1: fn_refresh_cat_all — targeted update per composition_level
CREATE OR REPLACE FUNCTION fn_refresh_cat_all()
RETURNS TRIGGER AS $fn$
DECLARE
  v_new_record_count integer;
  v_new_active_count integer;
  v_level text;
  v_cat_code text;
BEGIN
  IF NEW.identity_class != 'managed' THEN RETURN NEW; END IF;
  IF NEW.code IN ('CAT-ALL','CAT-MOL','CAT-CMP','CAT-MAT','CAT-PRD','CAT-BLD') THEN RETURN NEW; END IF;
  IF OLD.record_count IS NOT DISTINCT FROM NEW.record_count
     AND OLD.active_count IS NOT DISTINCT FROM NEW.active_count THEN
    RETURN NEW;
  END IF;

  PERFORM set_config('app.allow_meta_update', 'true', true);

  v_level := NEW.composition_level;
  v_cat_code := CASE v_level
    WHEN 'atom' THEN 'CAT-ALL'
    WHEN 'molecule' THEN 'CAT-MOL'
    WHEN 'compound' THEN 'CAT-CMP'
    WHEN 'material' THEN 'CAT-MAT'
    WHEN 'product' THEN 'CAT-PRD'
    WHEN 'building' THEN 'CAT-BLD'
    ELSE NULL
  END;

  IF v_cat_code IS NOT NULL THEN
    SELECT COALESCE(SUM(record_count), 0), COALESCE(SUM(active_count), 0)
    INTO v_new_record_count, v_new_active_count
    FROM meta_catalog
    WHERE identity_class = 'managed' AND status = 'active' AND composition_level = v_level;

    UPDATE meta_catalog
    SET record_count = v_new_record_count, active_count = v_new_active_count, last_scan_date = NOW()
    WHERE code = v_cat_code;
  END IF;

  RETURN NEW;
END;
$fn$ LANGUAGE plpgsql;

-- FIX 2: fn_refresh_virtual_summaries — add status='active' + composition_level filter
CREATE OR REPLACE FUNCTION fn_refresh_virtual_summaries()
RETURNS TRIGGER AS $fn$
BEGIN
  IF NEW.identity_class != 'managed' THEN RETURN NEW; END IF;
  IF OLD.record_count = NEW.record_count
     AND (OLD.active_count IS NOT DISTINCT FROM NEW.active_count) THEN
    RETURN NEW;
  END IF;
  IF pg_trigger_depth() > 2 THEN RETURN NEW; END IF;

  PERFORM set_config('app.allow_meta_update', 'true', true);

  UPDATE meta_catalog SET record_count = (
    SELECT COALESCE(SUM(mc2.record_count), 0) FROM meta_catalog mc2
    WHERE mc2.identity_class = 'managed' AND mc2.status = 'active' AND mc2.composition_level = 'atom'
  ), active_count = (
    SELECT COALESCE(SUM(mc2.record_count), 0) FROM meta_catalog mc2
    WHERE mc2.identity_class = 'managed' AND mc2.status = 'active' AND mc2.composition_level = 'atom'
  ) WHERE code = 'CAT-ALL';

  UPDATE meta_catalog SET record_count = (
    SELECT COALESCE(SUM(mc2.record_count), 0) FROM meta_catalog mc2
    WHERE mc2.identity_class = 'managed' AND mc2.status = 'active' AND mc2.composition_level = 'molecule'
  ), active_count = (
    SELECT COALESCE(SUM(mc2.record_count), 0) FROM meta_catalog mc2
    WHERE mc2.identity_class = 'managed' AND mc2.status = 'active' AND mc2.composition_level = 'molecule'
  ) WHERE code = 'CAT-MOL';

  UPDATE meta_catalog SET record_count = (
    SELECT COALESCE(SUM(mc2.record_count), 0) FROM meta_catalog mc2
    WHERE mc2.identity_class = 'managed' AND mc2.status = 'active' AND mc2.composition_level = 'compound'
  ), active_count = (
    SELECT COALESCE(SUM(mc2.record_count), 0) FROM meta_catalog mc2
    WHERE mc2.identity_class = 'managed' AND mc2.status = 'active' AND mc2.composition_level = 'compound'
  ) WHERE code = 'CAT-CMP';

  UPDATE meta_catalog SET record_count = (
    SELECT COALESCE(SUM(mc2.record_count), 0) FROM meta_catalog mc2
    WHERE mc2.identity_class = 'managed' AND mc2.status = 'active' AND mc2.composition_level = 'material'
  ), active_count = (
    SELECT COALESCE(SUM(mc2.record_count), 0) FROM meta_catalog mc2
    WHERE mc2.identity_class = 'managed' AND mc2.status = 'active' AND mc2.composition_level = 'material'
  ) WHERE code = 'CAT-MAT';

  UPDATE meta_catalog SET record_count = (
    SELECT COALESCE(SUM(mc2.record_count), 0) FROM meta_catalog mc2
    WHERE mc2.identity_class = 'managed' AND mc2.status = 'active' AND mc2.composition_level = 'product'
  ), active_count = (
    SELECT COALESCE(SUM(mc2.record_count), 0) FROM meta_catalog mc2
    WHERE mc2.identity_class = 'managed' AND mc2.status = 'active' AND mc2.composition_level = 'product'
  ) WHERE code = 'CAT-PRD';

  UPDATE meta_catalog SET record_count = (
    SELECT COALESCE(SUM(mc2.record_count), 0) FROM meta_catalog mc2
    WHERE mc2.identity_class = 'managed' AND mc2.status = 'active' AND mc2.composition_level = 'building'
  ), active_count = (
    SELECT COALESCE(SUM(mc2.record_count), 0) FROM meta_catalog mc2
    WHERE mc2.identity_class = 'managed' AND mc2.status = 'active' AND mc2.composition_level = 'building'
  ) WHERE code = 'CAT-BLD';

  PERFORM set_config('app.allow_meta_update', 'false', true);
  RETURN NEW;
END;
$fn$ LANGUAGE plpgsql;
