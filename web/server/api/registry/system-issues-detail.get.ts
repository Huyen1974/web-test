/**
 * GET /api/registry/system-issues-detail?sub_class=orphan_dep_target&page=1&limit=50
 *
 * Returns Layer 4 individual issues for a given sub_class.
 * Điều 31 §IV.6-C: Each issue points to exact fix address.
 */

export default defineEventHandler(async (event) => {
	const query = getQuery(event);
	const subClass = String(query.sub_class || '');
	const page = Math.max(1, Number(query.page) || 1);
	const limit = Math.min(100, Math.max(1, Number(query.limit) || 50));
	const offset = (page - 1) * limit;

	if (!subClass) {
		throw createError({ statusCode: 400, message: 'sub_class query param required' });
	}

	const config = useRuntimeConfig();
	const baseUrl = config.directusInternalUrl || config.public?.directusUrl || 'https://directus.incomexsaigoncorp.vn';
	const token = config.directusServiceToken || process.env.NUXT_DIRECTUS_SERVICE_TOKEN;

	if (!token) {
		return { sub_class: subClass, issues: [], total: 0, page, limit };
	}

	const headers = { Authorization: `Bearer ${token}` };

	try {
		const [itemsResp, countResp] = await Promise.all([
			$fetch<any>(`${baseUrl}/items/system_issues`, {
				params: {
					'filter[sub_class][_eq]': subClass,
					'fields': 'id,code,title,description,entity_type,entity_code,severity,status,date_created,occurrence_count,source_system,issue_class',
					'sort': '-severity,-occurrence_count,-date_created',
					'limit': limit,
					'offset': offset,
				},
				headers,
			}),
			$fetch<any>(`${baseUrl}/items/system_issues`, {
				params: {
					'filter[sub_class][_eq]': subClass,
					'aggregate[count]': '*',
				},
				headers,
			}),
		]);

		const total = Number(countResp?.data?.[0]?.count ?? 0);
		const issues = (itemsResp?.data || []).map((r: any) => ({
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
