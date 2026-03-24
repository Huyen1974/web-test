/**
 * GET /api/registry/system-issues-groups
 *
 * Returns system_issues grouped by issue_type using Directus aggregate API.
 * Used by Layer 2 page to show actionable issue groups.
 * Cached 2 minutes.
 */

let cache: any = null;
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
		return { groups: [], totals: { all: 0, critical: 0, warning: 0, info: 0, group_count: 0 }, cachedAt: new Date().toISOString() };
	}

	const headers = { Authorization: `Bearer ${token}` };

	try {
		// Use Directus aggregate API for grouping — avoids fetching individual records
		const [byType, bySeverity, totalResp] = await Promise.all([
			// Group by issue_type
			$fetch<any>(`${baseUrl}/items/system_issues`, {
				params: {
					'groupBy[]': 'issue_type',
					'aggregate[count]': '*',
					'sort': '-count',
				},
				headers,
			}),
			// Group by severity
			$fetch<any>(`${baseUrl}/items/system_issues`, {
				params: {
					'groupBy[]': 'severity',
					'aggregate[count]': '*',
				},
				headers,
			}),
			// Total count
			$fetch<any>(`${baseUrl}/items/system_issues`, {
				params: { 'meta': 'total_count', 'limit': 0, 'fields': 'id' },
				headers,
			}),
		]);

		const total = totalResp?.meta?.total_count ?? 0;

		// Parse severity totals
		let totalCritical = 0;
		let totalWarning = 0;
		for (const s of (bySeverity?.data || [])) {
			const sev = (s.severity || '').toLowerCase();
			const cnt = Number(s.count?.['*'] ?? s.count ?? 0);
			if (sev === 'critical') totalCritical = cnt;
			else if (sev === 'warning') totalWarning = cnt;
		}

		// Parse groups from issue_type aggregate
		const groups = (byType?.data || [])
			.map((g: any) => {
				const issueType = g.issue_type || 'chưa phân loại';
				const count = Number(g.count?.['*'] ?? g.count ?? 0);
				return {
					key: issueType,
					label: issueType.replace(/_/g, ' '),
					count,
					severity_max: totalCritical > 0 ? 'critical' : totalWarning > 0 ? 'warning' : 'info',
				};
			})
			.filter((g: any) => g.count > 0)
			.sort((a: any, b: any) => b.count - a.count);

		cache = {
			groups,
			totals: {
				all: total,
				critical: totalCritical,
				warning: totalWarning,
				info: Math.max(0, total - totalCritical - totalWarning),
				group_count: groups.length,
			},
			cachedAt: new Date().toISOString(),
		};
		cacheTime = now;
		return cache;
	} catch (e) {
		return { groups: [], totals: { all: 0, critical: 0, warning: 0, info: 0, group_count: 0 }, error: String(e), cachedAt: new Date().toISOString() };
	}
});
