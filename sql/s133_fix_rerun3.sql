-- S133-M3-FIX round 3: Final re-run after registry_collection JOIN fix
DELETE FROM measurement_log WHERE run_id LIKE 's133-%';
SELECT measurement_id, law_code, source_value, target_value, result, delta
FROM run_internal_measurements(NULL, 's133-fix3-final');
SELECT refresh_measurement_dashboard();
SELECT result, COUNT(*) as cnt FROM measurement_log WHERE run_id = 's133-fix3-final' GROUP BY result ORDER BY result;
