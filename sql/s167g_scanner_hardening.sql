-- S167G: Scanner Hardening — 7 new integrity checks
-- Adds measurement_registry entries for blind spots found by S167F dual-agent chaos test
-- New checks use target_type='pg_query' with target_query='0' for PG-only violation counts
-- Also adds 'sync_drift' and 'vector_parity' comparison modes

BEGIN;

-- Extend constraints for new comparison modes and pg_only pattern
ALTER TABLE measurement_registry DROP CONSTRAINT measurement_registry_comparison_check;
ALTER TABLE measurement_registry ADD CONSTRAINT measurement_registry_comparison_check
  CHECK (comparison = ANY (ARRAY['strict_equals','eventual_equals','exists','not_exists','within_window','always_fail','sync_drift','vector_parity']));

-- A1: _dot_origin NULL in managed collections (18 collections)
INSERT INTO measurement_registry (measurement_id, measurement_name, law_code, method, source_query, target_type, target_query, category, severity, comparison, enabled, auto_generated)
VALUES (
  'MSR-D31-A1',
  '_dot_origin NULL in managed collections',
  'dieu31',
  2,
  $SQL$
    SELECT COALESCE(SUM(cnt), 0)::text FROM (
      SELECT COUNT(*) as cnt FROM dot_tools WHERE _dot_origin IS NULL
      UNION ALL SELECT COUNT(*) FROM entity_dependencies WHERE _dot_origin IS NULL
      UNION ALL SELECT COUNT(*) FROM universal_edges WHERE _dot_origin IS NULL
      UNION ALL SELECT COUNT(*) FROM entity_species WHERE _dot_origin IS NULL
      UNION ALL SELECT COUNT(*) FROM meta_catalog WHERE _dot_origin IS NULL
      UNION ALL SELECT COUNT(*) FROM workflows WHERE _dot_origin IS NULL
      UNION ALL SELECT COUNT(*) FROM workflow_steps WHERE _dot_origin IS NULL
      UNION ALL SELECT COUNT(*) FROM workflow_change_requests WHERE _dot_origin IS NULL
      UNION ALL SELECT COUNT(*) FROM table_registry WHERE _dot_origin IS NULL
      UNION ALL SELECT COUNT(*) FROM collection_registry WHERE _dot_origin IS NULL
      UNION ALL SELECT COUNT(*) FROM checkpoint_sets WHERE _dot_origin IS NULL
      UNION ALL SELECT COUNT(*) FROM checkpoint_types WHERE _dot_origin IS NULL
      UNION ALL SELECT COUNT(*) FROM trigger_registry WHERE _dot_origin IS NULL
      UNION ALL SELECT COUNT(*) FROM modules WHERE _dot_origin IS NULL
      UNION ALL SELECT COUNT(*) FROM agents WHERE _dot_origin IS NULL
      UNION ALL SELECT COUNT(*) FROM ui_pages WHERE _dot_origin IS NULL
      UNION ALL SELECT COUNT(*) FROM tasks WHERE _dot_origin IS NULL
      UNION ALL SELECT COUNT(*) FROM task_comments WHERE _dot_origin IS NULL
    ) sub
  $SQL$,
  'pg_query',
  '0',
  'completeness',
  'warning',
  'strict_equals',
  true,
  false
);

-- A2: Broken entity_dependencies (source_code references non-existent entities)
INSERT INTO measurement_registry (measurement_id, measurement_name, law_code, method, source_query, target_type, target_query, category, severity, comparison, enabled, auto_generated)
VALUES (
  'MSR-D31-A2',
  'Broken entity_dependencies references',
  'dieu31',
  2,
  $SQL$
    SELECT COUNT(*)::text FROM entity_dependencies ed
    WHERE ed.status = 'active'
    AND NOT EXISTS (
      SELECT 1 FROM meta_catalog mc WHERE mc.code = ed.source_code
      UNION ALL SELECT 1 FROM dot_tools dt WHERE dt.code = ed.source_code
      UNION ALL SELECT 1 FROM workflows w WHERE w.process_code = ed.source_code
      UNION ALL SELECT 1 FROM workflow_steps ws WHERE ws.code = ed.source_code
      UNION ALL SELECT 1 FROM table_registry tr WHERE tr.table_id = ed.source_code
      UNION ALL SELECT 1 FROM entity_species es WHERE es.code = ed.source_code
      UNION ALL SELECT 1 FROM checkpoint_sets cs WHERE cs.code = ed.source_code
      UNION ALL SELECT 1 FROM checkpoint_types ct WHERE ct.code = ed.source_code
      UNION ALL SELECT 1 FROM collection_registry cr WHERE cr.code = ed.source_code
      UNION ALL SELECT 1 FROM trigger_registry trg WHERE trg.code = ed.source_code
      UNION ALL SELECT 1 FROM ui_pages up WHERE up.code = ed.source_code
    )
  $SQL$,
  'pg_query',
  '0',
  'consistency',
  'warning',
  'strict_equals',
  true,
  false
);

