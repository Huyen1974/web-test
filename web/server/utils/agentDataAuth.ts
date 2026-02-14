/**
 * Agent Data Authentication Helper — WEB-56 / P18
 *
 * Builds auth headers for Agent Data API calls.
 * VPS deployment: uses API key via Bearer token.
 *
 * DEPRECATED: Cloud Run auth paths removed in P18 (2026-02-14).
 * All services run on VPS since 2026-02-13.
 */

/**
 * Build auth headers for Agent Data API calls
 */
export async function buildAgentDataHeaders(
	baseUrl: string,
	apiKey?: string,
): Promise<Record<string, string>> {
	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
	};

	if (apiKey) {
		headers['Authorization'] = `Bearer ${apiKey}`;
	}

	return headers;
}
