/**
 * Directus Type Definitions
 *
 * These types are based on E1 Plan Section F.3 Response Format
 * and strictly define the structure of Directus collections and API responses.
 *
 * IMPORTANT: All types must be kept in sync with the Directus schema.
 * DO NOT use 'any' type - use 'unknown' with proper validation if type is truly dynamic.
 */

/**
 * Directus Translation Entry
 *
 * Based on E1 Plan F.3:
 * - translations MUST be an Array (not Object)
 * - Each item MUST have languages_code field
 *
 * Reference: E1 Plan + Section F.3 RESPONSE FORMAT CHUẨN
 */
export interface DirectusTranslation {
	/** Language code: "vi" | "en" | "ja" */
	languages_code: 'vi' | 'en' | 'ja';
	/** Translated title */
	title?: string;
	/** Translated content (HTML) */
	content?: string;
	/** Translated summary */
	summary?: string;
}

/**
 * Base Directus Item
 *
 * Common fields present in all Directus collections
 */
export interface DirectusItem {
	id: string;
	status?: 'draft' | 'published' | 'archived';
	sort?: number | null;
	user_created?: string | null;
	date_created?: string | null;
	user_updated?: string | null;
	date_updated?: string | null;
}

/**
 * Directus Knowledge Document
 *
 * Schema for knowledge_documents collection with versioning support
 */
export interface DirectusKnowledgeDocument extends DirectusItem {
	/** Unique slug for the document */
	slug: string;
	/** Document title (translatable) */
	title: string;
	/** Document category */
	category: string;
	/** Document tags (array) */
	tags?: string[];
	/** Document content (HTML, translatable) */
	content?: string;
	/** Document summary (translatable) */
	summary?: string;
	/** Document language */
	language?: 'vi' | 'en' | 'ja';
	/** Public visibility flag */
	visibility?: 'public' | 'private';
	/** Current version flag */
	is_current_version?: boolean;
	/** Version number */
	version?: number;
	/** Translations array (E1 Plan F.3 compliant) */
	translations?: DirectusTranslation[];
}

/**
 * Directus Agent View
 *
 * Schema for agent_views collection (Growth Zone)
 * Based on E1 Plan Situation F.4
 */
export interface DirectusAgentView extends DirectusItem {
	/** Source ID from Agent Data backend */
	source_id: string;
	/** URL permalink (not translated) */
	permalink: string;
	/** Title (translatable) */
	title: string;
	/** Content HTML (translatable) */
	content?: string;
	/** Summary text (translatable) */
	summary?: string;
	/** Category */
	category?: string;
	/** Tags array */
	tags?: string[];
	/** Global flag (show on all sites) */
	is_global?: boolean;
	/** Sites M2M relationship */
	sites?: string[];
	/** Translations array (E1 Plan F.3 compliant) */
	translations?: DirectusTranslation[];
}

/**
 * Directus Filter Object
 *
 * Type for Directus API filters
 * This is a complex type that can have various structures
 */
export interface DirectusFilter {
	_and?: DirectusFilter[];
	_or?: DirectusFilter[];
	[key: string]:
		| { _eq?: unknown; _neq?: unknown; _lt?: unknown; _lte?: unknown; _gt?: unknown; _gte?: unknown; _in?: unknown[]; _nin?: unknown[]; _null?: boolean; _nnull?: boolean; _contains?: string; _ncontains?: string; _starts_with?: string; _nstarts_with?: string; _ends_with?: string; _nends_with?: string; _between?: unknown[]; _nbetween?: unknown[]; _empty?: boolean; _nempty?: boolean; }
		| DirectusFilter[]
		| undefined;
}

/**
 * System Info Response
 *
 * Response from /info endpoint of Agent Data backend
 */
export interface SystemInfoResponse {
	status: string;
	backend: string;
	version?: string;
	/** Additional dynamic fields (use unknown for safety) */
	[key: string]: unknown;
}
