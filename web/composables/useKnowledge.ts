import { readItems } from '@directus/sdk';
import type { KnowledgeCard, KnowledgeListEntry, KnowledgeList, Language } from '~/types/view-model-0032';
import { DIRECTUS_TO_VIEW_MODEL_MAPPING, ZONE_MAPPING } from '~/types/view-model-0032';
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
		// Approval metadata (Task 0035)
		status: doc.status || 'draft',
		updatedAt: doc.date_updated || null,
		// Workflow & Versioning fields (Task 0047C)
		workflowStatus: doc.workflow_status,
		versionNumber: doc.version_number,
		isCurrentVersion: doc.is_current_version,
		childOrder: doc.child_order || null,
	};
}

/**
 * Map raw Directus document to KnowledgeCard
 */
export function mapToCard(doc: any): KnowledgeCard {
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
		content: doc.content,
		// Approval metadata (Task 0035)
		status: doc.status || 'draft',
		updatedBy: doc.user_updated || null,
		updatedAt: doc.date_updated || null,
		// Workflow & Versioning fields (Task 0047C)
		workflowStatus: doc.workflow_status,
		versionGroupId: doc.version_group_id,
		versionNumber: doc.version_number,
		isCurrentVersion: doc.is_current_version,
		previousVersionId: doc.previous_version_id || null,
		reviewedBy: doc.reviewed_by || null,
		reviewedAt: doc.reviewed_at || null,
		approvedBy: doc.approved_by || null,
		approvedAt: doc.approved_at || null,
		publisherId: doc.publisher_id || null,
		rejectionReason: doc.rejection_reason || null,
		purgeAfter: doc.purge_after || null,
		parentDocumentId: doc.parent_document_id || null,
		childOrder: doc.child_order || null,
	};
}

interface KnowledgeListOptions {
	page?: number;
	pageSize?: number;
	zone?: string;
	subZone?: string;
	topic?: string;
	language?: Language;
}

/**
 * Fetch list of knowledge documents with filtering
 */
export async function useKnowledgeList(options: KnowledgeListOptions = {}): Promise<KnowledgeList> {
	const { page = 1, pageSize = 20, zone, subZone, topic, language = 'vn' } = options;

	// Build filter
	const filter: any = {
		status: { _eq: 'published' },
		visibility: { _eq: 'public' },
		language: { _eq: language },
		is_current_version: { _eq: true }, // Task 0047C: Only show current versions
	};

	// Add zone filter (maps to category)
	if (zone) {
		const categoryKey = Object.keys(ZONE_MAPPING).find((key) => ZONE_MAPPING[key as Category] === zone);

		if (categoryKey) {
			filter.category = { _eq: categoryKey };
		}
	}

	// Note: subZone and topic filtering would require client-side filtering
	// since they come from tags array, which Directus can't filter by array index

	try {
		const items = await useDirectus(
			readItems('knowledge_documents', {
				filter,
				sort: ['-published_at'],
				limit: pageSize,
				offset: (page - 1) * pageSize,
				fields: [
					'id',
					'title',
					'slug',
					'summary',
					'category',
					'tags',
					'published_at',
					'language',
					'status',
					'date_updated',
					// Task 0047C: Workflow & Versioning fields
					'workflow_status',
					'version_number',
					'is_current_version',
					'child_order',
				],
			}),
		);

		// Client-side filtering for subZone and topic if needed
		let filteredItems = items || [];

		if (subZone || topic) {
			filteredItems = filteredItems.filter((doc: any) => {
				if (subZone && doc.tags?.[0] !== subZone) return false;
				if (topic && !doc.tags?.includes(topic)) return false;
				return true;
			});
		}

		const entries = filteredItems.map(mapToListEntry);

		return {
			items: entries,
			total: entries.length, // Note: This is approximate due to client-side filtering
			page,
			pageSize,
			zone,
			subZone,
			topic,
			language,
		};
	} catch (error) {
		return {
			items: [],
			total: 0,
			page,
			pageSize,
			zone,
			subZone,
			topic,
			language,
		};
	}
}

/**
 * Fetch single knowledge document by ID or slug
 */
export async function useKnowledgeDetail(identifier: string): Promise<KnowledgeCard | null> {
	try {
		// Determine if identifier is UUID or slug
		const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);

		const filter: any = {
			status: { _eq: 'published' },
			visibility: { _eq: 'public' },
			is_current_version: { _eq: true }, // Task 0047C: Only show current versions
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
		return null;
	}
}
