/**
 * GET /api/transitive/:code
 *
 * Returns indirectly related entities via BFS (depth ≤ 3).
 * Queries entity_dependencies to find transitive relationships.
 */

interface TransitiveResult {
	code: string;
	type: string;
	depth: number;
	path: string[];
}

export default defineEventHandler(async (event) => {
	const code = getRouterParam(event, 'code');
	if (!code) {
		throw createError({ statusCode: 400, message: 'code parameter required' });
	}

	const config = useRuntimeConfig();
	const directusUrl = config.directusInternalUrl || config.public?.directusUrl || 'https://directus.incomexsaigoncorp.vn';
	const token = config.directusServiceToken || process.env.NUXT_DIRECTUS_SERVICE_TOKEN;

	if (!token) {
		throw createError({ statusCode: 500, message: 'Service token not configured' });
	}

	const MAX_DEPTH = 3;
	const headers = { Authorization: `Bearer ${token}` };

	// BFS: find all entities reachable within MAX_DEPTH hops
	const visited = new Set<string>([code]);
	// Queue: [entityCode, depth, pathSoFar]
	let queue: [string, number, string[]][] = [[code, 0, []]];
	const directNeighbors = new Set<string>();
	const results: TransitiveResult[] = [];

	async function getNeighbors(entityCode: string): Promise<{ code: string; type: string }[]> {
		try {
			const resp: any = await $fetch(`${directusUrl}/items/entity_dependencies`, {
				headers,
				params: {
					'filter[_or][0][source_code][_eq]': entityCode,
					'filter[_or][1][target_code][_eq]': entityCode,
					'fields': 'source_code,source_type,target_code,target_type',
					'limit': 50,
				},
				timeout: 5000,
			});

			const deps = resp?.data || [];
			const neighbors: { code: string; type: string }[] = [];

			for (const dep of deps) {
				if (dep.source_code === entityCode) {
					neighbors.push({ code: dep.target_code, type: dep.target_type });
				} else {
					neighbors.push({ code: dep.source_code, type: dep.source_type });
				}
			}

			return neighbors;
		} catch {
			return [];
		}
	}

	while (queue.length > 0) {
		const nextQueue: [string, number, string[]][] = [];

		for (const [currentCode, depth, path] of queue) {
			if (depth >= MAX_DEPTH) continue;

			const neighbors = await getNeighbors(currentCode);

			for (const neighbor of neighbors) {
				if (visited.has(neighbor.code)) continue;
				visited.add(neighbor.code);

				const newPath = [...path, currentCode];

				if (depth === 0) {
					// Direct neighbors — track but don't include in results
					directNeighbors.add(neighbor.code);
				} else {
					// Indirect — these are the transitive results
					results.push({
						code: neighbor.code,
						type: neighbor.type,
						depth: depth + 1,
						path: [...newPath.slice(1)], // exclude root from path display
					});
				}

				nextQueue.push([neighbor.code, depth + 1, newPath]);
			}
		}

		queue = nextQueue;
	}

	// Sort by depth, then code
	results.sort((a, b) => a.depth - b.depth || a.code.localeCompare(b.code));

	return {
		code,
		direct_count: directNeighbors.size,
		transitive: results.slice(0, 20),
	};
});
