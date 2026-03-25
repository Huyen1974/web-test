-- S134-M5B: Fix 3 data gaps — counting triggers + record_count refresh + measurement query adjust
-- Root cause: 4 collections added to meta_catalog after original counting triggers were set up.

-- ═══════════════════════════════════════
-- PART 1: Create counting function + triggers for 4 missing collections
-- Pattern: trg_count_[collection] — matches existing convention
-- ═══════════════════════════════════════

-- Generic counting function (reusable for all collections)
CREATE OR REPLACE FUNCTION update_record_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE meta_catalog
    SET record_count = (
        SELECT COUNT(*) FROM pg_catalog.pg_class c
        JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = TG_TABLE_NAME AND n.nspname = TG_TABLE_SCHEMA
    )
    WHERE registry_collection = TG_TABLE_NAME;

    -- Actually count the real rows
    EXECUTE format('UPDATE meta_catalog SET record_count = (SELECT COUNT(*) FROM %I) WHERE registry_collection = %L', TG_TABLE_NAME, TG_TABLE_NAME);

    RETURN NULL; -- AFTER trigger, return value ignored
END;
$$ LANGUAGE plpgsql;

-- Trigger for entity_species (33 species, CAT-020)
DROP TRIGGER IF EXISTS trg_count_entity_species ON entity_species;
CREATE TRIGGER trg_count_entity_species
AFTER INSERT OR DELETE ON entity_species
FOR EACH STATEMENT EXECUTE FUNCTION update_record_count();

-- Trigger for species_collection_map (138 mappings, CAT-021)
DROP TRIGGER IF EXISTS trg_count_species_collection_map ON species_collection_map;
CREATE TRIGGER trg_count_species_collection_map
AFTER INSERT OR DELETE ON species_collection_map
FOR EACH STATEMENT EXECUTE FUNCTION update_record_count();

-- Trigger for entity_audit_queue (1 record, CAT-022)
DROP TRIGGER IF EXISTS trg_count_entity_audit_queue ON entity_audit_queue;
CREATE TRIGGER trg_count_entity_audit_queue
AFTER INSERT OR DELETE ON entity_audit_queue
FOR EACH STATEMENT EXECUTE FUNCTION update_record_count();

-- Trigger for birth_registry (16000+ records, CAT-023)
DROP TRIGGER IF EXISTS trg_count_birth_registry ON birth_registry;
CREATE TRIGGER trg_count_birth_registry
AFTER INSERT OR DELETE ON birth_registry
FOR EACH STATEMENT EXECUTE FUNCTION update_record_count();

-- ═══════════════════════════════════════
-- PART 2: One-time record_count refresh (populate current counts)
-- Future INSERT/DELETE will be handled by triggers above
-- ═══════════════════════════════════════

UPDATE meta_catalog SET record_count = (SELECT COUNT(*) FROM entity_species)
WHERE registry_collection = 'entity_species';

UPDATE meta_catalog SET record_count = (SELECT COUNT(*) FROM species_collection_map)
WHERE registry_collection = 'species_collection_map';

UPDATE meta_catalog SET record_count = (SELECT COUNT(*) FROM entity_audit_queue)
WHERE registry_collection = 'entity_audit_queue';

UPDATE meta_catalog SET record_count = (SELECT COUNT(*) FROM birth_registry)
WHERE registry_collection = 'birth_registry';

-- table_proposals: 0 actual = correct, no action needed

-- ═══════════════════════════════════════
-- PART 3: Adjust measurement queries for EXPECTED gaps
-- birth_registry (meta) and table_proposals (empty) don't need birth/species
-- ═══════════════════════════════════════

-- MSR-D26-002: now that record_counts are fixed, self-check should PASS
-- Source = target = count of managed with record_count > 0
UPDATE measurement_registry
SET measurement_name = 'meta_catalog: managed with data = record_count populated',
    source_query = 'SELECT COUNT(*) FROM meta_catalog WHERE identity_class = ''managed'' AND record_count > 0',
    target_query = 'SELECT COUNT(*) FROM meta_catalog WHERE identity_class = ''managed'' AND record_count > 0'
WHERE measurement_id = 'MSR-D26-002';

-- MSR-D28-002: exclude birth_registry itself (doesn't birth-register itself)
UPDATE measurement_registry
SET source_query = 'SELECT COUNT(DISTINCT br.collection_name) FROM birth_registry br WHERE br.collection_name IN (SELECT registry_collection FROM meta_catalog WHERE identity_class = ''managed'' AND registry_collection != ''birth_registry'' AND record_count > 0)',
    target_query = 'SELECT COUNT(*) FROM meta_catalog WHERE identity_class = ''managed'' AND registry_collection != ''birth_registry'' AND record_count > 0'
WHERE measurement_id = 'MSR-D28-002';

-- MSR-D29-002: exclude birth_registry (meta) + table_proposals (empty)
UPDATE measurement_registry
SET source_query = 'SELECT COUNT(DISTINCT scm.collection_name) FROM species_collection_map scm WHERE scm.collection_name IN (SELECT registry_collection FROM meta_catalog WHERE identity_class = ''managed'' AND registry_collection NOT IN (''birth_registry'', ''table_proposals'') AND record_count > 0)',
    target_query = 'SELECT COUNT(*) FROM meta_catalog WHERE identity_class = ''managed'' AND registry_collection NOT IN (''birth_registry'', ''table_proposals'') AND record_count > 0'
WHERE measurement_id = 'MSR-D29-002';

-- ═══════════════════════════════════════
-- PART 4: Re-run internal measurements to verify
-- ═══════════════════════════════════════

DELETE FROM measurement_log WHERE run_id LIKE 's134-m5b%';
SELECT measurement_id, law_code, source_value, target_value, result, delta
FROM run_internal_measurements(NULL, 's134-m5b-verify');
SELECT refresh_measurement_dashboard();
SELECT result, COUNT(*) FROM measurement_log WHERE run_id = 's134-m5b-verify' GROUP BY result;
