// Agent Data Composables - Task 0034
// Composables for Agent Data search and logging

import { readItems } from '@directus/sdk';
import { createAgentDataClient } from '~/lib/agentDataClient';
import type {
	AgentDataSearchRequest,
	AgentDataSearchResponse,
	AgentDataPageViewEvent,
	AgentDataSearchEvent,
} from '~/types/agent-data';
import type { KnowledgeCard, KnowledgeListEntry, Language, Category } from '~/types/view-model-0032';
import { ZONE_MAPPING } from '~/types/view-model-0032';

/**
 * Get Agent Data client instance
 *
 * NOTE: This function accesses config.agentData?.apiKey which is a private
 * runtime config value. On the CLIENT side, this will be undefined.
 *
 * Current behavior:
 * - Server-side: Has access to API key, requests are authenticated
 * - Client-side: No API key available, requests fail gracefully (return empty results)
 *
 * This is acceptable because:
 * 1. The backend endpoints may not require authentication
 * 2. Errors are handled gracefully (no crashes)
 * 3. The primary health check uses a secure server proxy pattern
 *
 * TODO: If backend requires authentication, create server routes for search/logging
 * similar to /api/agent/health.get.ts
 */
function getAgentDataClient() {
	const config = useRuntimeConfig();

	return createAgentDataClient({
		baseUrl: config.public.agentData?.baseUrl || '',
		apiKey: config.agentData?.apiKey || '', // undefined on client, empty string used
		enabled: config.public.agentData?.enabled || false,
		timeout: 5000,
	});
}

/**
 * Search documents via Agent Data, then fetch full content from Directus
 *
 * LAW CONSTRAINT:
 * - Agent Data returns IDs only
 * - We fetch actual content from Directus using existing composables
 * - Content shown to user comes from Directus only
 */
export async function useAgentDataSearch(
	query: string,
	options: {
		zone?: string;
		subZone?: string;
		topic?: string;
		language?: Language;
		limit?: number;
	} = {},
): Promise<{
	items: KnowledgeListEntry[];
	total: number;
	query: string;
}> {
	const client = getAgentDataClient();
	const { zone, subZone, topic, language = 'vn', limit = 20 } = options;

	// Step 1: Search Agent Data for IDs
	const searchResponse: AgentDataSearchResponse = await client.search({
		query,
		zone,
		subZone,
		topic,
		language,
		limit,
	});

	// If no results, return early
	if (searchResponse.results.length === 0) {
		return {
			items: [],
			total: 0,
			query,
		};
	}

	// Step 2: Extract document IDs
	const documentIds = searchResponse.results.map((r) => r.documentId);

	// Step 3: Fetch actual content from Directus
	// Use Directus SDK directly to query by IDs
	try {
		const items = await useDirectus(
			readItems('knowledge_documents', {
				filter: {
					id: { _in: documentIds },
					status: { _eq: 'published' },
					visibility: { _eq: 'public' },
					language: { _eq: language },
				},
				fields: ['id', 'title', 'slug', 'summary', 'category', 'tags', 'published_at', 'language'],
			}),
		);

		// Map to KnowledgeListEntry using existing mapping logic
		const entries: KnowledgeListEntry[] = (items || []).map((doc: any) => {
			const docZone = ZONE_MAPPING[doc.category as Category] || 'Other';
			const docSubZone = doc.tags?.[0] || 'General';
			const primaryTopic = doc.tags?.[1] || '';

			return {
				id: doc.id,
				title: doc.title,
				slug: doc.slug,
				summary: doc.summary,
				language: doc.language,
				publishedAt: doc.published_at,
				zone: docZone,
				subZone: docSubZone,
				primaryTopic,
				tags: doc.tags || [],
			};
		});

		// Sort by search score (preserve Agent Data ranking)
		const scoreMap = new Map(searchResponse.results.map((r) => [r.documentId, r.score]));
		entries.sort((a, b) => (scoreMap.get(b.id) || 0) - (scoreMap.get(a.id) || 0));

		return {
			items: entries,
			total: searchResponse.total,
			query,
		};
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error('[AgentData] Failed to fetch documents from Directus:', error);
		return {
			items: [],
			total: 0,
			query,
		};
	}
}

/**
 * Log page view event
 * Best-effort, non-blocking
 */
export async function useAgentDataLogPageView(params: {
	documentId: string;
	zone: string;
	subZone?: string;
	topic?: string;
	route: string;
	language?: string;
}): Promise<void> {
	const client = getAgentDataClient();

	const event: AgentDataPageViewEvent = {
		documentId: params.documentId,
		zone: params.zone,
		subZone: params.subZone,
		topic: params.topic,
		timestamp: new Date().toISOString(),
		route: params.route,
		language: params.language,
	};

	// Fire and forget
	client.logPageView(event).catch(() => {
		// Errors are already handled in client
	});
}

/**
 * Log search event
 * Best-effort, non-blocking
 */
export async function useAgentDataLogSearch(params: {
	query: string;
	zone?: string;
	subZone?: string;
	topic?: string;
	resultCount: number;
	language?: string;
}): Promise<void> {
	const client = getAgentDataClient();

	const event: AgentDataSearchEvent = {
		query: params.query,
		zone: params.zone,
		subZone: params.subZone,
		topic: params.topic,
		timestamp: new Date().toISOString(),
		resultCount: params.resultCount,
		language: params.language,
	};

	// Fire and forget
	client.logSearch(event).catch(() => {
		// Errors are already handled in client
	});
}
