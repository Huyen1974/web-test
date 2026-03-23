/**
 * GET /api/registry/system-issues
 *
 * Returns system_issues counts by severity for Registries Row 11.
 * Queries Directus system_issues collection with service token.
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
		// Count open issues by severity using Directus aggregate
		const [allResp, criticalResp, warningResp] = await Promise.all([
			$fetch<any>(`${baseUrl}/items/system_issues`, {
				params: {
					'filter[status][_eq]': 'open',
					'meta': 'total_count',
					'limit': 0,
					'fields': 'id',
				},
				headers,
			}),
			$fetch<any>(`${baseUrl}/items/system_issues`, {
				params: {
					'filter[status][_eq]': 'open',
					'filter[severity][_eq]': 'critical',
					'meta': 'total_count',
					'limit': 0,
					'fields': 'id',
				},
				headers,
			}),
			$fetch<any>(`${baseUrl}/items/system_issues`, {
				params: {
					'filter[status][_eq]': 'open',
					'filter[severity][_eq]': 'warning',
					'meta': 'total_count',
					'limit': 0,
					'fields': 'id',
				},
				headers,
			}),
		]);

		const all = allResp?.meta?.total_count ?? allResp?.meta?.filter_count ?? 0;
		const critical = criticalResp?.meta?.total_count ?? criticalResp?.meta?.filter_count ?? 0;
		const warning = warningResp?.meta?.total_count ?? warningResp?.meta?.filter_count ?? 0;
		const info = all - critical - warning;

		cache = {
			totals: {
				all: Number(all),
				critical: Number(critical),
				warning: Number(warning),
				info: Math.max(0, Number(info)),
			},
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
