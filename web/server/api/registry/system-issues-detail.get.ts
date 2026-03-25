/**
 * GET /api/registry/system-issues-detail?sub_class=orphan_dep_target&page=1&limit=50
 *
 * Returns Layer 4 individual issues for a given sub_class.
 * Điều 31 §IV.6-C: pagination if >50.
 *
 * Uses issue_type matching to avoid Directus sub_class field permission issues.
 */

const SUB_CLASS_MAP: Record<string, { issue_class: string; match: (r: any) => boolean }> = {
	orphan_dep_target: { issue_class: 'render_fault', match: r => r.issue_type === 'link_hỏng' && (r.title || '').includes('target') },
	orphan_dep_source: { issue_class: 'render_fault', match: r => r.issue_type === 'link_hỏng' && (r.title || '').includes('source') },
	missing_registry_config: { issue_class: 'render_fault', match: r => r.issue_type === 'lỗi_lớp_2' },
	stale_check: { issue_class: 'render_fault', match: r => r.source_system === 'dieu31-runner' },
	no_dependencies: { issue_class: 'data_fault', match: r => r.issue_type === 'thiếu_quan_hệ' },
	missing_identifier: { issue_class: 'data_fault', match: r => r.issue_type === 'thiếu_mã_định_danh' },
	catalog_incomplete: { issue_class: 'data_fault', match: r => r.issue_type !== 'thiếu_quan_hệ' && r.issue_type !== 'thiếu_mã_định_danh' },
	count_drift: { issue_class: 'sync_fault', match: () => true },
	cascade_failure: { issue_class: 'contract_fault', match: () => true },
	runner_liveness: { issue_class: 'watchdog_fault', match: () => true },
};

let cache: Record<string, { data: any[]; cachedAt: number }> = {};
const CACHE_TTL = 2 * 60 * 1000;

export default defineEventHandler(async (event) => {
	const query = getQuery(event);
	const subClass = String(query.sub_class || '');
	const page = Math.max(1, Number(query.page) || 1);
	const limit = Math.min(100, Math.max(1, Number(query.limit) || 50));

	if (!subClass) throw createError({ statusCode: 400, message: 'sub_class required' });

	const mapping = SUB_CLASS_MAP[subClass];
	if (!mapping) return { sub_class: subClass, issues: [], total: 0, page, limit, pages: 0 };

	const config = useRuntimeConfig();
	const baseUrl = config.directusInternalUrl || config.public?.directusUrl || 'https://directus.incomexsaigoncorp.vn';
	const token = config.directusServiceToken || process.env.NUXT_DIRECTUS_SERVICE_TOKEN;
	if (!token) return { sub_class: subClass, issues: [], total: 0, page, limit, pages: 0 };

	const headers = { Authorization: `Bearer ${token}` };
	const cacheKey = mapping.issue_class;

	try {
		// Use cache to avoid re-fetching large datasets
		let allItems: any[];
		const now = Date.now();
		if (cache[cacheKey] && now - cache[cacheKey].cachedAt < CACHE_TTL) {
			allItems = cache[cacheKey].data;
		} else {
			// Fetch by issue_class using aggregate-style meta count + items
			// Use only fields that the service token CAN read (no sub_class)
			const resp = await $fetch<any>(`${baseUrl}/items/system_issues`, {
				params: {
					'filter[issue_class][_eq]': mapping.issue_class,
					'fields': 'id,code,title,entity_type,entity_code,severity,status,detected_at,occurrence_count,source_system,issue_type',
					'sort': 'id',
					'limit': 800,
				},
				headers,
			});
			allItems = resp?.data || [];
			cache[cacheKey] = { data: allItems, cachedAt: now };
		}

		// Client-side filter + sort
		const matched = allItems.filter(mapping.match)
			.sort((a: any, b: any) => {
				const sevOrder: Record<string, number> = { CRITICAL: 0, WARNING: 1, INFO: 2 };
				const sa = sevOrder[(a.severity || '').toUpperCase()] ?? 3;
				const sb = sevOrder[(b.severity || '').toUpperCase()] ?? 3;
				if (sa !== sb) return sa - sb;
				return (b.occurrence_count || 0) - (a.occurrence_count || 0);
			});

		const total = matched.length;
		const pages = Math.ceil(total / limit);
		const pageItems = matched.slice((page - 1) * limit, page * limit);

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
