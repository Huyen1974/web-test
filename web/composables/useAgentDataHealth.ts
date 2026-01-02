// Agent Data Health Check Composable
// Provides a health check function using the /info endpoint

/**
 * Check Agent Data backend health
 * Returns system info or null if unavailable
 *
 * @example
 * ```ts
 * const info = await useAgentDataHealth();
 * if (info) {
 *   console.log('Backend is healthy:', info);
 * } else {
 *   console.warn('Backend is unavailable');
 * }
 * ```
 */
export async function useAgentDataHealth(): Promise<{
	name: string;
	version: string;
	author?: string;
	email?: string;
	langroid_available?: boolean;
	langroid_version?: string;
	dependencies?: Record<string, boolean>;
} | null> {
	const config = useRuntimeConfig();

	// Check if Agent Data is enabled
	if (!config.public.agentData?.enabled || !config.public.agentData?.baseUrl) {
		return null;
	}

	try {
		const baseUrl = config.public.agentData.baseUrl;
		const apiKey = config.agentData?.apiKey;

		const response = await $fetch(`${baseUrl}/info`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				...(apiKey && { Authorization: `Bearer ${apiKey}` }),
			},
			// Longer timeout for cold starts
			timeout: 30000,
		});

		return response as any;
	} catch (error) {
		if (import.meta.dev) {
			// eslint-disable-next-line no-console
			console.warn('[AgentData] Health check failed:', error);
		}
		return null;
	}
}
