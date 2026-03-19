import { readItems } from '@directus/sdk';
import { reverseCollectionMap, prefixMap } from '~/config/detail-sections';

export interface EdgeItem {
	code: string;
	collection: string;
	link: string | null;
}

export interface UniversalEdgesData {
	belongsTo: EdgeItem[];
	contains: EdgeItem[];
	uses: EdgeItem[];
	usedBy: EdgeItem[];
	groupWith: EdgeItem[];
	similarTo: EdgeItem[];
}

function emptyEdges(): UniversalEdgesData {
	return { belongsTo: [], contains: [], uses: [], usedBy: [], groupWith: [], similarTo: [] };
}

function resolveEntityLink(collection: string, code: string): string | null {
	const entityType = reverseCollectionMap[collection];
	if (entityType && code) return `/knowledge/registries/${entityType}/${code}`;
	const match = code.match(/^([A-Z]+)-/);
	if (match) {
		const et = prefixMap[match[1]];
		if (et) return `/knowledge/registries/${et}/${code}`;
	}
	return null;
}

export function useUniversalEdges(key: string, entityCode: Ref<string> | ComputedRef<string>) {
	const { $directus } = useNuxtApp();

	return useAsyncData(
		`edges-${key}`,
		async () => {
			const code = toValue(entityCode);
			if (!code) return emptyEdges();

			try {
				const [outgoing, incoming] = await Promise.all([
					$directus.request(
						readItems('universal_edges' as any, {
							filter: { source_code: { _eq: code }, status: { _eq: 'active' } },
							fields: ['edge_type', 'target_code', 'target_collection'],
							limit: 200,
						}),
					),
					$directus.request(
						readItems('universal_edges' as any, {
							filter: { target_code: { _eq: code }, status: { _eq: 'active' } },
							fields: ['edge_type', 'source_code', 'source_collection'],
							limit: 200,
						}),
					),
				]);

				const result = emptyEdges();

				for (const e of outgoing as any[]) {
					const item: EdgeItem = {
						code: e.target_code,
						collection: e.target_collection,
						link: resolveEntityLink(e.target_collection, e.target_code),
					};
					switch (e.edge_type) {
						case 'BELONGS_TO': result.belongsTo.push(item); break;
						case 'CONTAINS': result.contains.push(item); break;
						case 'USES': result.uses.push(item); break;
						case 'USED_BY': result.usedBy.push(item); break;
						case 'GROUP_WITH': result.groupWith.push(item); break;
						case 'SIMILAR_TO': result.similarTo.push(item); break;
					}
				}

				for (const e of incoming as any[]) {
					const item: EdgeItem = {
						code: e.source_code,
						collection: e.source_collection,
						link: resolveEntityLink(e.source_collection, e.source_code),
					};
					if (e.edge_type === 'USES') result.usedBy.push(item);
					if (e.edge_type === 'GROUP_WITH') result.groupWith.push(item);
					if (e.edge_type === 'SIMILAR_TO') result.similarTo.push(item);
				}

				return result;
			} catch {
				return emptyEdges();
			}
		},
		{ default: () => emptyEdges() },
	);
}
