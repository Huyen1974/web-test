/**
 * Health Gate — checks production is alive before running integrity checks
 */

const BASE_URL = process.env.SITE_URL || 'https://vps.incomexsaigoncorp.vn';

async function checkHealth() {
	const endpoints = [
		{ name: 'Nuxt Frontend', url: `${BASE_URL}/knowledge` },
		{ name: 'Directus Health', url: 'https://directus.incomexsaigoncorp.vn/server/health' },
	];

	for (const ep of endpoints) {
		try {
			const resp = await fetch(ep.url, { signal: AbortSignal.timeout(15000) });
			if (!resp.ok) {
				return { ok: false, error: `${ep.name}: HTTP ${resp.status}` };
			}
		} catch (e) {
			return { ok: false, error: `${ep.name}: ${e.message}` };
		}
	}
	return { ok: true };
}

module.exports = { checkHealth };