-- A3: Broken universal_edges references
INSERT INTO measurement_registry (measurement_id, measurement_name, law_code, method, source_query, target_type, target_query, category, severity, comparison, enabled, auto_generated)
VALUES (
  'MSR-D31-A3',
  'Broken universal_edges references',
  'dieu31',
  2,
  $SQL$
    SELECT COUNT(*)::text FROM universal_edges ue
    WHERE ue.status = 'active'
    AND (
      (ue.source_code IS NOT NULL AND ue.source_code != '' AND NOT EXISTS (
        SELECT 1 FROM meta_catalog mc WHERE mc.code = ue.source_code
        UNION ALL SELECT 1 FROM dot_tools dt WHERE dt.code = ue.source_code
        UNION ALL SELECT 1 FROM workflows w WHERE w.process_code = ue.source_code
        UNION ALL SELECT 1 FROM entity_species es WHERE es.code = ue.source_code
        UNION ALL SELECT 1 FROM table_registry tr WHERE tr.table_id = ue.source_code
      ))
      OR
      (ue.target_code IS NOT NULL AND ue.target_code != '' AND NOT EXISTS (
        SELECT 1 FROM meta_catalog mc WHERE mc.code = ue.target_code
        UNION ALL SELECT 1 FROM dot_tools dt WHERE dt.code = ue.target_code
        UNION ALL SELECT 1 FROM workflows w WHERE w.process_code = ue.target_code
        UNION ALL SELECT 1 FROM entity_species es WHERE es.code = ue.target_code
        UNION ALL SELECT 1 FROM table_registry tr WHERE tr.table_id = ue.target_code
      ))
    )
  $SQL$,
  'pg_query',
  '0',
  'consistency',
  'warning',
  'strict_equals',
  true,
  false
);

-- A4: Circular dependencies in entity_dependencies (PG recursive CTE)
INSERT INTO measurement_registry (measurement_id, measurement_name, law_code, method, source_query, target_type, target_query, category, severity, comparison, enabled, auto_generated)
VALUES (
  'MSR-D31-A4',
  'Circular dependencies detected',
  'dieu31',
  2,
  $SQL$
    WITH RECURSIVE dep_chain AS (
      SELECT source_code, target_code, ARRAY[source_code::text] as path, false as is_cycle
      FROM entity_dependencies
      WHERE status = 'active' AND source_code IS NOT NULL AND target_code IS NOT NULL
      UNION ALL
      SELECT dc.source_code, ed.target_code, dc.path || ed.source_code::text,
             ed.target_code::text = ANY(dc.path)
      FROM dep_chain dc
      JOIN entity_dependencies ed ON ed.source_code = dc.target_code AND ed.status = 'active'
      WHERE NOT dc.is_cycle AND array_length(dc.path, 1) < 10
    )
    SELECT COUNT(DISTINCT source_code)::text FROM dep_chain WHERE is_cycle
  $SQL$,
  'pg_query',
  '0',
  'consistency',
  'warning',
  'strict_equals',
  true,
  false
);

-- A5: Directus vs Agent Data sync drift (knowledge_documents count)
-- source_query = Directus published count; runner fetches Agent Data /api/health for comparison
INSERT INTO measurement_registry (measurement_id, measurement_name, law_code, method, source_query, target_type, target_query, category, severity, comparison, enabled, auto_generated)
VALUES (
  'MSR-D31-A5',
  'Directus vs Agent Data document sync drift',
  'dieu31',
  2,
  $SQL$
    SELECT COUNT(*)::text FROM knowledge_documents WHERE status = 'published'
  $SQL$,
  'nuxt_api',
  '/api/health',
  'consistency',
  'warning',
  'sync_drift',
  true,
  false
);

-- A6: Vector/Document parity ratio (from Agent Data /api/health)
-- Ratio > 2.0 = WARNING. Current 1.47 is normal (chunking).
INSERT INTO measurement_registry (measurement_id, measurement_name, law_code, method, source_query, target_type, target_query, category, severity, comparison, enabled, auto_generated)
VALUES (
  'MSR-D31-A6',
  'Vector/Document parity ratio',
  'dieu31',
  2,
  $SQL$
    SELECT '0'
  $SQL$,
  'nuxt_api',
  '/api/health',
  'validity',
  'warning',
  'vector_parity',
  true,
  false
);

-- A7: Duplicate active meta_catalog rows per registry_collection
INSERT INTO measurement_registry (measurement_id, measurement_name, law_code, method, source_query, target_type, target_query, category, severity, comparison, enabled, auto_generated)
VALUES (
  'MSR-D31-A7',
  'Duplicate active meta_catalog rows',
  'dieu31',
  2,
  $SQL$
    SELECT COUNT(*)::text FROM (
      SELECT registry_collection FROM meta_catalog
      WHERE status = 'active' AND registry_collection IS NOT NULL
      GROUP BY registry_collection HAVING COUNT(*) > 1
    ) dups
  $SQL$,
  'pg_query',
  '0',
  'validity',
  'warning',
  'strict_equals',
  true,
  false
);

COMMIT;
