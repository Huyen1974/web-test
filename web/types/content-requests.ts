/**
 * Type definitions for content_requests collection (E1 Growth Zone)
 * Based on E1-01 schema migration
 * @see scripts/e1-01_migration_content_requests.ts
 */

import type { User } from './system';

/**
 * Content Request Status Enum
 * Represents the lifecycle state of a content writing request
 */
export type ContentRequestStatus =
	| 'new' // New request, not yet assigned
	| 'assigned' // Assigned to an agent or editor
	| 'drafting' // Content is being drafted (usually by agent)
	| 'awaiting_review' // Draft complete, needs review
	| 'awaiting_approval' // Reviewed, needs final approval
	| 'published' // Approved and published
	| 'rejected' // Rejected, needs rework
	| 'canceled'; // Request canceled

/**
 * Content Request (Growth Zone collection)
 * Tracks lifecycle of content writing requests from creation to publication
 */
export interface ContentRequest {
	id: number;
	title: string;
	requirements?: string; // Markdown text with detailed requirements
	status: ContentRequestStatus;
	current_holder?: string; // Who is responsible now (agent_001, editor@example.com, etc.)
	goal?: string; // High-level goal/purpose of the content
	target_audience?: string; // Intended audience
	tone?: string; // Desired tone (professional, casual, technical, etc.)
	knowledge_document?: number | null; // Related knowledge_document ID (M2O)
	user_created?: string | User; // User who created the request
	date_created?: string; // ISO timestamp
	user_updated?: string | User; // User who last updated
	date_updated?: string; // ISO timestamp (used for SLA tracking)
}

/**
 * Knowledge Document (from existing schema)
 * Referenced by content_requests
 */
export interface KnowledgeDocument {
	id: number;
	title?: string;
	slug?: string;
	content?: string;
	status?: 'draft' | 'published' | 'archived';
	parent_document_id?: number | null; // Folder/tree structure (E1-01)
	user_created?: string | User;
	date_created?: string;
	user_updated?: string | User;
	date_updated?: string;
}

/**
 * Content Request with related data (view model)
 * Used for list and detail views
 */
export interface ContentRequestView extends ContentRequest {
	knowledge_document?: KnowledgeDocument;
	user_created?: User;
	user_updated?: User;
}

/**
 * Status display metadata
 */
export const CONTENT_REQUEST_STATUS_META: Record<
	ContentRequestStatus,
	{
		label: string;
		color: string;
		icon: string;
	}
> = {
	new: {
		label: 'New',
		color: 'purple',
		icon: 'i-heroicons-plus-circle',
	},
	assigned: {
		label: 'Assigned',
		color: 'blue',
		icon: 'i-heroicons-user-circle',
	},
	drafting: {
		label: 'Drafting',
		color: 'sky',
		icon: 'i-heroicons-pencil',
	},
	awaiting_review: {
		label: 'Awaiting Review',
		color: 'yellow',
		icon: 'i-heroicons-exclamation-triangle',
	},
	awaiting_approval: {
		label: 'Awaiting Approval',
		color: 'orange',
		icon: 'i-heroicons-clipboard-document-check',
	},
	published: {
		label: 'Published',
		color: 'green',
		icon: 'i-heroicons-check-circle',
	},
	rejected: {
		label: 'Rejected',
		color: 'red',
		icon: 'i-heroicons-x-circle',
	},
	canceled: {
		label: 'Canceled',
		color: 'gray',
		icon: 'i-heroicons-archive-box',
	},
};

/**
 * Filter options for My Tasks view
 */
export interface ContentRequestFilters {
	status?: ContentRequestStatus | ContentRequestStatus[];
	current_holder?: string;
	overdue?: boolean; // Updated_at older than 24h while in review/approval
	search?: string; // Search in title/requirements
}

/**
 * Action types available in Approval Desk
 */
export type ContentRequestAction = 'approve' | 'reject' | 'request_changes' | 'assign';

/**
 * Helper type guards
 */
export function isAwaitingAction(status: ContentRequestStatus): boolean {
	return status === 'awaiting_review' || status === 'awaiting_approval';
}

export function isInProgress(status: ContentRequestStatus): boolean {
	return !['published', 'rejected', 'canceled'].includes(status);
}

export function isOverdue(dateUpdated: string, thresholdHours: number = 24): boolean {
	const updatedAt = new Date(dateUpdated);
	const now = new Date();
	const hoursSince = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60);
	return hoursSince > thresholdHours;
}
