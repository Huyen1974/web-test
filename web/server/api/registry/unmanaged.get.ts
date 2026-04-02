/**
 * GET /api/registry/unmanaged
 *
 * Returns observed + excluded collection counts.
 * Cached for 5 minutes.
 */

import { isRegistryE2EFixtureMode, registryUnmanagedFixture } from '~/server/utils/registryE2EFixtures';

interface UnmanagedRow {
	collection_name: string;
	governance_role: string;
}

let cache: { collections: UnmanagedRow[]; totals: { observed: number; excluded: number; total: number }; cachedAt: string } | null = null;
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

	if (!token) {
		if (isRegistryE2EFixtureMode()) {
			return registryUnmanagedFixture;
		}
		throw createError({ statusCode: 500, statusMessage: 'Service token not configured' });
	}

	const headers = { Authorization: `Bearer ${token}` };

	const resp = await $fetch<any>(`${baseUrl}/items/collection_registry`, {
		params: {
			'fields': 'collection_name,governance_role',
			'filter[governance_role][_in]': 'observed,excluded',
			'limit': -1,
			'sort': 'governance_role,collection_name',
		},
		headers,
	});

	const collections: UnmanagedRow[] = (resp?.data || []).map((c: any) => ({
		collection_name: c.collection_name,
		governance_role: c.governance_role,
	}));

	const observed = collections.filter(c => c.governance_role === 'observed').length;
	const excluded = collections.filter(c => c.governance_role === 'excluded').length;

	cache = {
		collections,
		totals: { observed, excluded, total: observed + excluded },
		cachedAt: new Date().toISOString(),
	};
	cacheTime = now;

	return cache;
});
