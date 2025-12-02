/**
 * Knowledge Taxonomy System (Task 0036)
 *
 * Defines a 4-level hierarchical taxonomy for organizing knowledge documents:
 * Category (Lĩnh vực) → Zone (Khu vực) → Topic (Chủ đề) → Case/Document (Tài liệu)
 *
 * @see reports/0036a_taxonomy_design.md for full specification
 */

// ============================================================================
// Level 1: Category (Lĩnh vực) - Top-level domain
// ============================================================================

/**
 * Top-level domain classification (5-10 total)
 * Not stored in Directus - derived from Zone mapping
 */
export enum KnowledgeCategory {
	INFRASTRUCTURE = 'Infrastructure',
	OPERATIONS = 'Operations',
	DEVELOPMENT = 'Development',
	CONTENT_MANAGEMENT = 'Content Management',
	AGENT_SYSTEMS = 'Agent Systems',
}

/**
 * Category metadata for display and navigation
 */
export interface CategoryNode {
	/** Category enum value */
	category: KnowledgeCategory;
	/** Display name (Vietnamese) */
	displayName: string;
	/** Display name (English) */
	displayNameEn: string;
	/** Short description */
	description: string;
	/** Icon name (heroicons or similar) */
	icon: string;
	/** Child zones in this category */
	zones: string[];
}

// ============================================================================
// Level 2: Zone (Khu vực) - Major functional area
// ============================================================================

/**
 * Major functional area within a category (3-7 per category)
 * Stored in Directus `category` field (legacy naming)
 */
export interface ZoneNode {
	/** Zone identifier (stored in Directus category field) */
	zone: string;
	/** URL-friendly slug */
	slug: string;
	/** Parent category (derived) */
	category: KnowledgeCategory;
	/** Display name (Vietnamese) */
	displayName: string;
	/** Short description */
	description: string;
	/** Child topics in this zone */
	topics: string[];
}

// ============================================================================
// Level 3: Topic (Chủ đề) - Specific subject/theme
// ============================================================================

/**
 * Specific subject or theme (5-15 per zone)
 * Stored in Directus `tags[0]` (primary tag)
 */
export interface TopicNode {
	/** Topic identifier (from tags[0]) */
	topic: string;
	/** URL-friendly slug */
	slug: string;
	/** Parent zone */
	zone: string;
	/** Parent category (derived) */
	category: KnowledgeCategory;
	/** Display name */
	displayName: string;
	/** Short description */
	description?: string;
	/** Secondary keywords (from tags[1..n]) */
	keywords: string[];
	/** Count of documents in this topic */
	documentCount?: number;
}

// ============================================================================
// Level 4: Case/Document (Tài liệu) - Individual content
// ============================================================================

/**
 * Individual knowledge document (unlimited)
 * Stored as Directus knowledge_documents record
 *
 * Note: This extends the existing KnowledgeCard from view-model-0032.ts
 * No changes to existing interface - taxonomy fields already present
 */
export interface DocumentNode {
	/** Document UUID */
	id: string;
	/** Document title */
	title: string;
	/** URL-friendly slug */
	slug: string;
	/** Parent zone (from category field) */
	zone: string;
	/** Primary topic (from tags[0]) */
	primaryTopic: string;
	/** Secondary topics/keywords (from tags[1..n]) */
	secondaryTopics: string[];
	/** Full taxonomy path */
	taxonomyPath: string; // e.g., "Infrastructure/Cloud Platform/GCP Fundamentals"
}

// ============================================================================
// Taxonomy Path & Navigation
// ============================================================================

/**
 * Taxonomy path segments for breadcrumb and routing
 */
export interface TaxonomyPath {
	category: KnowledgeCategory;
	categorySlug: string;
	zone: string;
	zoneSlug: string;
	topic?: string;
	topicSlug?: string;
	document?: string;
	documentSlug?: string;
}

/**
 * Menu item for taxonomy navigation
 */
export interface TaxonomyMenuItem {
	/** Display label */
	label: string;
	/** Navigation route */
	to: string;
	/** Nesting level (0=category, 1=zone, 2=topic) */
	level: number;
	/** Document count (for topics) */
	count?: number;
	/** Child menu items */
	children?: TaxonomyMenuItem[];
	/** Icon name */
	icon?: string;
}

// ============================================================================
// Configuration & Mapping
// ============================================================================

/**
 * Zone-to-Category mapping
 * Used to derive Category from Zone (since Category not stored in Directus)
 */
