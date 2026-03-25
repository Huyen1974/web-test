-- S134-M5A: Fix MSR-D31-102 source_query — species table → entity_species
-- Also fix MSR-D31-101 source_query to match the /api/registry/counts endpoint format

UPDATE measurement_registry
SET source_query = 'SELECT COUNT(*)::text FROM entity_species WHERE status = ''active'''
WHERE measurement_id = 'MSR-D31-102';

-- MSR-D31-101: ensure source returns same value as Nuxt endpoint
-- Nuxt /api/registry/counts uses: SUM(record_count) WHERE identity_class='managed'
UPDATE measurement_registry
SET source_query = 'SELECT SUM(record_count)::text FROM meta_catalog WHERE identity_class = ''managed'''
WHERE measurement_id = 'MSR-D31-101';
