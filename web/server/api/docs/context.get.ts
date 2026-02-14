/**
 * Summary Layer Endpoint for AI Agents
 * WEB-34B: Fix /api/docs/context 404 gap
 *
 * Provides AI with a bird's-eye view of the knowledge base structure
 * without needing to fetch all documents.
 *
 * Returns:
 * - Total document count
 * - Category/zone structure with counts
 * - Recent updates summary
 * - Key topics overview (Vietnamese-aware)
 */

export default defineEventHandler(async (event) => {
	const config = useRuntimeConfig();

	// Get Directus URL (read env directly for server-side)
	const directusUrl =
		process.env.NUXT_PUBLIC_DIRECTUS_URL ||
		config.public.directusUrl ||
		'https://directus.incomexsaigoncorp.vn';

	try {
		// agent_views is publicly readable - no auth needed
		// Note: Do NOT use Cloud Run identity tokens for Directus
		// Directus uses its own token system, not Cloud Run identity tokens

		// Fetch all published documents with minimal fields
		const docsResponse = await fetch(
			`${directusUrl}/items/agent_views?fields=id,title,doc_type,status,date_updated,tags&filter[status][_eq]=published&limit=-1`
		);

		if (!docsResponse.ok) {
			throw new Error(`Directus error: ${docsResponse.status} ${docsResponse.statusText}`);
		}

		const docsData = await docsResponse.json();
		const documents = docsData.data || [];

		// Handle empty case gracefully
		if (documents.length === 0) {
			console.warn('[docs/context] No published documents found');
			return {
				success: true,
				summary: {
					total_documents: 0,
					last_updated: new Date().toISOString(),
					description: 'Knowledge base is empty or no published documents',
				},
				structure: { zones: [], doc_types: {}, zone_count: 0 },
				recent_updates: { period_days: 7, count: 0, items: [] },
				key_topics: [],
				_meta: {
					endpoint: '/api/docs/context',
					purpose: 'AI Summary Layer - provides structure without full content',
					usage: 'Call this first to understand KB structure before searching',
				},
			};
		}

		// Build structure summary
		const structure = buildStructureSummary(documents);

		// Get recent updates (last 7 days)
		const recentUpdates = getRecentUpdates(documents, 7);

		// Extract key topics (Vietnamese-aware)
		const keyTopics = extractKeyTopics(documents);

		return {
			success: true,
			summary: {
				total_documents: documents.length,
				last_updated: new Date().toISOString(),
				description: 'Knowledge base structure for Incomex Saigon Corp Business Operating System',
			},
			structure: structure,
			recent_updates: recentUpdates,
			key_topics: keyTopics,
			_meta: {
				endpoint: '/api/docs/context',
				purpose: 'AI Summary Layer - provides structure without full content',
				usage: 'Call this first to understand KB structure before searching',
			},
		};
	} catch (error) {
		console.error('[docs/context] Error:', error);
		throw createError({
			statusCode: 500,
			message: 'Failed to fetch knowledge base context',
			data: { error: (error as Error).message },
		});
	}
});

/**
 * Build hierarchical structure summary
 */
function buildStructureSummary(documents: any[]) {
	const byDocType: Record<string, any> = {};
	const byType: Record<string, number> = {};

	documents.forEach((doc) => {
		// Group by doc_type (primary categorization)
		const docType = doc.doc_type || 'general';
		if (!byDocType[docType]) {
			byDocType[docType] = {
				name: docType,
				count: 0,
				sample_titles: [],
			};
		}
		byDocType[docType].count++;

		// Keep sample titles (max 3 per type)
		if (byDocType[docType].sample_titles.length < 3) {
			byDocType[docType].sample_titles.push(doc.title);
		}

		// Global doc type count
		byType[docType] = (byType[docType] || 0) + 1;
	});

	return {
		zones: Object.values(byDocType).sort((a: any, b: any) => b.count - a.count),
		doc_types: byType,
		zone_count: Object.keys(byDocType).length,
	};
}

