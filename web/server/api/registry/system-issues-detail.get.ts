/**
 * GET /api/registry/system-issues-detail?sub_class=orphan_dep_target&page=1&limit=50
 *
 * Returns Layer 4 individual issues for a given sub_class.
 * Điều 31 §IV.6-C: Each issue points to exact fix address.
 *
 * Note: Uses aggregate+groupBy for count (works with sub_class),
 * then fetches items with issue_class filter + client-side sub_class filter
 * (workaround for Directus permission issue with new fields in filters).
 */

// Map sub_class → issue_class (for Directus filter fallback)
const SUB_CLASS_TO_CLASS: Record<string, string> = {
	orphan_dep_target: 'render_fault',
	orphan_dep_source: 'render_fault',
	missing_registry_config: 'render_fault',
	stale_check: 'render_fault',
	no_dependencies: 'data_fault',
	missing_identifier: 'data_fault',
	catalog_incomplete: 'data_fault',
	count_drift: 'sync_fault',
	cascade_failure: 'contract_fault',
	runner_liveness: 'watchdog_fault',
};

export default defineEventHandler(async (event) => {
	const query = getQuery(event);
	const subClass = String(query.sub_class || '');
	const page = Math.max(1, Number(query.page) || 1);
	const limit = Math.min(100, Math.max(1, Number(query.limit) || 50));

	if (!subClass) {
		throw createError({ statusCode: 400, message: 'sub_class query param required' });
	}

	const issueClass = SUB_CLASS_TO_CLASS[subClass] || '';
	const config = useRuntimeConfig();
	const baseUrl = config.directusInternalUrl || config.public?.directusUrl || 'https://directus.incomexsaigoncorp.vn';
	const token = config.directusServiceToken || process.env.NUXT_DIRECTUS_SERVICE_TOKEN;

	if (!token) {
		return { sub_class: subClass, issues: [], total: 0, page, limit };
	}

	const headers = { Authorization: `Bearer ${token}` };

	try {
		// Get count via aggregate (works with groupBy sub_class)
		const countResp = await $fetch<any>(`${baseUrl}/items/system_issues`, {
			params: {
				'filter[issue_class][_eq]': issueClass || undefined,
				'groupBy[]': 'sub_class',
				'aggregate[count]': '*',
			},
			headers,
		});

		const total = Number(
			(countResp?.data || []).find((r: any) => r.sub_class === subClass)?.count?.['*']
			?? (countResp?.data || []).find((r: any) => r.sub_class === subClass)?.count
			?? 0,
		);

		// Fetch items by issue_class (filter works), then filter by sub_class client-side
		const fetchLimit = Math.min(limit * 3, 200); // Over-fetch to ensure enough after filter
		const itemsResp = await $fetch<any>(`${baseUrl}/items/system_issues`, {
			params: {
				'filter[issue_class][_eq]': issueClass || undefined,
				'fields': 'id,code,title,description,entity_type,entity_code,severity,status,date_created,occurrence_count,source_system,issue_class,sub_class',
				'sort': '-severity,-occurrence_count,-date_created',
				'limit': fetchLimit,
			},
			headers,
		});

		// Client-side filter by sub_class
		const allItems = (itemsResp?.data || []).filter((r: any) => r.sub_class === subClass);
		const pageItems = allItems.slice((page - 1) * limit, page * limit);

		const issues = pageItems.map((r: any) => ({
			id: r.id,
			code: r.code,
			entity_code: r.entity_code,
			entity_type: r.entity_type,
			title: r.title,
			description: r.description,
			severity: r.severity,
			status: r.status,
			date_created: r.date_created,
			occurrence_count: r.occurrence_count || 1,
			source_system: r.source_system,
			entity_url: buildEntityUrl(r),
		}));

		return { sub_class: subClass, issues, total, page, limit };
	} catch (e) {
		return { sub_class: subClass, issues: [], total: 0, page, limit, error: String(e) };
	}
});

function buildEntityUrl(issue: any): string {
	const et = issue.entity_type || '';
	const ec = issue.entity_code || '';
	if (et === 'catalog' || et === 'meta_catalog') return `/knowledge/registries`;
	if (et === 'collection') return `/knowledge/registries/health`;
	if (ec.startsWith('DOT-')) return `/knowledge/registries/dot_tools`;
	return `/admin/content/system_issues/${issue.id}`;
}
