/**
 * GET /api/registry/species-matrix
 *
 * Returns species matrix data from v_species_matrix PG VIEW.
 * Cached for 5 minutes server-side.
 */

interface SpeciesMatrixRow {
	species_code: string;
	display_name: string;
	composition_level: string;
	management_mode: string;
	total: number;
	certified: number;
	uncertified: number;
}

let cache: { data: SpeciesMatrixRow[]; cachedAt: string } | null = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export default defineEventHandler(async () => {
	const now = Date.now();
	if (cache && now - cacheTime < CACHE_TTL) {
		return cache;
	}

	const config = useRuntimeConfig();
	const directusUrl = config.public?.directusUrl || process.env.NUXT_PUBLIC_DIRECTUS_URL || 'https://directus.incomexsaigoncorp.vn';

	// Auth
	const loginResp = await $fetch<any>(`${directusUrl}/auth/login`, {
		method: 'POST',
		body: {
			email: process.env.DIRECTUS_ADMIN_EMAIL,
			password: process.env.DIRECTUS_ADMIN_PASSWORD,
		},
	}).catch(() => null);

	const token = loginResp?.data?.access_token;
	if (!token) {
		throw createError({ statusCode: 500, statusMessage: 'Auth failed' });
	}

	// Query entity_species + birth_registry aggregate
	const [species, births] = await Promise.all([
		$fetch<any>(`${directusUrl}/items/entity_species`, {
			params: {
				'fields': 'code,species_code,display_name,composition_level,management_mode',
				'filter[management_mode][_eq]': 'governed',
				'limit': -1,
				'sort': 'code',
			},
			headers: { Authorization: `Bearer ${token}` },
		}),
		$fetch<any>(`${directusUrl}/items/birth_registry`, {
			params: {
				'fields': 'species_code,certified',
				'filter[governance_role][_eq]': 'governed',
				'limit': -1,
			},
			headers: { Authorization: `Bearer ${token}` },
		}),
	]);

	// Aggregate births by species_code
	const birthMap: Record<string, { total: number; certified: number; uncertified: number }> = {};
	for (const b of (births?.data || [])) {
		const sc = b.species_code;
		if (!sc) continue;
		if (!birthMap[sc]) birthMap[sc] = { total: 0, certified: 0, uncertified: 0 };
		birthMap[sc].total++;
		if (b.certified) birthMap[sc].certified++;
		else birthMap[sc].uncertified++;
	}

	// Build matrix rows
	const data: SpeciesMatrixRow[] = ((species?.data || []) as any[]).map((s) => {
		const bm = birthMap[s.species_code] || { total: 0, certified: 0, uncertified: 0 };
		return {
			species_code: s.code,
			display_name: s.display_name,
			composition_level: s.composition_level,
			management_mode: s.management_mode,
			total: bm.total,
			certified: bm.certified,
			uncertified: bm.uncertified,
		};
	}).sort((a, b) => b.total - a.total);

	cache = { data, cachedAt: new Date().toISOString() };
	cacheTime = now;

	return cache;
});
