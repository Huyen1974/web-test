-- S167H: Data Quality Fix — _dot_origin NULL backfill + A3 scanner query fix
-- Fixes 2 real findings from S167G scanner:
--   #2225: _dot_origin NULL in managed collections (2079 -> 0)
--   #2226: Broken universal_edges (2040 -> 0, was scanner false positive + 1 real broken edge)
--
-- Root causes:
--   1. _dot_origin NULL: records created before DOT tracking. Guard: DEFAULT 'DOT:UNKNOWN'.
--   2. Broken edges: scanner A3 query only checked 5 entity tables, but universal_edges
--      references 20+ tables (taxonomy, checkpoint_instances, task_comments, etc.)
--      Also: workflows edges use integer IDs, not process_code.
--      Fix: expand query to all entity tables + handle numeric IDs.
--      Plus 1 genuinely broken edge (CAT-100 -> LBL-101, S143 test residue) deleted.

BEGIN;

-- ═══════════════════════════════════════════════════════════════
-- PART 1: GUARD — DEFAULT 'DOT:UNKNOWN' on all 18 managed collections
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE meta_catalog ALTER COLUMN _dot_origin SET DEFAULT 'DOT:UNKNOWN';
ALTER TABLE entity_species ALTER COLUMN _dot_origin SET DEFAULT 'DOT:UNKNOWN';
ALTER TABLE collection_registry ALTER COLUMN _dot_origin SET DEFAULT 'DOT:UNKNOWN';
-- universal_edges: ALTER as workflow_admin (different owner)
-- ALTER TABLE universal_edges ALTER COLUMN _dot_origin SET DEFAULT 'DOT:UNKNOWN';
ALTER TABLE dot_tools ALTER COLUMN _dot_origin SET DEFAULT 'DOT:UNKNOWN';
ALTER TABLE entity_dependencies ALTER COLUMN _dot_origin SET DEFAULT 'DOT:UNKNOWN';
ALTER TABLE workflows ALTER COLUMN _dot_origin SET DEFAULT 'DOT:UNKNOWN';
ALTER TABLE workflow_steps ALTER COLUMN _dot_origin SET DEFAULT 'DOT:UNKNOWN';
ALTER TABLE workflow_change_requests ALTER COLUMN _dot_origin SET DEFAULT 'DOT:UNKNOWN';
ALTER TABLE table_registry ALTER COLUMN _dot_origin SET DEFAULT 'DOT:UNKNOWN';
ALTER TABLE checkpoint_sets ALTER COLUMN _dot_origin SET DEFAULT 'DOT:UNKNOWN';
ALTER TABLE checkpoint_types ALTER COLUMN _dot_origin SET DEFAULT 'DOT:UNKNOWN';
ALTER TABLE trigger_registry ALTER COLUMN _dot_origin SET DEFAULT 'DOT:UNKNOWN';
ALTER TABLE modules ALTER COLUMN _dot_origin SET DEFAULT 'DOT:UNKNOWN';
ALTER TABLE agents ALTER COLUMN _dot_origin SET DEFAULT 'DOT:UNKNOWN';
ALTER TABLE ui_pages ALTER COLUMN _dot_origin SET DEFAULT 'DOT:UNKNOWN';
ALTER TABLE tasks ALTER COLUMN _dot_origin SET DEFAULT 'DOT:UNKNOWN';
ALTER TABLE task_comments ALTER COLUMN _dot_origin SET DEFAULT 'DOT:UNKNOWN';

-- ═══════════════════════════════════════════════════════════════
-- PART 2: BACKFILL — NULL -> 'LEGACY|S167H|2026-03-26'
-- Format compliant with fn_validate_dot_origin() trigger
-- ═══════════════════════════════════════════════════════════════

UPDATE meta_catalog SET _dot_origin = 'LEGACY|S167H|2026-03-26' WHERE _dot_origin IS NULL;
UPDATE entity_species SET _dot_origin = 'LEGACY|S167H|2026-03-26' WHERE _dot_origin IS NULL;
UPDATE collection_registry SET _dot_origin = 'LEGACY|S167H|2026-03-26' WHERE _dot_origin IS NULL;
-- universal_edges: UPDATE as workflow_admin
-- UPDATE universal_edges SET _dot_origin = 'LEGACY|S167H|2026-03-26' WHERE _dot_origin IS NULL;

-- ═══════════════════════════════════════════════════════════════
-- PART 3: FIX A3 SCANNER QUERY — expand to all 20 entity tables
-- Original only checked: meta_catalog, dot_tools, workflows, entity_species, table_registry
-- Missing: tasks, checkpoint_types/sets/instances, trigger_registry, collection_registry,
--          ui_pages, modules, agents, workflow_steps/WCR, entity_dependencies,
--          taxonomy, taxonomy_facets, task_comments
-- Also: workflows edges use id::text, not process_code
-- ═══════════════════════════════════════════════════════════════

