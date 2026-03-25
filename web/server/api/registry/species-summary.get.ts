/**
 * GET /api/registry/species-summary
 *
 * Returns species count for active species.
 * Used by Điều 31 measurement MSR-D31-102 (PG vs Nuxt comparison).
 * Response: { total: number }
 */

export default defineEventHandler(async () => {
	const config = useRuntimeConfig();
	const baseUrl = config.directusInternalUrl || config.public?.directusUrl || 'https://directus.incomexsaigoncorp.vn';
	const token = config.directusServiceToken || process.env.NUXT_DIRECTUS_SERVICE_TOKEN;

	if (!token) {
		return { total: 0 };
	}

	const headers = { Authorization: `Bearer ${token}` };

	try {
		const resp = await $fetch<any>(`${baseUrl}/items/entity_species`, {
			params: {
				'aggregate[count]': '*',
				'filter[status][_eq]': 'active',
			},
			headers,
		});

		const total = Number(resp?.data?.[0]?.count ?? 0);
		return { total };
	} catch {
		return { total: 0 };
	}
});
