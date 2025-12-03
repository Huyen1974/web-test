import { readItems } from '@directus/sdk';
import {
	KnowledgeCategory,
	ZONE_TO_CATEGORY_MAP,
	CATEGORY_CONFIG,
	toSlug,
	type TaxonomyMenuItem,
} from '~/types/knowledge-taxonomy';

/**
 * Category tree node with zones and topics
 */
export interface CategoryTreeNode {
	category: KnowledgeCategory;
	displayName: string;
	displayNameEn: string;
	icon: string;
	zones: ZoneTreeNode[];
	documentCount: number;
}

/**
 * Zone tree node with topics
 */
export interface ZoneTreeNode {
	zone: string;
	zoneSlug: string;
	category: KnowledgeCategory;
	topics: TopicTreeNode[];
	documentCount: number;
}

/**
 * Topic tree node with document references
 */
export interface TopicTreeNode {
	topic: string;
	topicSlug: string;
	zone: string;
	zoneSlug: string;
	category: KnowledgeCategory;
	documentIds: string[];
	documentCount: number;
}

/**
 * Taxonomy tree structure
 */
export interface TaxonomyTree {
	categories: CategoryTreeNode[];
	totalDocuments: number;
	hasError: boolean;
	errorMessage?: string;
}

/**
 * Fetch all published knowledge documents and build taxonomy tree
 */
export async function useTaxonomyTree(): Promise<TaxonomyTree> {
	try {
		// Fetch all published, public knowledge documents
		const documents = await useDirectus(
			readItems('knowledge_documents', {
				filter: {
					status: { _eq: 'published' },
					visibility: { _eq: 'public' },
				},
				fields: ['id', 'title', 'category', 'tags'],
				limit: 1000, // Reasonable limit to avoid overwhelming the system
			}),
		);

		if (!documents || documents.length === 0) {
			return {
				categories: [],
				totalDocuments: 0,
				hasError: false,
			};
		}

		// Group documents by taxonomy
		const taxonomyMap = new Map<KnowledgeCategory, Map<string, Map<string, string[]>>>();

		for (const doc of documents) {
			// Extract zone from category field
			const zone = doc.category || 'Other';
			const zoneSlug = toSlug(zone);

			// Derive category from zone
			const category = ZONE_TO_CATEGORY_MAP[zone] || KnowledgeCategory.DEVELOPMENT;

			// Extract primary topic from tags[0]
			const primaryTopic = doc.tags?.[0] || 'Uncategorized';
			const topicSlug = toSlug(primaryTopic);

			// Initialize nested maps if not exists
			if (!taxonomyMap.has(category)) {
				taxonomyMap.set(category, new Map());
			}

			const zonesMap = taxonomyMap.get(category)!;

			if (!zonesMap.has(zone)) {
				zonesMap.set(zone, new Map());
			}

			const topicsMap = zonesMap.get(zone)!;

			if (!topicsMap.has(primaryTopic)) {
				topicsMap.set(primaryTopic, []);
			}

			topicsMap.get(primaryTopic)!.push(doc.id);
		}

		// Build category tree nodes
		const categories: CategoryTreeNode[] = [];

		for (const [category, zonesMap] of taxonomyMap.entries()) {
			const zones: ZoneTreeNode[] = [];
			let categoryDocCount = 0;

			for (const [zone, topicsMap] of zonesMap.entries()) {
				const topics: TopicTreeNode[] = [];
				let zoneDocCount = 0;

				for (const [topic, documentIds] of topicsMap.entries()) {
					topics.push({
						topic,
						topicSlug: toSlug(topic),
						zone,
						zoneSlug: toSlug(zone),
						category,
						documentIds,
						documentCount: documentIds.length,
					});

					zoneDocCount += documentIds.length;
				}

				// Sort topics by document count (descending), then alphabetically
				topics.sort((a, b) => {
					if (b.documentCount !== a.documentCount) {
						return b.documentCount - a.documentCount;
					}

					return a.topic.localeCompare(b.topic);
				});

				zones.push({
					zone,
					zoneSlug: toSlug(zone),
					category,
					topics,
					documentCount: zoneDocCount,
				});

				categoryDocCount += zoneDocCount;
			}

			// Sort zones by document count (descending), then alphabetically
			zones.sort((a, b) => {
				if (b.documentCount !== a.documentCount) {
					return b.documentCount - a.documentCount;
				}

				return a.zone.localeCompare(b.zone);
			});

			const categoryMeta = CATEGORY_CONFIG[category];

			categories.push({
				category,
				displayName: categoryMeta.displayName,
				displayNameEn: categoryMeta.displayNameEn,
				icon: categoryMeta.icon,
				zones,
				documentCount: categoryDocCount,
			});
		}

		// Sort categories by document count (descending)
		categories.sort((a, b) => b.documentCount - a.documentCount);

		return {
			categories,
			totalDocuments: documents.length,
			hasError: false,
		};
	} catch (error) {
		// Graceful degradation: return empty tree with error flag
		return {
			categories: [],
			totalDocuments: 0,
			hasError: true,
			errorMessage: error instanceof Error ? error.message : 'Unknown error',
		};
	}
}

/**
 * Build menu items from taxonomy tree for UI rendering
 */
export function buildTaxonomyMenuItems(tree: TaxonomyTree): TaxonomyMenuItem[] {
	const menuItems: TaxonomyMenuItem[] = [];

	for (const categoryNode of tree.categories) {
		const categoryChildren: TaxonomyMenuItem[] = [];

		for (const zoneNode of categoryNode.zones) {
			const zoneChildren: TaxonomyMenuItem[] = [];

			for (const topicNode of zoneNode.topics) {
				zoneChildren.push({
					label: topicNode.topic,
					to: `/knowledge?zone=${encodeURIComponent(zoneNode.zone)}&topic=${encodeURIComponent(topicNode.topic)}`,
					level: 2,
					count: topicNode.documentCount,
				});
			}

			categoryChildren.push({
				label: zoneNode.zone,
				to: `/knowledge?zone=${encodeURIComponent(zoneNode.zone)}`,
				level: 1,
				count: zoneNode.documentCount,
				children: zoneChildren,
			});
		}

		menuItems.push({
			label: categoryNode.displayName,
			to: '/knowledge',
			level: 0,
			count: categoryNode.documentCount,
			icon: categoryNode.icon,
			children: categoryChildren,
		});
	}

	return menuItems;
}