export const ZONE_TO_CATEGORY_MAP: Record<string, KnowledgeCategory> = {
	// Infrastructure
	'Cloud Platform': KnowledgeCategory.INFRASTRUCTURE,
	Database: KnowledgeCategory.INFRASTRUCTURE,
	Networking: KnowledgeCategory.INFRASTRUCTURE,
	Security: KnowledgeCategory.INFRASTRUCTURE,

	// Operations
	Monitoring: KnowledgeCategory.OPERATIONS,
	'Incident Response': KnowledgeCategory.OPERATIONS,
	Maintenance: KnowledgeCategory.OPERATIONS,
	'Backup & Recovery': KnowledgeCategory.OPERATIONS,

	// Development
	Frontend: KnowledgeCategory.DEVELOPMENT,
	Backend: KnowledgeCategory.DEVELOPMENT,
	Testing: KnowledgeCategory.DEVELOPMENT,
	'CI/CD': KnowledgeCategory.DEVELOPMENT,

	// Content Management
	'Directus Admin': KnowledgeCategory.CONTENT_MANAGEMENT,
	'Content Workflow': KnowledgeCategory.CONTENT_MANAGEMENT,
	'Metadata Management': KnowledgeCategory.CONTENT_MANAGEMENT,

	// Agent Systems
	'Agent Data': KnowledgeCategory.AGENT_SYSTEMS,
	'AI Agents': KnowledgeCategory.AGENT_SYSTEMS,
	Automation: KnowledgeCategory.AGENT_SYSTEMS,
};

/**
 * Category metadata configuration
 */
export const CATEGORY_CONFIG: Record<KnowledgeCategory, Omit<CategoryNode, 'zones'>> = {
	[KnowledgeCategory.INFRASTRUCTURE]: {
		category: KnowledgeCategory.INFRASTRUCTURE,
		displayName: 'Hạ tầng',
		displayNameEn: 'Infrastructure',
		description: 'Cloud resources, IaC, deployment, infrastructure management',
		icon: 'heroicons:server-stack',
	},
	[KnowledgeCategory.OPERATIONS]: {
		category: KnowledgeCategory.OPERATIONS,
		displayName: 'Vận hành',
		displayNameEn: 'Operations',
		description: 'Monitoring, incident response, SRE, maintenance',
		icon: 'heroicons:cog-6-tooth',
	},
	[KnowledgeCategory.DEVELOPMENT]: {
		category: KnowledgeCategory.DEVELOPMENT,
		displayName: 'Phát triển',
		displayNameEn: 'Development',
		description: 'Frontend, backend, testing, CI/CD workflows',
		icon: 'heroicons:code-bracket',
	},
	[KnowledgeCategory.CONTENT_MANAGEMENT]: {
		category: KnowledgeCategory.CONTENT_MANAGEMENT,
		displayName: 'Quản lý nội dung',
		displayNameEn: 'Content Management',
		description: 'CMS administration, content workflow, metadata',
		icon: 'heroicons:document-text',
	},
	[KnowledgeCategory.AGENT_SYSTEMS]: {
		category: KnowledgeCategory.AGENT_SYSTEMS,
		displayName: 'Hệ thống Agent',
		displayNameEn: 'Agent Systems',
		description: 'AI agents, automation, workflows, agent data',
		icon: 'heroicons:cpu-chip',
	},
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert string to URL-friendly slug
 */
export function toSlug(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
}

/**
 * Build taxonomy path string from components
 */
export function buildTaxonomyPath(
	category: KnowledgeCategory,
	zone: string,
	topic?: string,
	document?: string,
): string {
	const parts = [category, zone];
	if (topic) parts.push(topic);
	if (document) parts.push(document);
	return parts.join('/');
}

/**
 * Parse taxonomy path from string
 */
export function parseTaxonomyPath(path: string): Partial<TaxonomyPath> {
	const parts = path.split('/').filter(Boolean);
	return {
		category: parts[0] as KnowledgeCategory,
		categorySlug: toSlug(parts[0] || ''),
		zone: parts[1] || undefined,
		zoneSlug: toSlug(parts[1] || ''),
		topic: parts[2] || undefined,
		topicSlug: toSlug(parts[2] || ''),
		document: parts[3] || undefined,
		documentSlug: toSlug(parts[3] || ''),
	};
}

/**
 * Derive category from zone using mapping
 */
export function getCategoryForZone(zone: string): KnowledgeCategory | undefined {
	return ZONE_TO_CATEGORY_MAP[zone];
}

/**
 * Get category metadata
 */
export function getCategoryMetadata(category: KnowledgeCategory): Omit<CategoryNode, 'zones'> {
	return CATEGORY_CONFIG[category];
}
