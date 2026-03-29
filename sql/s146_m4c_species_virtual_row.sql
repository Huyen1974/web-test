-- S146-M4c: Species virtual row (dòng thứ 7) + auto-refresh trigger
-- Điều 29: Species = meta-layer, đứng NGOÀI 6 lớp cấu tạo
-- composition_level = 'meta' (extended CHECK constraint)

-- 1. Extend composition_level CHECK to include 'meta'
ALTER TABLE meta_catalog DROP CONSTRAINT IF EXISTS chk_composition_level;
ALTER TABLE meta_catalog ADD CONSTRAINT chk_composition_level
  CHECK (composition_level IN ('atom','molecule','compound','material','product','building','meta'));

-- 2. Insert species virtual row with explicit code CAT-SPE
INSERT INTO meta_catalog (code, name, entity_type, source_model, identity_class, composition_level, status, record_count, active_count)
VALUES ('CAT-SPE', 'Tổng loài', 'species_total', 'A', 'virtual', 'meta', 'active',
        (SELECT COUNT(*) FROM entity_species),
        (SELECT COUNT(*) FROM entity_species))
ON CONFLICT (code) DO NOTHING;

-- 3. Trigger function for species count auto-refresh (dual-trigger #2: on-demand)
CREATE OR REPLACE FUNCTION fn_refresh_species_count()
RETURNS TRIGGER AS $fn$
BEGIN
  PERFORM set_config('app.allow_meta_update', 'true', true);
  UPDATE meta_catalog
  SET record_count = (SELECT COUNT(*) FROM entity_species),
      active_count = (SELECT COUNT(*) FROM entity_species),
      last_scan_date = NOW()
  WHERE code = 'CAT-SPE';
  RETURN NULL;
END;
$fn$ LANGUAGE plpgsql;

-- 4. Create trigger on entity_species
DROP TRIGGER IF EXISTS trg_refresh_species_count ON entity_species;
CREATE TRIGGER trg_refresh_species_count
  AFTER INSERT OR DELETE ON entity_species
  FOR EACH STATEMENT
  EXECUTE FUNCTION fn_refresh_species_count();
