/**
 * Health Gate — checks production is alive before running integrity checks
 */

const BASE_URL = process.env.SITE_URL;
if (!BASE_URL) throw new Error('Missing required env: SITE_URL');
const DIRECTUS_URL = process.env.DIRECTUS_URL;
if (!DIRECTUS_URL) throw new Error('Missing required env: DIRECTUS_URL');

async function checkHealth() {
	const endpoints = [
		{ name: 'Nuxt Frontend', url: `${BASE_URL}/knowledge` },
		{ name: 'Directus Health', url: `${DIRECTUS_URL}/server/health` },
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
