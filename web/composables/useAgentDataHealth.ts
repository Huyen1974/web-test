/**
 * Agent Data Health Check Composable
 *
 * SECURITY: This composable calls an internal server route (/api/agent/health)
 * which acts as a secure proxy. The client NEVER has access to the API key.
 *
 * Architecture:
 * Client (Vue) -> Internal API (/api/agent/health) -> Agent Data Backend
 *
 * @returns System info from Agent Data backend or null if unavailable
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
	if (!config.public.agentData?.enabled) {
		return null;
	}

	try {
		// Call internal server route (NO API KEY NEEDED - server handles it)
		const response = await $fetch('/api/agent/health', {
			method: 'GET',
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
