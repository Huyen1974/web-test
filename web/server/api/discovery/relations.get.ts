/**
 * GET /api/discovery/relations?collection=workflow_steps
 *
 * Returns M2O relations for a Directus collection.
 * Uses admin service token (server-side only).
 * Cached for 5 minutes.
 */

interface RelationInfo {
	field: string;
	relatedCollection: string;
	entityType: string | null;
}

// Simple in-memory cache
const cache: Record<string, { data: RelationInfo[]; ts: number }> = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// collection → entity_type mapping (mirrors collectionMap in detail-sections.ts)
const COLLECTION_ENTITY_MAP: Record<string, string> = {
	checkpoint_types: 'checkpoint_type',
	checkpoint_sets: 'checkpoint_set',
	workflows: 'workflow',
	workflow_steps: 'workflow_step',
	workflow_change_requests: 'wcr',
	dot_tools: 'dot_tool',
	collection_registry: 'collection',
	modules: 'module',
	agents: 'agent',
	ui_pages: 'page',
	meta_catalog: 'catalog',
	table_registry: 'table',
	tasks: 'task',
	entity_dependencies: 'entity_dependency',
};

export default defineEventHandler(async (event) => {
	const query = getQuery(event);
	const collection = query.collection as string;

	if (!collection) {
		throw createError({ statusCode: 400, message: 'collection parameter required' });
	}

	// Check cache
	const cached = cache[collection];
	if (cached && Date.now() - cached.ts < CACHE_TTL) {
		return { data: cached.data };
	}

	const config = useRuntimeConfig();
	const directusUrl = config.directusInternalUrl || config.public?.directusUrl || '';
	const token = config.directusServiceToken || process.env.NUXT_DIRECTUS_SERVICE_TOKEN;

	if (!token) {
		throw createError({ statusCode: 500, message: 'Service token not configured' });
	}

	try {
		const response: any = await $fetch(`${directusUrl}/relations`, {
			headers: { Authorization: `Bearer ${token}` },
			timeout: 10000,
		});

		const allRelations = response?.data || response || [];
		const filtered: RelationInfo[] = [];

		for (const rel of allRelations) {
			const col = rel.collection || '';
			const field = rel.field || '';
			const related = rel.related_collection || '';

			// Only M2O relations FROM the requested collection
			if (col !== collection || !related) continue;
			// Skip system fields
			if (field === 'user_created' || field === 'user_updated') continue;
			if (related.startsWith('directus_')) continue;

			filtered.push({
				field,
				relatedCollection: related,
				entityType: COLLECTION_ENTITY_MAP[related] || null,
			});
		}

		// Also find O2M (reverse relations where other collections point to this one)
		const reverse: RelationInfo[] = [];
		for (const rel of allRelations) {
			const col = rel.collection || '';
			const field = rel.field || '';
			const related = rel.related_collection || '';
			const meta = rel.meta || {};

			if (related !== collection || !col) continue;
			if (field === 'user_created' || field === 'user_updated') continue;
			if (col.startsWith('directus_')) continue;

			reverse.push({
				field,
				relatedCollection: col,
				entityType: COLLECTION_ENTITY_MAP[col] || null,
			});
		}

		const result = { m2o: filtered, o2m: reverse };

		// Cache
		cache[collection] = { data: result as any, ts: Date.now() };

		return { data: result };
	} catch (err: any) {
		throw createError({ statusCode: 502, message: `Failed to fetch relations: ${err.message}` });
	}
});
