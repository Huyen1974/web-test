/**
 * GET /api/registry/counts
 *
 * Returns total record count for managed collections.
 * Used by Điều 31 measurement MSR-D31-101 (PG vs Nuxt comparison).
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
		const resp = await $fetch<any>(`${baseUrl}/items/meta_catalog`, {
			params: {
				'aggregate[sum]': 'record_count',
				'filter[identity_class][_eq]': 'managed',
			},
			headers,
		});

		const total = Number(resp?.data?.[0]?.sum?.record_count ?? 0);
		return { total };
	} catch {
		return { total: 0 };
	}
});
