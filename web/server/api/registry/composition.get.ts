/**
 * GET /api/registry/composition
 *
 * Returns composition data for "Thành phần" column:
 * - Per composition_level: species count, collection count
 * - Per collection: species_code, species_name
 * Cached 5 minutes.
 */

interface CompositionData {
	byLevel: Record<string, { speciesCount: number; collectionCount: number }>;
	byCollection: Record<string, { speciesCode: string; speciesName: string }>;
	totalSpecies: number;
	cachedAt: string;
}

let cache: CompositionData | null = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

export default defineEventHandler(async () => {
	const now = Date.now();
	if (cache && now - cacheTime < CACHE_TTL) {
		return cache;
	}

	const config = useRuntimeConfig();
	const baseUrl = config.directusInternalUrl || config.public?.directusUrl || '';
	const token = config.directusServiceToken || process.env.NUXT_DIRECTUS_SERVICE_TOKEN;
	const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

	const [speciesResp, mapResp] = await Promise.all([
		$fetch<any>(`${baseUrl}/items/entity_species`, {
			params: {
				fields: 'code,species_code,display_name,composition_level',
				limit: -1,
			},
			headers,
		}),
		$fetch<any>(`${baseUrl}/items/species_collection_map`, {
			params: {
				fields: 'species_code,collection_name',
				limit: -1,
			},
			headers,
		}),
	]);

	const speciesList = (speciesResp?.data || []) as any[];
	const mapList = (mapResp?.data || []) as any[];

	// Build species lookup
	const speciesLookup: Record<string, { code: string; displayName: string; level: string }> = {};
	for (const s of speciesList) {
		speciesLookup[s.species_code] = {
			code: s.code,
			displayName: s.display_name,
			level: s.composition_level,
		};
	}

	// byCollection: collection → species info
	const byCollection: Record<string, { speciesCode: string; speciesName: string }> = {};
	for (const m of mapList) {
		const sp = speciesLookup[m.species_code];
		byCollection[m.collection_name] = {
			speciesCode: sp?.code || m.species_code,
			speciesName: sp?.displayName || m.species_code,
		};
	}

	// byLevel: composition_level → distinct species count + collection count
	const levelSpecies: Record<string, Set<string>> = {};
	const levelCollections: Record<string, number> = {};
	for (const m of mapList) {
		const sp = speciesLookup[m.species_code];
		const level = sp?.level || 'atom';
		if (!levelSpecies[level]) levelSpecies[level] = new Set();
		levelSpecies[level].add(m.species_code);
		levelCollections[level] = (levelCollections[level] || 0) + 1;
	}

	const byLevel: Record<string, { speciesCount: number; collectionCount: number }> = {};
	for (const [level, speciesSet] of Object.entries(levelSpecies)) {
		byLevel[level] = {
			speciesCount: speciesSet.size,
			collectionCount: levelCollections[level] || 0,
		};
	}

	cache = {
		byLevel,
		byCollection,
		totalSpecies: speciesList.length,
		cachedAt: new Date().toISOString(),
	};
	cacheTime = now;

	return cache;
});
