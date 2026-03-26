/**
 * PG vs Nuxt Check Runner — Methodology v2.0 Bài toán B
 * Compares PG source_value (chân lý) with Nuxt target_value (so sánh).
 * Evidence: { source_value, target_value, delta } — mandatory per methodology.
 */

const { executeSourceQuery } = require('../pg-client');
const BASE_URL = process.env.SITE_URL || 'https://vps.incomexsaigoncorp.vn';

/**
 * Run a single method=2 measurement.
 * @param {Object} m - Row from measurement_registry
 * @returns {{ result: string, source_value: string, target_value: string, delta: string }}
 */
async function runPgVsNuxtCheck(m) {
	// WATCHDOG: always_fail
	if (m.comparison === 'always_fail') {
		return {
			result: 'fail',
			source_value: '1',
			target_value: 'ALWAYS_FAIL',
			delta: 'WATCHDOG — runner alive',
		};
	}

	// 1. Execute source_query on PG (chân lý)
	const pgResult = await executeSourceQuery(m.source_query);
	if (!pgResult.ok) {
		return {
			result: 'error',
			source_value: pgResult.error || 'PG query failed',
			target_value: null,
			delta: 'SOURCE_QUERY_ERROR',
		};
	}
	const sourceValue = pgResult.value;

	// PG-only integrity check: source_query returns violation count, compare against target_query (usually '0')
	if (m.target_type === 'pg_query') {
		const expected = m.target_query || '0';
		const result = compare(sourceValue, expected, m.comparison);
		return {
			result,
			source_value: sourceValue,
			target_value: expected,
			delta: result === 'pass' ? '0' : `found ${sourceValue} violations (expected ${expected})`,
		};
	}

	// 2. Fetch target from Nuxt
	let targetValue;
	try {
		if (m.target_type === 'nuxt_api') {
			const url = m.target_query.startsWith('http') ? m.target_query : `${BASE_URL}${m.target_query}`;
			const resp = await fetch(url, { signal: AbortSignal.timeout(20000) });
			if (!resp.ok) {
				return {
					result: 'error',
					source_value: sourceValue,
					target_value: `HTTP ${resp.status}`,
					delta: `TARGET_HTTP_${resp.status}`,
				};
			}
			const data = await resp.json();
			// For sync_drift/vector_parity, pass raw JSON to compare function
			if (m.comparison === 'sync_drift' || m.comparison === 'vector_parity') {
				targetValue = JSON.stringify(data);
			} else {
				targetValue = extractValue(m.target_query, data);
			}
		} else if (m.target_type === 'nuxt_page') {
			const url = m.target_query.startsWith('http') ? m.target_query : `${BASE_URL}${m.target_query}`;
			const resp = await fetch(url, { signal: AbortSignal.timeout(20000) });
			if (!resp.ok) {
				return {
					result: 'error',
					source_value: sourceValue,
					target_value: `HTTP ${resp.status}`,
					delta: `TARGET_HTTP_${resp.status}`,
				};
			}
			targetValue = (await resp.text()).length.toString();
		} else {
			return {
				result: 'error',
				source_value: sourceValue,
				target_value: null,
				delta: `Unsupported target_type: ${m.target_type}`,
			};
		}
	} catch (e) {
		return {
			result: 'error',
			source_value: sourceValue,
			target_value: e.message?.slice(0, 100),
			delta: 'TARGET_FETCH_ERROR',
		};
	}

	// 3. Compare
	const result = compare(sourceValue, String(targetValue), m.comparison);
	// For sync_drift/vector_parity, show meaningful delta
	let delta;
	if (result === 'pass') {
		delta = '0';
	} else if (m.comparison === 'sync_drift') {
		delta = `Directus=${sourceValue} vs AgentData docs — drift detected`;
	} else if (m.comparison === 'vector_parity') {
		delta = `Vector/doc ratio exceeds 2.0 threshold`;
	} else {
		delta = `${sourceValue} ≠ ${targetValue}`;
	}

	return { result, source_value: sourceValue, target_value: String(targetValue), delta };
}

/**
 * Extract comparable value from Nuxt API JSON response.
 */
function extractValue(endpoint, data) {
	if (endpoint.includes('system-issues') && !endpoint.includes('groups')) {
		return String(data?.totals?.all ?? '');
	}
	if (endpoint.includes('system-issues-groups')) {
		return String(data?.totals?.all ?? '');
	}
	if (endpoint.includes('species')) {
		return String(data?.total ?? data?.count ?? data?.totals?.species ?? '');
	}
	if (endpoint.includes('counts')) {
		return String(data?.total ?? data?.all ?? '');
	}
	if (typeof data === 'number') return String(data);
	if (typeof data === 'string') return data;
	if (data?.total !== undefined) return String(data.total);
	if (data?.count !== undefined) return String(data.count);
	return JSON.stringify(data).slice(0, 100);
}

function compare(source, target, comparison) {
	switch (comparison) {
		case 'strict_equals':
		case 'eventual_equals':
			return source === target ? 'pass' : 'fail';
		case 'exists':
			return target && target !== '' && target !== 'null' && target !== '0' ? 'pass' : 'fail';
		case 'not_exists':
			return !target || target === '' || target === 'null' || target === '0' ? 'pass' : 'fail';
		case 'always_fail':
			return 'fail';
		case 'sync_drift':
			// source = Directus knowledge_documents count, target = Agent Data JSON
			// Parse document_count from health response, drift > 5 = fail
			return compareSyncDrift(source, target);
		case 'vector_parity':
			// Check vector/document ratio from health response. > 2.0 = fail
			return compareVectorParity(target);
		default:
			return source === target ? 'pass' : 'fail';
	}
}

function compareSyncDrift(directusCount, healthJson) {
	try {
		const health = typeof healthJson === 'string' ? JSON.parse(healthJson) : healthJson;
		const agentDataCount = health?.data_integrity?.document_count ?? health?.document_count;
		if (agentDataCount == null) return 'fail';
		const dc = Number(directusCount);
		const ad = Number(agentDataCount);
		// Agent Data should have >= Directus published docs (AD includes registries/ etc)
		// Drift = AD has significantly FEWER than Directus published docs
		if (ad >= dc) return 'pass'; // AD has more or equal — normal
		const deficit = dc - ad;
		return deficit <= 5 ? 'pass' : 'fail'; // Allow small deficit
	} catch {
		return 'error';
	}
}

function compareVectorParity(healthJson) {
	try {
		const health = typeof healthJson === 'string' ? JSON.parse(healthJson) : healthJson;
		const ratio = health?.data_integrity?.ratio;
		if (ratio == null) return 'error';
		return Number(ratio) <= 2.0 ? 'pass' : 'fail';
	} catch {
		return 'error';
	}
}

module.exports = { runPgVsNuxtCheck };
