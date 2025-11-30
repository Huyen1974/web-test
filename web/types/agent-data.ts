// Agent Data Types - Task 0034
// Types for Agent Data search and logging integration

/**
 * Search request parameters
 */
export interface AgentDataSearchRequest {
	query: string;
	zone?: string;
	subZone?: string;
	topic?: string;
	limit?: number;
	language?: 'vn' | 'ja' | 'en';
}

/**
 * Search result item (IDs only, per LAW constraint)
 */
export interface AgentDataSearchResult {
	documentId: string; // Directus document UUID
	score: number; // Relevance score
	source: 'knowledge' | 'blueprint'; // Document type
}

/**
 * Search response
 */
export interface AgentDataSearchResponse {
	results: AgentDataSearchResult[];
	total: number;
	query: string;
}

/**
 * Page view event (logging)
 */
export interface AgentDataPageViewEvent {
	documentId: string;
	zone: string;
	subZone?: string;
	topic?: string;
	timestamp: string;
	route: string;
	language?: string;
}

/**
 * Search event (logging)
 */
export interface AgentDataSearchEvent {
	query: string;
	zone?: string;
	subZone?: string;
	topic?: string;
	timestamp: string;
	resultCount: number;
	language?: string;
}

/**
 * Agent Data client configuration
 */
export interface AgentDataConfig {
	baseUrl: string;
	apiKey?: string;
	enabled: boolean;
	timeout?: number;
}
