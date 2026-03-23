/**
 * GET /api/registry/raw-counts
 *
 * Returns raw record counts per managed collection (no cache).
 * Used by Điều 31 integrity runner for db_vs_db checks.
 * Requires service token.
 */

export default defineEventHandler(async () => {
	const config = useRuntimeConfig();
	const baseUrl = config.directusInternalUrl || config.public?.directusUrl || 'https://directus.incomexsaigoncorp.vn';
	const token = config.directusServiceToken || process.env.NUXT_DIRECTUS_SERVICE_TOKEN;

	if (!token) {
		throw createError({ statusCode: 500, statusMessage: 'Service token not configured' });
	}

	const headers = { Authorization: `Bearer ${token}` };

	// Get all managed collections from meta_catalog
	const catalogResp = await $fetch<any>(`${baseUrl}/items/meta_catalog`, {
		params: {
			'fields': 'code,name,entity_type,record_count,composition_level,identity_class',
			'filter[identity_class][_in]': 'managed,log',
			'limit': -1,
		},
		headers,
	});

	const entries = (catalogResp?.data || []).map((c: any) => ({
		code: c.code,
		name: c.name,
		entity_type: c.entity_type,
		record_count: c.record_count || 0,
		composition_level: c.composition_level,
		identity_class: c.identity_class,
	}));

	// Get system_issues counts
	const [allResp, critResp, warnResp] = await Promise.all([
		$fetch<any>(`${baseUrl}/items/system_issues`, {
			params: { 'filter[status][_eq]': 'open', 'meta': 'total_count', 'limit': 0, 'fields': 'id' },
			headers,
		}),
		$fetch<any>(`${baseUrl}/items/system_issues`, {
			params: { 'filter[status][_eq]': 'open', 'filter[severity][_eq]': 'critical', 'meta': 'total_count', 'limit': 0, 'fields': 'id' },
			headers,
		}),
		$fetch<any>(`${baseUrl}/items/system_issues`, {
			params: { 'filter[status][_eq]': 'open', 'filter[severity][_eq]': 'warning', 'meta': 'total_count', 'limit': 0, 'fields': 'id' },
			headers,
		}),
	]);

	return {
		collections: entries,
		total_managed: entries.filter((e: any) => e.identity_class === 'managed').length,
		total_records: entries.reduce((s: number, e: any) => s + (e.record_count || 0), 0),
		system_issues: {
			all: Number(allResp?.meta?.total_count ?? 0),
			critical: Number(critResp?.meta?.total_count ?? 0),
			warning: Number(warnResp?.meta?.total_count ?? 0),
		},
		timestamp: new Date().toISOString(),
	};
});
