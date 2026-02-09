/**
 * Knowledge Document Proxy — WEB-56
 * Proxies Agent Data /kb/get/{doc_id} with Cloud Run IAM auth
 *
 * GET /api/knowledge/{any/path/here}
 * Returns: { document_id, content, metadata, revision }
 *
 * URL mapping: clean URL → Agent Data document_id
 * URLs have "docs/" prefix stripped and ".md" removed for SEO.
 * This proxy tries multiple variants to find the document.
 */

import { joinURL } from 'ufo';
import { buildAgentDataHeaders } from '~/server/utils/agentDataAuth';
import { retryWithBackoff, warmUp } from '~/server/utils/retryWithBackoff';

/**
 * Try to fetch a document from Agent Data, returning null on 404
 */
async function tryFetch(
	url: string,
	headers: Record<string, string>,
): Promise<Record<string, unknown> | null> {
	try {
		return await $fetch<Record<string, unknown>>(url, {
			method: 'GET',
			headers,
			timeout: 30000,
		});
	} catch (error: unknown) {
		if (typeof error === 'object' && error !== null && 'statusCode' in error) {
			const status = (error as { statusCode: number }).statusCode;
			if (status === 404 || status === 422) return null;
		}
		throw error;
	}
}

export default defineEventHandler(async (event) => {
	const config = useRuntimeConfig();

	// Agent Data URL from env
	const baseUrl =
		process.env.NUXT_PUBLIC_AGENT_DATA_BASE_URL ||
		config.public.agentData?.baseUrl;

	if (!baseUrl) {
		throw createError({
			statusCode: 503,
			statusMessage: 'Agent Data service URL not configured',
		});
	}

	// Extract slug from params
	const slug = event.context.params?.slug;
	if (!slug) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Document path required',
		});
	}

	const apiKey = config.agentData?.apiKey;
	const healthUrl = joinURL(baseUrl, '/health');

	// Build auth headers (handles Cloud Run IAM + local dev)
	const headers = await buildAgentDataHeaders(baseUrl, apiKey);

	// Build candidate document_ids to try
	// URLs have "docs/" stripped and ".md" removed for clean SEO
	const candidates: string[] = [
		slug,                          // exact match
		`${slug}.md`,                  // add .md back
		`docs/${slug}`,                // add docs/ prefix
		`docs/${slug}.md`,             // add both
	];

	try {
		const fetchDoc = async () => {
			for (const docId of candidates) {
				const url = joinURL(baseUrl, '/kb/get', docId);
				const result = await tryFetch(url, headers);
				if (result) return result;
			}
			return null;
		};

		const data = await retryWithBackoff(fetchDoc, {
			maxRetries: 2,
			initialDelayMs: 2000,
			maxDelayMs: 10000,
			onRetry: async (attempt, error, delayMs) => {
				console.warn(`[KB-Get] Retry ${attempt}/2: ${error.message}, waiting ${delayMs}ms`);
				if (attempt === 1) {
					await warmUp(healthUrl, headers);
				}
			},
		});

		if (!data) {
			throw createError({
				statusCode: 404,
				statusMessage: `Document not found: ${slug}`,
			});
		}

		// Cache individual docs for 5 minutes
		setHeader(event, 'Cache-Control', 'public, max-age=300, s-maxage=300');

		return data;
	} catch (error: unknown) {
		if (typeof error === 'object' && error !== null && 'statusCode' in error) {
			const status = (error as { statusCode: number }).statusCode;
			if (status === 404) {
				throw createError({
					statusCode: 404,
					statusMessage: `Document not found: ${slug}`,
				});
			}
		}

		console.error(`[KB-Get] Failed for ${slug}:`, error);
		throw createError({
			statusCode: 503,
			statusMessage: 'Knowledge document temporarily unavailable',
		});
	}
});
