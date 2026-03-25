/**
 * GET /api/registry/system-issues-detail?sub_class=orphan_dep_target&page=1&limit=50
 *
 * Returns Layer 4 individual issues for a given sub_class.
 * Điều 31 §IV.6-C.
 *
 * Implementation: Fetches by issue_class (Directus filter works), uses
 * issue_type to match sub_class (avoids Directus 403 on sub_class field).
 */

// Map sub_class → { issue_class, issue_type match }
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

export default defineEventHandler(async (event) => {
	const query = getQuery(event);
	const subClass = String(query.sub_class || '');
	const page = Math.max(1, Number(query.page) || 1);
	const limit = Math.min(100, Math.max(1, Number(query.limit) || 50));

	if (!subClass) {
		throw createError({ statusCode: 400, message: 'sub_class query param required' });
	}

	const mapping = SUB_CLASS_MAP[subClass];
	if (!mapping) {
		return { sub_class: subClass, issues: [], total: 0, page, limit };
	}

	const config = useRuntimeConfig();
	// Use PUBLIC Directus URL — internal URL (http://directus:8055) blocks item-level reads
	// for system_issues via service token. External URL with admin token works.
	const baseUrl = config.public?.directusUrl || 'https://directus.incomexsaigoncorp.vn';
	const token = config.directusServiceToken || process.env.NUXT_DIRECTUS_SERVICE_TOKEN;

	if (!token) {
		return { sub_class: subClass, issues: [], total: 0, page, limit };
	}

	const headers = { Authorization: `Bearer ${token}` };

	try {
		// Fetch all items of the issue_class (no sub_class in fields/filter)
		const itemsResp = await $fetch<any>(`${baseUrl}/items/system_issues`, {
			params: {
				'filter[issue_class][_eq]': mapping.issue_class,
				'fields': 'id,code,title,description,entity_type,entity_code,severity,status,date_created,occurrence_count,source_system,issue_type',
				'sort': '-severity,-occurrence_count,-date_created',
				'limit': 800,
			},
			headers,
		});

		// Client-side filter by sub_class match function
		const allMatched = (itemsResp?.data || []).filter(mapping.match);
		const total = allMatched.length;
		const pageItems = allMatched.slice((page - 1) * limit, page * limit);

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

		const pages = Math.ceil(total / limit);
		return { sub_class: subClass, issues, total, page, limit, pages };
	} catch (e) {
		return { sub_class: subClass, issues: [], total: 0, page, limit, pages: 0, error: String(e) };
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