UPDATE measurement_registry SET source_query = $SQL$
    SELECT COUNT(*)::text FROM universal_edges ue
    WHERE ue.status = 'active'
    AND (
      (ue.source_code IS NOT NULL AND ue.source_code != '' AND NOT EXISTS (
        SELECT 1 FROM meta_catalog WHERE code = ue.source_code
        UNION ALL SELECT 1 FROM dot_tools WHERE code = ue.source_code
        UNION ALL SELECT 1 FROM workflows WHERE process_code = ue.source_code OR id::text = ue.source_code
        UNION ALL SELECT 1 FROM workflow_steps WHERE code = ue.source_code
        UNION ALL SELECT 1 FROM workflow_change_requests WHERE code = ue.source_code
        UNION ALL SELECT 1 FROM entity_species WHERE code = ue.source_code
        UNION ALL SELECT 1 FROM table_registry WHERE table_id = ue.source_code
        UNION ALL SELECT 1 FROM tasks WHERE code = ue.source_code
        UNION ALL SELECT 1 FROM task_comments WHERE id::text = ue.source_code
        UNION ALL SELECT 1 FROM checkpoint_types WHERE code = ue.source_code
        UNION ALL SELECT 1 FROM checkpoint_sets WHERE code = ue.source_code
        UNION ALL SELECT 1 FROM checkpoint_instances WHERE code = ue.source_code
        UNION ALL SELECT 1 FROM trigger_registry WHERE code = ue.source_code
        UNION ALL SELECT 1 FROM collection_registry WHERE code = ue.source_code
        UNION ALL SELECT 1 FROM ui_pages WHERE code = ue.source_code
        UNION ALL SELECT 1 FROM modules WHERE code = ue.source_code
        UNION ALL SELECT 1 FROM agents WHERE code = ue.source_code
        UNION ALL SELECT 1 FROM entity_dependencies WHERE code = ue.source_code
        UNION ALL SELECT 1 FROM taxonomy WHERE code = ue.source_code
        UNION ALL SELECT 1 FROM taxonomy_facets WHERE code = ue.source_code
      ))
      OR
      (ue.target_code IS NOT NULL AND ue.target_code != '' AND NOT EXISTS (
        SELECT 1 FROM meta_catalog WHERE code = ue.target_code
        UNION ALL SELECT 1 FROM dot_tools WHERE code = ue.target_code
        UNION ALL SELECT 1 FROM workflows WHERE process_code = ue.target_code OR id::text = ue.target_code
        UNION ALL SELECT 1 FROM workflow_steps WHERE code = ue.target_code
        UNION ALL SELECT 1 FROM workflow_change_requests WHERE code = ue.target_code
        UNION ALL SELECT 1 FROM entity_species WHERE code = ue.target_code
        UNION ALL SELECT 1 FROM table_registry WHERE table_id = ue.target_code
        UNION ALL SELECT 1 FROM tasks WHERE code = ue.target_code
        UNION ALL SELECT 1 FROM task_comments WHERE id::text = ue.target_code
        UNION ALL SELECT 1 FROM checkpoint_types WHERE code = ue.target_code
        UNION ALL SELECT 1 FROM checkpoint_sets WHERE code = ue.target_code
        UNION ALL SELECT 1 FROM checkpoint_instances WHERE code = ue.target_code
        UNION ALL SELECT 1 FROM trigger_registry WHERE code = ue.target_code
        UNION ALL SELECT 1 FROM collection_registry WHERE code = ue.target_code
        UNION ALL SELECT 1 FROM ui_pages WHERE code = ue.target_code
        UNION ALL SELECT 1 FROM modules WHERE code = ue.target_code
        UNION ALL SELECT 1 FROM agents WHERE code = ue.target_code
        UNION ALL SELECT 1 FROM entity_dependencies WHERE code = ue.target_code
        UNION ALL SELECT 1 FROM taxonomy WHERE code = ue.target_code
        UNION ALL SELECT 1 FROM taxonomy_facets WHERE code = ue.target_code
      ))
    )
$SQL$ WHERE measurement_id = 'MSR-D31-A3';

-- PART 4: Delete 1 genuinely broken edge (S143 test residue)
-- CAT-100 was deleted but edge #2897 (CAT-100 -> LBL-101) remained
-- DELETE FROM universal_edges WHERE id = 2897;  -- run as workflow_admin

COMMIT;
