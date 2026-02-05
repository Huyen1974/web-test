// Nuxt View Model Types - Task 0032
// Configuration and type definitions for Directus-based content display

export type Language = 'vn' | 'ja' | 'en';

export type ContentStatus = 'draft' | 'published' | 'archived';

export type Visibility = 'public' | 'internal' | 'restricted';

export type Category = 'guide' | 'faq' | 'reference' | 'article' | 'other';

// View Model Interfaces

export interface KnowledgeCard {
	id: string;
	title: string;
	slug: string;
	summary?: string;
	language: Language;
	publishedAt: string;
	version: number;
	zone: string;
	subZone: string;
	topics: string[];
	readTime: number;
	content?: string;
	// Approval metadata (Task 0035)
	status: ContentStatus;
	updatedBy?: string | null;
	updatedAt?: string | null;
	// Access Control (WEB-49)
	visibility?: Visibility;
	allowedRoles?: string[];
	// Workflow & Versioning fields (Task 0047C)
	workflowStatus?: string;
	versionGroupId?: string;
	versionNumber?: number;
	isCurrentVersion?: boolean;
	previousVersionId?: string | null;
	reviewedBy?: string | null;
	reviewedAt?: string | null;
	approvedBy?: string | null;
	approvedAt?: string | null;
	publisherId?: string | null;
	rejectionReason?: string | null;
	purgeAfter?: string | null;
	parentDocumentId?: string | null;
	childOrder?: number | null;
}

export interface KnowledgeListEntry {
	id: string;
	title: string;
	slug: string;
	summary?: string;
	language: Language;
	publishedAt: string;
	zone: string;
	subZone: string;
	primaryTopic: string;
	tags: string[];
	// Approval metadata (Task 0035)
	status: ContentStatus;
	updatedAt?: string | null;
	// Access Control (WEB-49)
	visibility?: Visibility;
	allowedRoles?: string[];
	// Workflow & Versioning fields (Task 0047C)
	workflowStatus?: string;
	versionNumber?: number;
	isCurrentVersion?: boolean;
	childOrder?: number | null;
}

export interface KnowledgeList {
	items: KnowledgeListEntry[];
	total: number;
	page: number;
	pageSize: number;
	zone?: string;
	subZone?: string;
	topic?: string;
	language?: Language;
}

export interface BreadcrumbItem {
	label: string;
	slug: string;
	type: 'zone' | 'subzone' | 'topic' | 'document';
}

export interface ZoneView {
	zone: string;
	title: string;
	description: string;
	subZones: {
		name: string;
		documentCount: number;
		topics: string[];
	}[];
	featuredDocuments: KnowledgeCard[];
}

export interface TopicView {
	zone: string;
	subZone: string;
	topic: string;
	documents: KnowledgeCard[];
	relatedTopics: string[];
	breadcrumb: BreadcrumbItem[];
}

// Field Mapping Configuration

export const ZONE_MAPPING: Record<Category, string> = {
	guide: 'Guide',
	faq: 'FAQ',
	reference: 'Reference',
	article: 'Article',
	other: 'Other',
};

export const DIRECTUS_TO_VIEW_MODEL_MAPPING = {
	knowledgeCard: {
		id: 'id',
		title: 'title',
		slug: 'slug',
		summary: 'summary',
		language: 'language',
		publishedAt: 'published_at',
		version: 'version',
		zone: (doc: any) => ZONE_MAPPING[doc.category as Category] || 'Other',
		subZone: (doc: any) => doc.tags?.[0] || 'General',
		topics: (doc: any) => doc.tags?.slice(1) || [],
		readTime: (doc: any) => Math.ceil((doc.content?.length || 0) / 200), // Rough estimate
		// Approval metadata (Task 0035)
		status: 'status',
		updatedBy: 'user_updated',
		updatedAt: 'date_updated',
		// Workflow & Versioning fields (Task 0047C)
		workflowStatus: 'workflow_status',
		versionGroupId: 'version_group_id',
		versionNumber: 'version_number',
		isCurrentVersion: 'is_current_version',
		previousVersionId: 'previous_version_id',
		reviewedBy: 'reviewed_by',
		reviewedAt: 'reviewed_at',
		approvedBy: 'approved_by',
		approvedAt: 'approved_at',
		publisherId: 'publisher_id',
		rejectionReason: 'rejection_reason',
		purgeAfter: 'purge_after',
		parentDocumentId: 'parent_document_id',
		childOrder: 'child_order',
	},

	knowledgeListEntry: {
		id: 'id',
		title: 'title',
		slug: 'slug',
		summary: 'summary',
		language: 'language',
		publishedAt: 'published_at',
		zone: (doc: any) => ZONE_MAPPING[doc.category as Category] || 'Other',
		subZone: (doc: any) => doc.tags?.[0] || 'General',
		primaryTopic: (doc: any) => doc.tags?.[1] || '',
		tags: 'tags',
		// Approval metadata (Task 0035)
		status: 'status',
		updatedAt: 'date_updated',
		// Workflow & Versioning fields (Task 0047C)
		workflowStatus: 'workflow_status',
		versionNumber: 'version_number',
		isCurrentVersion: 'is_current_version',
		childOrder: 'child_order',
	},
} as const;

// Query Configuration

export const QUERY_CONFIG = {
	baseFilter: {
		status: { _eq: 'published' as ContentStatus },
		visibility: { _eq: 'public' as Visibility },
	},

	fields: {
		list: ['id', 'title', 'slug', 'summary', 'category', 'tags', 'published_at', 'language', 'status', 'date_updated'],
		detail: ['*'], // All fields for full content
	},

	sorting: {
		default: ['-published_at'],
		menu: ['menu_order', 'sort'],
	},

	pagination: {
		defaultPageSize: 20,
		maxPageSize: 100,
	},
} as const;

// Type guards

export function isKnowledgeCard(obj: any): obj is KnowledgeCard {
	return obj && typeof obj.id === 'string' && typeof obj.title === 'string';
}

export function isKnowledgeList(obj: any): obj is KnowledgeList {
	return obj && Array.isArray(obj.items) && typeof obj.total === 'number';
}

