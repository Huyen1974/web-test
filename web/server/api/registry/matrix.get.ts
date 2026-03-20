/**
 * GET /api/registry/matrix
 *
 * Returns entity matrix data: all entities with their multi-dimensional scores.
 * Assembles from meta_catalog, entity_labels, universal_edges.
 * Cached for 5 minutes server-side.
 */

interface MatrixEntity {
	code: string;
	name: string;
	collection: string;
	compositionLevel: string;
	categoryName: string;
	edgesOut: number;
	edgesIn: number;
	edgesTotal: number;
	labelCount: number;
	facetsCovered: number;
	completenessScore: number;
}

interface MatrixResponse {
	entities: MatrixEntity[];
	summary: {
		total: number;
		byScore: Record<number, number>;
		byLevel: Record<string, number>;
	};
	cachedAt: string;
}

// Collection → { codeField, nameField }
const COLLECTION_MAP: Record<string, { codeField: string; nameField: string }> = {
	meta_catalog: { codeField: 'code', nameField: 'name' },
	table_registry: { codeField: 'table_id', nameField: 'name' },
	modules: { codeField: 'code', nameField: 'name' },
	workflows: { codeField: 'process_code', nameField: 'title' },
	workflow_steps: { codeField: 'code', nameField: 'title' },
	workflow_change_requests: { codeField: 'code', nameField: 'title' },
	dot_tools: { codeField: 'code', nameField: 'name' },
	ui_pages: { codeField: 'code', nameField: 'name' },
	collection_registry: { codeField: 'code', nameField: 'name' },
	tasks: { codeField: 'code', nameField: 'name' },
	agents: { codeField: 'code', nameField: 'name' },
	checkpoint_types: { codeField: 'code', nameField: 'name' },
	checkpoint_sets: { codeField: 'code', nameField: 'name' },
	entity_dependencies: { codeField: 'code', nameField: 'code' },
	table_proposals: { codeField: 'code', nameField: 'code' },
	checkpoint_instances: { codeField: 'code', nameField: 'code' },
	system_issues: { codeField: 'code', nameField: 'title' },
	taxonomy: { codeField: 'code', nameField: 'name' },
	trigger_registry: { codeField: 'code', nameField: 'trigger_name' },
};

