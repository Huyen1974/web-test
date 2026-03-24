-- S133-M3-FIX: Re-run measurements after query fixes
-- This is a one-time re-run to verify fixed queries work

-- Clear stale results from the seed run
DELETE FROM measurement_log WHERE run_id = 's133-seed';

-- Re-run all internal measurements
SELECT * FROM run_internal_measurements(NULL, 's133-fix-verify');

-- Refresh dashboard
SELECT refresh_measurement_dashboard();

-- Show results
SELECT measurement_id, measurement_name, law_code, result, source_value, target_value, delta
FROM measurement_log
WHERE run_id = 's133-fix-verify'
ORDER BY measurement_id;

-- Summary
SELECT result, COUNT(*) as cnt
FROM measurement_log WHERE run_id = 's133-fix-verify'
GROUP BY result;
