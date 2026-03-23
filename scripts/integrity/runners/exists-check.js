/**
 * Exists Check Runner — verifies DOM elements exist via page fetch
 * For v1 pilot: fetches HTML and checks for data-testid or keywords
 */

const BASE_URL = process.env.SITE_URL || 'https://vps.incomexsaigoncorp.vn';

async function runExistsCheck(contract, check) {
	const pageUrl = contract.page_url || `${BASE_URL}${contract.route || '/'}`;
	const selector = check.source_dom?.selector;

	if (!selector) {
		return { status: 'pass', values: { expected: 'exists', actual: 'no selector defined' } };
	}

	try {
		const resp = await fetch(pageUrl, { signal: AbortSignal.timeout(20000) });
		if (!resp.ok) {
			return {
				status: 'fail',
				values: { expected: `HTTP 200 at ${pageUrl}`, actual: `HTTP ${resp.status}` },
			};
		}

		const html = await resp.text();

		// Extract data-testid from selector like [data-testid='xxx']
		const testidMatch = selector.match(/data-testid='([^']+)'/);
		if (testidMatch) {
			const testid = testidMatch[1];
			const found = html.includes(`data-testid="${testid}"`) || html.includes(`data-testid='${testid}'`);
			return {
				status: found ? 'pass' : 'fail',
				values: { expected: `data-testid="${testid}" in page`, actual: found ? 'found' : 'not found' },
			};
		}

		// Fallback: check for selector text in HTML (basic)
		const found = html.includes(selector);
		return {
			status: found ? 'pass' : 'fail',
			values: { expected: `"${selector}" in page`, actual: found ? 'found' : 'not found' },
		};
	} catch (e) {
		return {
			status: 'fail',
			values: { expected: 'page accessible', actual: e.message },
		};
	}
}

module.exports = { runExistsCheck };
