/**
 * GET /api/registry/system-issues-groups
 *
 * Returns system_issues grouped by issue_type (+ issue_class if available).
 * Used by Layer 2 page to show actionable issue groups instead of flat list.
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
		return { groups: [], totals: { all: 0, critical: 0, warning: 0 }, cachedAt: new Date().toISOString() };
	}

	const headers = { Authorization: `Bearer ${token}` };

	try {
		// Fetch issues with grouping fields
		// Use meta total_count + paginated fetch to handle large collections
		// Legacy records may not have status='open', so fetch all and filter client-side
		const countResp = await $fetch<any>(`${baseUrl}/items/system_issues`, {
			params: { 'meta': 'total_count', 'limit': 0, 'fields': 'id' },
			headers,
		});
		const total = countResp?.meta?.total_count ?? 0;

		// Fetch in pages of 500 to avoid timeout
		const allIssues: any[] = [];
		const pageSize = 500;
		for (let offset = 0; offset < Math.min(total, 5000); offset += pageSize) {
			const page = await $fetch<any>(`${baseUrl}/items/system_issues`, {
				params: {
					'fields': 'id,title,severity,issue_type,issue_class,source_system,status,date_created',
					'limit': pageSize,
					'offset': offset,
					'sort': '-date_created',
				},
				headers,
			});
			allIssues.push(...(page?.data || []));
		}

		// Filter: prefer status='open', but if no records have status → use all
		const openIssues = allIssues.filter((i: any) => i.status === 'open');
		const resp = { data: openIssues.length > 0 ? openIssues : allIssues };

		const issues = resp?.data || [];

		// Group by issue_type (primary) × issue_class (secondary if available)
		const groupMap = new Map<string, { label: string; issues: any[]; severityMax: string }>();

		for (const issue of issues) {
			const issueType = issue.issue_type || 'chưa phân loại';
			const issueClass = issue.issue_class || null;
			const groupKey = issueClass ? `${issueClass} — ${issueType}` : issueType;
			const label = issueClass
				? `${issueClass.replace(/_/g, ' ')} — ${issueType.replace(/_/g, ' ')}`
				: issueType.replace(/_/g, ' ');

			if (!groupMap.has(groupKey)) {
				groupMap.set(groupKey, { label, issues: [], severityMax: 'info' });
			}

			const group = groupMap.get(groupKey)!;
			group.issues.push(issue);

			// Track max severity
			const sev = (issue.severity || 'info').toLowerCase();
			if (sev === 'critical') group.severityMax = 'critical';
			else if (sev === 'warning' && group.severityMax !== 'critical') group.severityMax = 'warning';
		}

		// Convert to sorted array
		const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 };
		const groups = Array.from(groupMap.entries())
			.map(([key, val]) => ({
				key,
				label: val.label,
				count: val.issues.length,
				severity_max: val.severityMax,
				top_issues: val.issues.slice(0, 3).map((i: any) => ({
					id: i.id,
					title: i.title,
					severity: i.severity,
					date_created: i.date_created,
				})),
			}))
			.sort((a, b) => {
				const sa = severityOrder[a.severity_max] ?? 2;
				const sb = severityOrder[b.severity_max] ?? 2;
				if (sa !== sb) return sa - sb;
				return b.count - a.count;
			});

		let totalCritical = 0;
		let totalWarning = 0;
		for (const issue of issues) {
			const sev = (issue.severity || '').toLowerCase();
			if (sev === 'critical') totalCritical++;
			else if (sev === 'warning') totalWarning++;
		}

		cache = {
			groups,
			totals: {
				all: issues.length,
				critical: totalCritical,
				warning: totalWarning,
				info: issues.length - totalCritical - totalWarning,
				group_count: groups.length,
			},
			cachedAt: new Date().toISOString(),
		};
		cacheTime = now;
		return cache;
	} catch {
		return { groups: [], totals: { all: 0, critical: 0, warning: 0, info: 0, group_count: 0 }, cachedAt: new Date().toISOString() };
	}
});
