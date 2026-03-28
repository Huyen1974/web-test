/**
 * GET /api/registry/pivot-query?code=PIV-101
 *
 * Điều 26 v3.5 Mission 3 — Cross-table pivot query results.
 * Reads pivot_definitions from Directus, then queries warm-tier VIEWs
 * or falls back to PG function results cached in pivot_definitions metadata.
 *
 * §0-AV: reads via Directus API (service token), never PG direct.
 *
 * Query params:
 *   code  — specific pivot code (e.g. PIV-101). Omit for all cross-table pivots.
 *   type  — 'cross' (default) for group_spec pivots, 'all' for everything
 */

export default defineEventHandler(async (event) => {
	const config = useRuntimeConfig();
	const baseUrl = config.directusInternalUrl || config.public?.directusUrl || 'https://directus.incomexsaigoncorp.vn';
	const token = config.directusServiceToken || process.env.NUXT_DIRECTUS_SERVICE_TOKEN;

	if (!token) {
		throw createError({ statusCode: 500, statusMessage: 'Service token not configured' });
	}

	const query = getQuery(event);
	const code = query.code as string | undefined;
	const type = (query.type as string) || 'cross';
	const headers = { Authorization: `Bearer ${token}` };

	try {
		// Fetch pivot_definitions from Directus
		const filter: Record<string, any> = { is_active: { _eq: true } };
		if (code) {
			filter.code = { _eq: code };
		} else if (type === 'cross') {
			// Only pivots with group_spec populated
			filter.group_spec = { _neq: '{"groups":[]}' };
		}

		const resp = await $fetch<any>(`${baseUrl}/items/pivot_definitions`, {
			params: {
				'fields': 'code,name,source_object,filter_spec,group_spec,metric_spec,composition_level,registry_group,display_order',
				'filter': JSON.stringify(filter),
				'sort': 'display_order',
				'limit': -1,
			},
			headers,
		});

		const definitions = resp?.data || [];

		// For each definition with group_spec, try to read from warm-tier VIEW
		const VIEW_MAP: Record<string, string> = {
			'PIV-101': 'v_pivot_by_level',
			'PIV-103': 'v_pivot_species_by_level',
			'PIV-104': 'v_pivot_dot_by_category',
		};

		const results: any[] = [];

		for (const def of definitions) {
			const viewName = VIEW_MAP[def.code];
			let rows: any[] = [];

			if (viewName) {
				// Read from warm-tier VIEW via Directus
				try {
					const viewResp = await $fetch<any>(`${baseUrl}/items/${viewName}`, {
						params: { limit: -1 },
						headers,
					});
					rows = viewResp?.data || [];
				} catch {
					// VIEW not accessible, skip
				}
			}

			results.push({
				code: def.code,
				name: def.name,
				source_object: def.source_object,
				group_spec: def.group_spec,
				metric_spec: def.metric_spec,
				composition_level: def.composition_level,
				rows,
			});
		}

		return {
			definitions: definitions.length,
			results,
			timestamp: new Date().toISOString(),
		};
	} catch (err: any) {
		throw createError({ statusCode: 500, statusMessage: err?.message || 'Pivot query failed' });
	}
});
