/**
 * GET /api/registry/system-issues
 *
 * Returns system_issues counts by severity for Registries Row 11.
 * Uses Directus aggregate API (groupBy severity) for accurate counts.
 * Cached for 2 minutes server-side.
 */

let cache: {
	totals: { all: number; critical: number; warning: number; info: number; group_count: number };
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
	const baseUrl = config.directusInternalUrl || config.public?.directusUrl || '';
	const token = config.directusServiceToken || process.env.NUXT_DIRECTUS_SERVICE_TOKEN;

	if (!token) {
		return {
			totals: { all: 0, critical: 0, warning: 0, info: 0, group_count: 0 },
			cachedAt: new Date().toISOString(),
		};
	}

	const headers = { Authorization: `Bearer ${token}` };

	try {
		// Two aggregate queries: severity counts + issue_class group count
		const [bySeverity, byClass] = await Promise.all([
			$fetch<any>(`${baseUrl}/items/system_issues`, {
				params: { 'groupBy[]': 'severity', 'aggregate[count]': '*', 'filter[status][_eq]': 'open' },
				headers,
			}),
			$fetch<any>(`${baseUrl}/items/system_issues`, {
				params: { 'groupBy[]': 'issue_class', 'aggregate[count]': '*', 'filter[status][_eq]': 'open' },
				headers,
			}),
		]);

		let all = 0;
		let critical = 0;
		let warning = 0;
		let info = 0;

		for (const row of (bySeverity?.data || [])) {
			const sev = (row.severity || '').toUpperCase();
			const cnt = Number(row.count?.['*'] ?? row.count ?? 0);
			all += cnt;
			if (sev === 'CRITICAL') critical = cnt;
			else if (sev === 'WARNING') warning = cnt;
			else if (sev === 'INFO') info += cnt;
		}

		const group_count = (byClass?.data || []).filter((r: any) => Number(r.count?.['*'] ?? r.count ?? 0) > 0).length;

		cache = {
			totals: { all, critical, warning, info, group_count },
			cachedAt: new Date().toISOString(),
		};
		cacheTime = now;
		return cache;
	} catch {
		return {
			totals: { all: 0, critical: 0, warning: 0, info: 0, group_count: 0 },
			cachedAt: new Date().toISOString(),
		};
	}
});
