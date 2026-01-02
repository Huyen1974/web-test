// Agent Data Client - Task 0034
// Minimal client for Agent Data search and logging

import { joinURL } from 'ufo';
import type {
	AgentDataConfig,
	AgentDataSearchRequest,
	AgentDataSearchResponse,
	AgentDataPageViewEvent,
	AgentDataSearchEvent,
} from '~/types/agent-data';

/**
 * Agent Data Client
 *
 * CRITICAL LAW CONSTRAINT:
 * - Agent Data is used ONLY for search (returning IDs) and logging
 * - Content display MUST come from Directus only
 * - This client does NOT return content text/summary - only document IDs
 */
export class AgentDataClient {
	private config: AgentDataConfig;

	constructor(config: AgentDataConfig) {
		this.config = config;
	}

	/**
	 * Check system health and get backend info
	 * Calls /info endpoint to verify connectivity
	 */
	async getSystemInfo(): Promise<{ status: string; backend: string } | null> {
		// If Agent Data is disabled, return null
		if (!this.config.enabled || !this.config.baseUrl) {
			return null;
		}

		try {
			const url = joinURL(this.config.baseUrl, '/info');

			const response = await fetch(url, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					...(this.config.apiKey && { Authorization: `Bearer ${this.config.apiKey}` }),
				},
				signal: AbortSignal.timeout(this.config.timeout || 5000),
			});

			if (!response.ok) {
				// eslint-disable-next-line no-console
				console.warn('[AgentData] Health check failed:', response.status, response.statusText);
				return null;
			}

			const data = await response.json();
			return data;
		} catch (error) {
			if (import.meta.dev) {
				// eslint-disable-next-line no-console
				console.warn('[AgentData] Health check error:', error);
			}
			return null;
		}
	}

	/**
	 * Search for documents
	 * Returns IDs only - caller must fetch actual content from Directus
	 */
	async search(request: AgentDataSearchRequest): Promise<AgentDataSearchResponse> {
		// If Agent Data is disabled, return empty results
		if (!this.config.enabled || !this.config.baseUrl) {
			return {
				results: [],
				total: 0,
				query: request.query,
			};
		}

		try {
			const params = new URLSearchParams({
				q: request.query,
				...(request.zone && { zone: request.zone }),
				...(request.subZone && { subZone: request.subZone }),
				...(request.topic && { topic: request.topic }),
				...(request.limit && { limit: request.limit.toString() }),
				...(request.language && { language: request.language }),
			});

			const url = joinURL(this.config.baseUrl, '/search');
			const fullUrl = `${url}?${params.toString()}`;

			const response = await fetch(fullUrl, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					...(this.config.apiKey && { Authorization: `Bearer ${this.config.apiKey}` }),
				},
				signal: AbortSignal.timeout(this.config.timeout || 5000),
			});

			if (!response.ok) {
				// eslint-disable-next-line no-console
				console.warn('[AgentData] Search failed:', response.status, response.statusText);
				return {
					results: [],
					total: 0,
					query: request.query,
				};
			}

			const data = await response.json();

			// Map response to our expected format
			// Adjust field names based on actual Agent Data API response
			return {
				results: (data.results || []).map((item: any) => ({
					documentId: item.document_id || item.id,
					score: item.score || 0,
					source: item.source || 'knowledge',
				})),
				total: data.total || 0,
				query: request.query,
			};
		} catch (error) {
			// Graceful degradation - log error but don't break the app
			if (import.meta.dev) {
				// eslint-disable-next-line no-console
				console.warn('[AgentData] Search error:', error);
			}

			return {
				results: [],
				total: 0,
				query: request.query,
			};
		}
	}

	/**
	 * Log page view event
	 * Best-effort, non-blocking - errors are swallowed
	 */
	async logPageView(event: AgentDataPageViewEvent): Promise<void> {
		// Skip if disabled
		if (!this.config.enabled || !this.config.baseUrl) {
			return;
		}

		try {
			const url = joinURL(this.config.baseUrl, '/log/page-view');

			await fetch(url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					...(this.config.apiKey && { Authorization: `Bearer ${this.config.apiKey}` }),
				},
				body: JSON.stringify(event),
				signal: AbortSignal.timeout(this.config.timeout || 3000),
			});

			// Ignore response - fire and forget
		} catch (error) {
			// Swallow errors silently - logging should never break the app
			if (import.meta.dev) {
				// eslint-disable-next-line no-console
				console.debug('[AgentData] Page view logging failed:', error);
			}
		}
	}

	/**
	 * Log search event
	 * Best-effort, non-blocking - errors are swallowed
	 */
	async logSearch(event: AgentDataSearchEvent): Promise<void> {
		// Skip if disabled
		if (!this.config.enabled || !this.config.baseUrl) {
			return;
		}

		try {
			const url = joinURL(this.config.baseUrl, '/log/search');

			await fetch(url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					...(this.config.apiKey && { Authorization: `Bearer ${this.config.apiKey}` }),
				},
				body: JSON.stringify(event),
				signal: AbortSignal.timeout(this.config.timeout || 3000),
			});

			// Ignore response - fire and forget
		} catch (error) {
			// Swallow errors silently
			if (import.meta.dev) {
				// eslint-disable-next-line no-console
				console.debug('[AgentData] Search logging failed:', error);
			}
		}
	}
}

/**
 * Create Agent Data client instance
 */
export function createAgentDataClient(config: AgentDataConfig): AgentDataClient {
	return new AgentDataClient(config);
}
