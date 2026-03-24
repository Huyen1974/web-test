/**
 * GET /api/registry/system-issues
 *
 * Returns system_issues counts by severity for Registries Row 11.
 * Uses Directus aggregate API (groupBy severity) for accurate counts.
 * Cached for 2 minutes server-side.
 */

let cache: {
	totals: { all: number; critical: number; warning: number; info: number };
	cachedAt: string;
} | null = null;
let cacheTime = 0;
const CACHE_TTL = 2 * 60 * 1000;

export default defineEventHandler(async () => {
	const now = Date.now();
	if (cache && now - cacheTime < CACHE_TTL) {
		return cache;
	}

	const config = useRuntimeConfig();
	const baseUrl = config.directusInternalUrl || config.public?.directusUrl || 'https://directus.incomexsaigoncorp.vn';
	const token = config.directusServiceToken || process.env.NUXT_DIRECTUS_SERVICE_TOKEN;

	if (!token) {
		return {
			totals: { all: 0, critical: 0, warning: 0, info: 0 },
			cachedAt: new Date().toISOString(),
		};
	}

	const headers = { Authorization: `Bearer ${token}` };

	try {
		// Use Directus aggregate API — groupBy severity for accurate counts
		const resp = await $fetch<any>(`${baseUrl}/items/system_issues`, {
			params: {
				'groupBy[]': 'severity',
				'aggregate[count]': '*',
			},
			headers,
		});

		let all = 0;
		let critical = 0;
		let warning = 0;
		let info = 0;

		for (const row of (resp?.data || [])) {
			const sev = (row.severity || '').toUpperCase();
			const cnt = Number(row.count?.['*'] ?? row.count ?? 0);
			all += cnt;
			if (sev === 'CRITICAL') critical = cnt;
			else if (sev === 'WARNING') warning = cnt;
			else if (sev === 'INFO') info += cnt;
		}

		cache = {
			totals: { all, critical, warning, info },
			cachedAt: new Date().toISOString(),
		};
		cacheTime = now;
		return cache;
	} catch {
		return {
			totals: { all: 0, critical: 0, warning: 0, info: 0 },
			cachedAt: new Date().toISOString(),
		};
	}
});
