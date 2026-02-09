/**
 * Knowledge List Proxy — WEB-56
 * Proxies Agent Data /kb/list with Cloud Run IAM auth
 *
 * GET /api/knowledge/list
 * Returns: { items: [{ document_id, parent_id, title, tags, revision }] }
 */

import { joinURL } from 'ufo';
import { buildAgentDataHeaders } from '~/server/utils/agentDataAuth';
import { retryWithBackoff, warmUp } from '~/server/utils/retryWithBackoff';

export default defineEventHandler(async (event) => {
	const config = useRuntimeConfig();

	// Agent Data URL from env (local = localhost:8000, cloud = cloud URL)
	const baseUrl =
		process.env.NUXT_PUBLIC_AGENT_DATA_BASE_URL ||
		config.public.agentData?.baseUrl;

	if (!baseUrl) {
		throw createError({
			statusCode: 503,
			statusMessage: 'Agent Data service URL not configured',
		});
	}

	const apiKey = config.agentData?.apiKey;
	const listUrl = joinURL(baseUrl, '/kb/list');
	const healthUrl = joinURL(baseUrl, '/health');

	// Build auth headers (handles Cloud Run IAM + local dev)
	const headers = await buildAgentDataHeaders(baseUrl, apiKey);

	try {
		const fetchList = async () => {
			const response = await $fetch<{ items: unknown[] }>(listUrl, {
				method: 'GET',
				headers,
				timeout: 30000,
			});
			return response;
		};

		const data = await retryWithBackoff(fetchList, {
			maxRetries: 2,
			initialDelayMs: 2000,
			maxDelayMs: 10000,
			onRetry: async (attempt, error, delayMs) => {
				console.warn(`[KB-List] Retry ${attempt}/2: ${error.message}, waiting ${delayMs}ms`);
				if (attempt === 1) {
					await warmUp(healthUrl, headers);
				}
			},
		});

		// Cache for 5 minutes on CDN/browser
		setHeader(event, 'Cache-Control', 'public, max-age=300, s-maxage=300');

		return data;
	} catch (error) {
		console.error('[KB-List] Failed:', error);
		throw createError({
			statusCode: 503,
			statusMessage: 'Knowledge base temporarily unavailable',
		});
	}
});
