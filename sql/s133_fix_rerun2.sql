-- S133-M3-FIX round 2: Re-run after query fixes via Directus API
-- Queries fixed: D29-001 (status=active), D28-001/002 (self-check), D29-002 (join)

-- Clear old results
DELETE FROM measurement_log WHERE run_id LIKE 's133-%';

-- Re-run
SELECT measurement_id, law_code, source_value, target_value, result, delta
FROM run_internal_measurements(NULL, 's133-fix2-verify');

-- Refresh dashboard
SELECT refresh_measurement_dashboard();

-- Summary
SELECT result, COUNT(*) as cnt
FROM measurement_log WHERE run_id = 's133-fix2-verify'
GROUP BY result ORDER BY result;
