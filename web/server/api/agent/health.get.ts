/**
 * Agent Data Health Check Server Route
 *
 * SECURITY: This is a server-side route that has access to private runtime config.
 * The API key is NEVER exposed to the client.
 *
 * This route acts as a secure proxy between the client and the Agent Data backend.
 *
 * @endpoint GET /api/agent/health
 * @returns System info from Agent Data backend or error
 */

import { joinURL } from 'ufo';

export default defineEventHandler(async (event) => {
	const config = useRuntimeConfig();

	// Check if Agent Data is enabled
	if (!config.public.agentData?.enabled || !config.public.agentData?.baseUrl) {
		throw createError({
			statusCode: 503,
			statusMessage: 'Agent Data service is disabled',
		});
	}

	try {
		// Server-side has access to private API key
		const baseUrl = config.public.agentData.baseUrl;
		const apiKey = config.agentData?.apiKey;

		// Use joinURL for consistent URL handling
		const healthUrl = joinURL(baseUrl, '/info');

		// Fetch from Agent Data backend (server-to-server)
		const response = await $fetch(healthUrl, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				...(apiKey && { Authorization: `Bearer ${apiKey}` }),
			},
			// Longer timeout for cold starts
			timeout: 60000,
		});

		// Return the health info to the client
		return response;
	} catch (error: any) {
		// Log error on server side for debugging
		console.error('[AgentData] Health check failed:', error);

		throw createError({
			statusCode: error.statusCode || 503,
			statusMessage: error.message || 'Agent Data backend unavailable',
		});
	}
});
