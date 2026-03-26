/**
 * GET /api/registry/system-issues-detail?sub_class=orphan_dep_target&page=1&limit=50
 *
 * Returns Layer 4 individual issues for a given sub_class.
 * Điều 31 §IV.6-C: pagination if >50.
 *
 * DYNAMIC: queries by sub_class directly from Directus. No hardcoded mapping.
 * Auto-extends when new sub_classes appear in system_issues.
 */

let cache: Record<string, { data: any[]; cachedAt: number }> = {};
const CACHE_TTL = 2 * 60 * 1000;

export default defineEventHandler(async (event) => {
	const query = getQuery(event);
	const subClass = String(query.sub_class || '');
	const page = Math.max(1, Number(query.page) || 1);
	const limit = Math.min(100, Math.max(1, Number(query.limit) || 50));

	if (!subClass) throw createError({ statusCode: 400, message: 'sub_class required' });

	const config = useRuntimeConfig();
	const baseUrl = config.directusInternalUrl || config.public?.directusUrl || 'https://directus.incomexsaigoncorp.vn';
	const token = config.directusServiceToken || process.env.NUXT_DIRECTUS_SERVICE_TOKEN;
	if (!token) return { sub_class: subClass, issues: [], total: 0, page, limit, pages: 0 };

	const headers = { Authorization: `Bearer ${token}` };

	try {
		let allItems: any[];
		const now = Date.now();
		if (cache[subClass] && now - cache[subClass].cachedAt < CACHE_TTL) {
			allItems = cache[subClass].data;
		} else {
			// Query directly by sub_class (dynamic — no hardcoded mapping needed)
			const resp = await $fetch<any>(`${baseUrl}/items/system_issues`, {
				params: {
					'filter[sub_class][_eq]': subClass,
					'filter[status][_eq]': 'open',
					'fields': 'id,code,title,entity_type,entity_code,severity,status,detected_at,occurrence_count,source_system,issue_type,sub_class',
					'sort': '-severity,id',
					'limit': 800,
				},
				headers,
			});
			allItems = resp?.data || [];
			cache[subClass] = { data: allItems, cachedAt: now };
		}

		// Sort by severity then occurrence_count
		const sorted = allItems.sort((a: any, b: any) => {
			const sevOrder: Record<string, number> = { CRITICAL: 0, WARNING: 1, INFO: 2 };
			const sa = sevOrder[(a.severity || '').toUpperCase()] ?? 3;
			const sb = sevOrder[(b.severity || '').toUpperCase()] ?? 3;
			if (sa !== sb) return sa - sb;
			return (b.occurrence_count || 0) - (a.occurrence_count || 0);
		});

		const total = sorted.length;
		const pages = Math.ceil(total / limit);
		const pageItems = sorted.slice((page - 1) * limit, page * limit);

		const issues = pageItems.map((r: any) => ({
			id: r.id, code: r.code, entity_code: r.entity_code, entity_type: r.entity_type,
			title: r.title, severity: r.severity, status: r.status,
			date_created: r.detected_at, occurrence_count: r.occurrence_count || 1,
			source_system: r.source_system,
			entity_url: buildEntityUrl(r),
		}));

		return { sub_class: subClass, issues, total, page, limit, pages };
	} catch (e) {
		return { sub_class: subClass, issues: [], total: 0, page, limit, pages: 0, error: String(e) };
	}
});

function buildEntityUrl(issue: any): string {
	const et = issue.entity_type || '';
	if (et === 'catalog') return `/knowledge/registries`;
	if (et === 'collection') return `/knowledge/registries/health`;
	if ((issue.entity_code || '').startsWith('DOT-')) return `/knowledge/registries/dot_tools`;
	return `/admin/content/system_issues/${issue.id}`;
}
