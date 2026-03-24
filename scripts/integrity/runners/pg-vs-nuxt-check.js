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
			targetValue = extractValue(m.target_query, data);
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
	const delta = result === 'pass' ? '0' : `${sourceValue} ≠ ${targetValue}`;

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
		default:
			return source === target ? 'pass' : 'fail';
	}
}

module.exports = { runPgVsNuxtCheck };
