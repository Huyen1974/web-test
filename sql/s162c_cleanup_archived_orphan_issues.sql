-- S162C: Cleanup stale archived orphan dependency issues
--
-- Investigation found: 119 system_issues (110 orphan_dep_target + 9 orphan_dep_source)
-- ALL have status='archived'. The underlying FK references in entity_dependencies are
-- ALL valid — zero actual orphans exist. These issues are stale false positives from
-- a previous scan that detected temporary inconsistencies that have since been resolved.
--
-- Additionally: system_issues API endpoints now filter status != 'archived',
-- so these won't appear in the UI even before this cleanup runs.

-- Step 1: Verify counts before delete
SELECT sub_class, status, COUNT(*) as cnt
FROM system_issues
WHERE sub_class IN ('orphan_dep_target', 'orphan_dep_source')
GROUP BY sub_class, status
ORDER BY sub_class, status;

-- Step 2: Delete archived orphan issues (only archived — preserve any active ones)
DELETE FROM system_issues
WHERE sub_class IN ('orphan_dep_target', 'orphan_dep_source')
  AND status = 'archived';

-- Step 3: Verify cleanup
SELECT sub_class, COUNT(*) as remaining
FROM system_issues
WHERE sub_class IN ('orphan_dep_target', 'orphan_dep_source')
GROUP BY sub_class;
-- Expected: 0 rows (all cleaned up)

-- Step 4: Verify total system_issues count
SELECT COUNT(*) as total_issues FROM system_issues;
SELECT severity, COUNT(*) as cnt FROM system_issues GROUP BY severity ORDER BY severity;
