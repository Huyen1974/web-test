import { readItems } from '@directus/sdk';
import { mapToCard } from './useKnowledge';
import type { KnowledgeCard } from '~/types/view-model-0032';

/**
 * Fetch all versions of a document by version group ID
 */
export async function useKnowledgeHistory(versionGroupId: string) {
	return await useAsyncData(`history-${versionGroupId}`, async () => {
		try {
			if (!versionGroupId) return [];

			const items = await useDirectus(
				readItems('knowledge_documents', {
					filter: {
						version_group_id: { _eq: versionGroupId },
						// We don't filter by is_current_version=true because we want ALL versions
						status: { _neq: 'archived' }, // Optional: hide archived if desired, but requirements say "See all versions"
					},
					sort: ['-version_number'], // Newest first
					limit: 50, // Reasonable limit
					fields: ['*'],
				}),
			);

			if (!items || items.length === 0) return [];

			return items.map(mapToCard);
		} catch (error) {
			// console.error('Error fetching history:', error);
			return [];
		}
	});
}