let cache: { data: MatrixResponse; ts: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

async function fetchJson(url: string, token: string): Promise<any> {
	const res: any = await $fetch(url, {
		headers: { Authorization: `Bearer ${token}` },
		timeout: 15000,
	});
	return res?.data ?? res ?? [];
}

export default defineEventHandler(async () => {
	if (cache && Date.now() - cache.ts < CACHE_TTL) {
		return cache.data;
	}

	const config = useRuntimeConfig();
	const baseUrl = config.directusInternalUrl || config.public?.directusUrl || 'https://directus.incomexsaigoncorp.vn';
	const token = config.directusServiceToken || process.env.NUXT_DIRECTUS_SERVICE_TOKEN;

	if (!token) {
		throw createError({ statusCode: 500, message: 'Service token not configured' });
	}

	// 1. Fetch meta_catalog for composition levels
	const catalog: any[] = await fetchJson(
		`${baseUrl}/items/meta_catalog?fields=code,name,composition_level,registry_collection&limit=-1`,
		token,
	);
	const collectionMeta = new Map<string, { compositionLevel: string; categoryName: string }>();
	for (const c of catalog) {
		if (c.registry_collection) {
			collectionMeta.set(c.registry_collection, {
				compositionLevel: c.composition_level || '',
				categoryName: c.name || '',
			});
		}
	}

	// 2. Fetch all entities from each collection in parallel
	const entityMap = new Map<string, { code: string; name: string; collection: string }>();
	const fetchPromises = Object.entries(COLLECTION_MAP).map(async ([col, cfg]) => {
		try {
			const items: any[] = await fetchJson(
				`${baseUrl}/items/${col}?fields=id,${cfg.codeField},${cfg.nameField}&limit=-1`,
				token,
			);
			for (const item of items) {
				const code = item[cfg.codeField];
				if (!code) continue;
				entityMap.set(code, {
					code,
					name: item[cfg.nameField] || code,
					collection: col,
				});
			}
		} catch {
			// Skip collections with errors
		}
	});
	await Promise.all(fetchPromises);

	// 3. Fetch entity_labels for label counts
	const labels: any[] = await fetchJson(
		`${baseUrl}/items/entity_labels?fields=entity_code,label_code&limit=-1`,
		token,
	);
	const labelCountMap = new Map<string, { count: number; facets: Set<string> }>();

	// Need facet mapping for facets_covered
	const taxonomyItems: any[] = await fetchJson(
		`${baseUrl}/items/taxonomy?fields=code,facet_id&limit=-1`,
		token,
	);
	const labelFacetMap = new Map<string, number>();
	for (const t of taxonomyItems) {
		labelFacetMap.set(t.code, t.facet_id);
	}

	for (const el of labels) {
		if (!el.entity_code) continue;
		let entry = labelCountMap.get(el.entity_code);
		if (!entry) {
			entry = { count: 0, facets: new Set() };
			labelCountMap.set(el.entity_code, entry);
		}
		entry.count++;
		const facetId = labelFacetMap.get(el.label_code);
		if (facetId) entry.facets.add(String(facetId));
	}

	// 4. Fetch universal_edges for edge counts
	const edges: any[] = await fetchJson(
		`${baseUrl}/items/universal_edges?fields=source_code,target_code&filter[status][_eq]=active&limit=-1`,
		token,
	);
	const edgeOutMap = new Map<string, number>();
	const edgeInMap = new Map<string, number>();
	for (const e of edges) {
		if (e.source_code) edgeOutMap.set(e.source_code, (edgeOutMap.get(e.source_code) || 0) + 1);
		if (e.target_code) edgeInMap.set(e.target_code, (edgeInMap.get(e.target_code) || 0) + 1);
	}

	// 5. Assemble matrix
	const entities: MatrixEntity[] = [];
	const byScore: Record<number, number> = {};
	const byLevel: Record<string, number> = {};

	for (const [code, entity] of entityMap) {
		const meta = collectionMeta.get(entity.collection);
		const compositionLevel = meta?.compositionLevel || '';
		const categoryName = meta?.categoryName || '';
		const edgesOut = edgeOutMap.get(code) || 0;
		const edgesIn = edgeInMap.get(code) || 0;
		const labelInfo = labelCountMap.get(code);
		const labelCount = labelInfo?.count || 0;
		const facetsCovered = labelInfo?.facets.size || 0;

		const hasName = entity.name && entity.name.trim() !== '' && entity.name !== code ? 1 : 0;
		const hasComposition = compositionLevel ? 1 : 0;
		const hasEdges = edgesOut + edgesIn > 0 ? 1 : 0;
		const hasLabels = labelCount > 0 ? 1 : 0;
		const completenessScore = hasName + hasComposition + hasEdges + hasLabels;

		entities.push({
			code,
			name: entity.name,
			collection: entity.collection,
			compositionLevel,
			categoryName,
			edgesOut,
			edgesIn,
			edgesTotal: edgesOut + edgesIn,
			labelCount,
			facetsCovered,
			completenessScore,
		});

		byScore[completenessScore] = (byScore[completenessScore] || 0) + 1;
		const lvl = compositionLevel || 'unclassified';
		byLevel[lvl] = (byLevel[lvl] || 0) + 1;
	}

	// Sort by completeness ascending (worst first)
	entities.sort((a, b) => a.completenessScore - b.completenessScore || a.code.localeCompare(b.code));

	const result: MatrixResponse = {
		entities,
		summary: {
			total: entities.length,
			byScore,
			byLevel,
		},
		cachedAt: new Date().toISOString(),
	};

	cache = { data: result, ts: Date.now() };
	return result;
});
