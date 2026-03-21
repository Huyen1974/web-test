/**
 * GET /api/registry/health
 *
 * Returns registry health: source count vs birth count per governed collection.
 * Calls PG function fn_registry_health() — metadata-driven, no code change when adding collections.
 * Cached for 2 minutes server-side.
 */

interface HealthRow {
	collection_name: string;
	noi_chua: number;
	noi_sinh: number;
	gap: number;
	status: 'KHOP' | 'ORPHAN' | 'PHANTOM';
}

let cache: { collections: HealthRow[]; totals: { khop: number; orphan: number; phantom: number; totalGap: number }; cachedAt: string } | null = null;
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
		throw createError({ statusCode: 500, statusMessage: 'Service token not configured' });
	}

	// Call PG function via Directus custom endpoint or raw query
	// Since fn_registry_health() is a PG function, we query it via the Directus API
	// by reading from it as if it's a collection (it returns TABLE)
	// Alternative: use a raw SQL query via a custom Directus endpoint

	// Approach: query birth_registry + each governed collection via Directus API
	// For efficiency, get birth counts in bulk, then compare with collection counts

	const headers = { Authorization: `Bearer ${token}` };

	// Get all species_collection_map entries (governed collections)
	const scmResp = await $fetch<any>(`${baseUrl}/items/species_collection_map`, {
		params: { 'fields': 'species_code,collection_name', 'limit': -1 },
		headers,
	});

	// Get collection_registry for governance_role filter
	const crResp = await $fetch<any>(`${baseUrl}/items/collection_registry`, {
		params: {
			'fields': 'collection_name,governance_role',
			'filter[governance_role][_eq]': 'governed',
			'limit': -1,
		},
		headers,
	});

	const governedSet = new Set((crResp?.data || []).map((c: any) => c.collection_name));
	const mappedCollections = (scmResp?.data || [])
		.filter((m: any) => governedSet.has(m.collection_name))
		.map((m: any) => m.collection_name);
	const uniqueCollections = [...new Set(mappedCollections)] as string[];

	// Get birth counts per collection
	const birthResp = await $fetch<any>(`${baseUrl}/items/birth_registry`, {
		params: {
			'fields': 'collection_name',
			'filter[governance_role][_eq]': 'governed',
			'limit': -1,
		},
		headers,
	});

	const birthCounts: Record<string, number> = {};
	for (const b of (birthResp?.data || [])) {
		const cn = b.collection_name;
		birthCounts[cn] = (birthCounts[cn] || 0) + 1;
	}

	// Get source counts per collection
	const collections: HealthRow[] = [];
	for (const cn of uniqueCollections) {
		try {
			const resp = await $fetch<any>(`${baseUrl}/items/${cn}`, {
				params: { 'aggregate[count]': '*', 'limit': 0 },
				headers,
			});
			const sourceCount = resp?.data?.[0]?.count || 0;
			const birthCount = birthCounts[cn] || 0;
			const gap = sourceCount - birthCount;
			collections.push({
				collection_name: cn,
				noi_chua: Number(sourceCount),
				noi_sinh: birthCount,
				gap,
				status: gap === 0 ? 'KHOP' : gap > 0 ? 'ORPHAN' : 'PHANTOM',
			});
		} catch {
			collections.push({
				collection_name: cn,
				noi_chua: -1,
				noi_sinh: birthCounts[cn] || 0,
				gap: -1,
				status: 'ORPHAN',
			});
		}
	}

	collections.sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap));

	const totals = {
		khop: collections.filter(c => c.status === 'KHOP').length,
		orphan: collections.filter(c => c.status === 'ORPHAN').length,
		phantom: collections.filter(c => c.status === 'PHANTOM').length,
		totalGap: collections.reduce((s, c) => s + Math.abs(c.gap), 0),
	};

	cache = { collections, totals, cachedAt: new Date().toISOString() };
	cacheTime = now;

	return cache;
});
