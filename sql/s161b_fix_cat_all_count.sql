-- S161B: Fix CAT-ALL record_count to match SUM of managed record_counts
-- After M5B updated record_counts for 4 new collections (birth_registry etc.),
-- CAT-ALL total was not refreshed. CI Counting Contract fails: 886 != 17319.

UPDATE meta_catalog
SET record_count = (
    SELECT SUM(record_count)
    FROM meta_catalog
    WHERE identity_class IN ('managed', 'log')
      AND code != 'CAT-ALL'
)
WHERE code = 'CAT-ALL';

-- Verify
SELECT code, name, record_count FROM meta_catalog WHERE code = 'CAT-ALL';
SELECT SUM(record_count) as sum_total FROM meta_catalog WHERE identity_class IN ('managed', 'log') AND code != 'CAT-ALL';
