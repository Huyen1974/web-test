import { readItems } from '@directus/sdk';
import type {
	KnowledgeCard,
	KnowledgeListEntry,
	Language,
	ZONE_MAPPING,
} from '~/types/view-model-0032';
import type { Category } from '~/types/view-model-0032';

/**
 * Map raw Directus document to KnowledgeListEntry
 */
function mapToListEntry(doc: any): KnowledgeListEntry {
	const zone = ZONE_MAPPING[doc.category as Category] || 'Other';
	const subZone = doc.tags?.[0] || 'General';
	const primaryTopic = doc.tags?.[1] || '';

	return {
		id: doc.id,
		title: doc.title,
		slug: doc.slug,
		summary: doc.summary,
		language: doc.language,
		publishedAt: doc.published_at,
		zone,
		subZone,
		primaryTopic,
		tags: doc.tags || [],
	};
}

/**
 * Map raw Directus document to KnowledgeCard
 */
function mapToCard(doc: any): KnowledgeCard {
	const zone = ZONE_MAPPING[doc.category as Category] || 'Other';
	const subZone = doc.tags?.[0] || 'General';
	const topics = doc.tags?.slice(1) || [];
	const readTime = Math.ceil((doc.content?.length || 0) / 200) || 1;

	return {
		id: doc.id,
		title: doc.title,
		slug: doc.slug,
		summary: doc.summary,
		language: doc.language,
		publishedAt: doc.published_at,
		version: doc.version || 1,
		zone,
		subZone,
		topics,
		readTime,
	};
}

interface BlueprintListOptions {
	page?: number;
	pageSize?: number;
	language?: Language;
}

export interface BlueprintList {
	items: KnowledgeListEntry[];
	total: number;
	page: number;
	pageSize: number;
	language?: Language;
}

/**
 * Fetch list of blueprint/design documents
 * Blueprints are knowledge documents with category 'reference' or tagged as 'blueprint'
 */
export async function useBlueprintList(
	options: BlueprintListOptions = {},
): Promise<BlueprintList> {
	const { page = 1, pageSize = 20, language = 'vn' } = options;

	// Build filter - blueprints are reference documents or those tagged with 'blueprint'
	const filter: any = {
		status: { _eq: 'published' },
		visibility: { _eq: 'public' },
		language: { _eq: language },
		_or: [{ category: { _eq: 'reference' } }, { tags: { _contains: 'blueprint' } }],
	};

	try {
		const items = await useDirectus(
			readItems('knowledge_documents', {
				filter,
				sort: ['-published_at'],
				limit: pageSize,
				offset: (page - 1) * pageSize,
				fields: ['id', 'title', 'slug', 'summary', 'category', 'tags', 'published_at', 'language'],
			}),
		);

		const entries = (items || []).map(mapToListEntry);

		return {
			items: entries,
			total: entries.length,
			page,
			pageSize,
			language,
		};
	} catch (error) {
		console.error('Error fetching blueprint list:', error);
		return {
			items: [],
			total: 0,
			page,
			pageSize,
			language,
		};
	}
}

/**
 * Fetch single blueprint document by ID or slug
 */
export async function useBlueprintDetail(identifier: string): Promise<KnowledgeCard | null> {
	try {
		// Determine if identifier is UUID or slug
		const isUuid =
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);

		const filter: any = {
			status: { _eq: 'published' },
			visibility: { _eq: 'public' },
		};

		if (isUuid) {
			filter.id = { _eq: identifier };
		} else {
			filter.slug = { _eq: identifier };
		}

		const items = await useDirectus(
			readItems('knowledge_documents', {
				filter,
				limit: 1,
				fields: ['*'], // All fields for detail view
			}),
		);

		if (!items || items.length === 0) {
			return null;
		}

		return mapToCard(items[0]);
	} catch (error) {
		console.error('Error fetching blueprint detail:', error);
		return null;
	}
}