/**
 * Get recently updated documents
 */
function getRecentUpdates(documents: any[], days: number) {
	const cutoff = new Date();
	cutoff.setDate(cutoff.getDate() - days);

	const recent = documents
		.filter((doc) => doc.date_updated && new Date(doc.date_updated) > cutoff)
		.sort((a, b) => new Date(b.date_updated).getTime() - new Date(a.date_updated).getTime())
		.slice(0, 10)
		.map((doc) => ({
			id: doc.id,
			title: doc.title,
			doc_type: doc.doc_type,
			updated: doc.date_updated,
		}));

	return {
		period_days: days,
		count: recent.length,
		items: recent,
	};
}

/**
 * Extract key topics from document titles
 * Vietnamese-aware: handles short meaningful words like Sơn, Hà, Kho
 */
function extractKeyTopics(documents: any[]) {
	const words: Record<string, number> = {};

	// Vietnamese and English stop words
	const stopWords = new Set([
		// Vietnamese
		'và',
		'của',
		'cho',
		'các',
		'là',
		'trong',
		'được',
		'có',
		'này',
		'đó',
		'với',
		'như',
		'từ',
		'về',
		'theo',
		'khi',
		'đến',
		'để',
		'sẽ',
		'còn',
		'cũng',
		'đã',
		'một',
		'những',
		'hoặc',
		'hay',
		'nếu',
		'thì',
		'vì',
		'bởi',
		'qua',
		'sau',
		'trước',
		'nên',
		'bằng',
		'tại',
		// English
		'the',
		'and',
		'for',
		'to',
		'a',
		'an',
		'of',
		'in',
		'on',
		'at',
		'is',
		'are',
		'was',
		'were',
		'be',
		'been',
		'being',
		'have',
		'has',
		'had',
		'do',
		'does',
		'did',
		'will',
		'would',
		'could',
		'should',
		'may',
		'might',
		'must',
		'shall',
		'can',
		'need',
		'with',
		'as',
		'by',
		'from',
		'or',
		'but',
		'not',
		'this',
		'that',
		'these',
		'those',
		'it',
		'its',
	]);

	// Vietnamese meaningful short words to keep (important business terms)
	const keepShortWords = new Set([
		'kho',
		'sơn',
		'hà',
		'đơn',
		'xe',
		'bán',
		'mua',
		'thu',
		'chi',
		'lỗi',
		'tồn',
		'nhập',
		'xuất',
		'giá',
		'số',
		'hóa',
		'đơn',
	]);

	documents.forEach((doc) => {
		if (doc.title) {
			// Normalize and split - keep Vietnamese diacritics
			const titleWords = doc.title
				.toLowerCase()
				.replace(/[^\w\sàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ-]/gi, ' ')
				.split(/\s+/)
				.filter((w: string) => {
					// Keep if it's a known short meaningful word
					if (keepShortWords.has(w)) return true;
					// Otherwise, filter by length (2+ chars) and not a stop word
					return w.length >= 2 && !stopWords.has(w);
				});

			titleWords.forEach((word: string) => {
				words[word] = (words[word] || 0) + 1;
			});
		}

		// Also extract from tags if available
		if (doc.tags && Array.isArray(doc.tags)) {
			doc.tags.forEach((tag: string) => {
				if (tag && typeof tag === 'string') {
					const normalizedTag = tag.toLowerCase().trim();
					if (normalizedTag.length >= 2) {
						words[normalizedTag] = (words[normalizedTag] || 0) + 1;
					}
				}
			});
		}
	});

	// Get top 20 topics by frequency
	const sortedTopics = Object.entries(words)
		.sort((a, b) => b[1] - a[1])
		.slice(0, 20)
		.map(([topic, count]) => ({ topic, count }));

	return sortedTopics;
}
