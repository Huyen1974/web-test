/**
 * GET /api/registry/system-issues-groups
 *
 * Returns system_issues grouped by issue_class (Điều 31 taxonomy)
 * with per-group severity breakdown.
 * Uses Directus aggregate API. Cached 2 minutes.
 */

let cache: any = null;
let cacheTime = 0;
const CACHE_TTL = 2 * 60 * 1000;

// Human-readable labels for issue_class (Điều 31 §IV.6)
const CLASS_LABELS: Record<string, string> = {
	render_fault: 'Lỗi hiển thị',
	data_fault: 'Lỗi dữ liệu',
	sync_fault: 'Lỗi đồng bộ',
	contract_fault: 'Lỗi hợp đồng',
	infra_fault: 'Lỗi hạ tầng',
	watchdog_fault: 'Watchdog',
};

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
		// Two aggregate queries: by issue_class+severity (for per-group breakdown) and by severity (for totals)
		const [byClassSev, bySeverity] = await Promise.all([
			$fetch<any>(`${baseUrl}/items/system_issues`, {
				params: {
					'groupBy[]': ['issue_class', 'severity'],
					'aggregate[count]': '*',
					'filter[status][_eq]': 'open',
				},
				headers,
			}),
			$fetch<any>(`${baseUrl}/items/system_issues`, {
				params: {
					'groupBy[]': 'severity',
					'aggregate[count]': '*',
					'filter[status][_eq]': 'open',
				},
				headers,
			}),
		]);

		// Parse severity totals
		let totalAll = 0;
		let totalCritical = 0;
		let totalWarning = 0;
		for (const s of (bySeverity?.data || [])) {
			const sev = (s.severity || '').toUpperCase();
			const cnt = Number(s.count?.['*'] ?? s.count ?? 0);
			totalAll += cnt;
			if (sev === 'CRITICAL') totalCritical = cnt;
			else if (sev === 'WARNING') totalWarning = cnt;
		}

		// Build groups from issue_class + severity cross-tab
		const groupMap = new Map<string, { count: number; critical: number; warning: number }>();
		for (const row of (byClassSev?.data || [])) {
			const cls = row.issue_class || 'unclassified';
			const sev = (row.severity || '').toUpperCase();
			const cnt = Number(row.count?.['*'] ?? row.count ?? 0);

			if (!groupMap.has(cls)) {
				groupMap.set(cls, { count: 0, critical: 0, warning: 0 });
			}
			const g = groupMap.get(cls)!;
			g.count += cnt;
			if (sev === 'CRITICAL') g.critical += cnt;
			else if (sev === 'WARNING') g.warning += cnt;
		}

		const groups = Array.from(groupMap.entries())
			.map(([cls, g]) => ({
				key: cls,
				label: CLASS_LABELS[cls] || cls.replace(/_/g, ' '),
				count: g.count,
				critical: g.critical,
				warning: g.warning,
				severity_max: g.critical > 0 ? 'critical' : g.warning > 0 ? 'warning' : 'info',
			}))
			.filter(g => g.count > 0)
			.sort((a, b) => b.count - a.count);

		cache = {
			groups,
			totals: {
				all: totalAll,
				critical: totalCritical,
				warning: totalWarning,
				info: Math.max(0, totalAll - totalCritical - totalWarning),
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
