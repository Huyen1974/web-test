/**
 * PG Client — connects to measurement_registry via pg npm package.
 * All PG operations go through this module. No docker exec. No Directus API for PG reads.
 */

const { Client } = require('pg');

let client = null;

/**
 * Connect to PG using DATABASE_URL from environment.
 * Returns true if connected, false otherwise.
 */
async function connect() {
	const connStr = process.env.DATABASE_URL;
	if (!connStr) {
		console.error('  [PG-CLIENT] DATABASE_URL not set');
		return false;
	}
	try {
		client = new Client({ connectionString: connStr, ssl: false });
		await client.connect();
		return true;
	} catch (e) {
		console.error(`  [PG-CLIENT] Connection failed: ${e.message}`);
		client = null;
		return false;
	}
}

/**
 * Read method=2 enabled measurements from measurement_registry.
 */
async function getMethod2Measurements() {
	if (!client) return [];
	try {
		const res = await client.query(
			`SELECT * FROM measurement_registry WHERE method = 2 AND enabled = true ORDER BY measurement_id`
		);
		return res.rows;
	} catch (e) {
		console.error(`  [PG-CLIENT] Failed to load measurements: ${e.message}`);
		return [];
	}
}

/**
 * Execute a source_query on PG. Returns first row's first column as text.
 */
async function executeSourceQuery(sql) {
	if (!client) return { ok: false, value: null, error: 'Not connected' };
	try {
		const res = await client.query(sql);
		const val = res.rows[0] ? String(Object.values(res.rows[0])[0]) : null;
		return { ok: true, value: val };
	} catch (e) {
		return { ok: false, value: null, error: e.message?.slice(0, 200) };
	}
}

/**
 * Log measurement result to measurement_log via PG INSERT.
 * Trigger trg_update_measurement will auto-update measurement_registry.last_*.
 */
async function logMeasurementResult(runId, measurementId, result, sourceValue, targetValue, delta) {
	if (!client) return;
	try {
		await client.query(
			`INSERT INTO measurement_log (run_id, measurement_id, result, source_value, target_value, delta)
			 VALUES ($1, $2, $3, $4, $5, $6)`,
			[runId, measurementId, result, sourceValue, targetValue, delta]
		);
	} catch (e) {
		console.error(`  [PG-CLIENT] Failed to log result for ${measurementId}: ${e.message}`);
	}
}

/**
 * Disconnect from PG.
 */
async function disconnect() {
	if (client) {
		try { await client.end(); } catch { /* ignore */ }
		client = null;
	}
}

module.exports = { connect, getMethod2Measurements, executeSourceQuery, logMeasurementResult, disconnect };
