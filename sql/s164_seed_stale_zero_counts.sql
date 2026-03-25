-- S164: Seed STALE_ZERO counts for CAT-020/021/022 + remove CAT-100 ghost
-- These entries had record_count=0 because they were created AFTER data existed.
-- Counting triggers fire on INSERT/DELETE but the initial count was never seeded.
-- Also applied directly via SSH (§0-AG) before this migration runs.

SELECT set_config('app.allow_meta_update', 'true', false);

-- Seed counts (idempotent: only updates if still 0)
UPDATE meta_catalog SET
  record_count = (SELECT COUNT(*) FROM entity_species),
  actual_count = (SELECT COUNT(*) FROM entity_species),
  active_count = (SELECT COUNT(*) FROM entity_species)
WHERE code = 'CAT-020' AND (record_count IS NULL OR record_count = 0);

UPDATE meta_catalog SET
  record_count = (SELECT COUNT(*) FROM species_collection_map),
  actual_count = (SELECT COUNT(*) FROM species_collection_map),
  active_count = (SELECT COUNT(*) FROM species_collection_map)
WHERE code = 'CAT-021' AND (record_count IS NULL OR record_count = 0);

UPDATE meta_catalog SET
  record_count = (SELECT COUNT(*) FROM entity_audit_queue),
  actual_count = (SELECT COUNT(*) FROM entity_audit_queue),
  active_count = (SELECT COUNT(*) FROM entity_audit_queue)
WHERE code = 'CAT-022' AND (record_count IS NULL OR record_count = 0);

-- Remove CAT-100 ghost (S143 test artifact, no collection, no data)
DELETE FROM birth_registry WHERE entity_code = 'CAT-100';
DELETE FROM meta_catalog WHERE code = 'CAT-100';

SELECT set_config('app.allow_meta_update', '', false);

-- Verify
SELECT code, record_count, actual_count FROM meta_catalog
WHERE code IN ('CAT-020','CAT-021','CAT-022') ORDER BY code;
