/**
 * Composable for managing content_requests (E1 Approval Desk)
 * Provides data access layer for content request operations
 */

import { readItems, readItem, updateItem, createItem, createComment } from '@directus/sdk';
import type { ContentRequest, ContentRequestView, ContentRequestStatus, ContentRequestFilters } from '~/types';

/**
 * Fetch content requests with filters
 */
export async function useContentRequestsList(filters?: ContentRequestFilters) {
	const directusFilter: Record<string, any> = {};

	// Apply status filter
	if (filters?.status) {
		if (Array.isArray(filters.status)) {
			directusFilter.status = { _in: filters.status };
		} else {
			directusFilter.status = { _eq: filters.status };
		}
	}

	// Apply current_holder filter
	if (filters?.current_holder) {
		directusFilter.current_holder = { _eq: filters.current_holder };
	}

	// Apply overdue filter (updated_at < NOW - 24 hours AND status is review/approval)
	if (filters?.overdue) {
		directusFilter._and = [
			{
				_or: [{ status: { _eq: 'awaiting_review' } }, { status: { _eq: 'awaiting_approval' } }],
			},
			{
				date_updated: { _lt: '$NOW(-24 hours)' },
			},
		];
	}

	// Apply search filter (title or requirements contains search term)
	if (filters?.search) {
		directusFilter._or = [{ title: { _contains: filters.search } }, { requirements: { _contains: filters.search } }];
	}

	return await useDirectus<ContentRequestView[]>(
		readItems('content_requests', {
			fields: [
				'id',
				'title',
				'status',
				'current_holder',
				'goal',
				'requirements',
				'date_created',
				'date_updated',
				{
					user_created: ['id', 'first_name', 'last_name', 'email'],
					user_updated: ['id', 'first_name', 'last_name', 'email'],
					knowledge_document: ['id', 'title', 'slug', 'status'],
				},
			],
			filter: Object.keys(directusFilter).length > 0 ? directusFilter : undefined,
			sort: ['-date_updated'],
			limit: 100,
		}),
	);
}

/**
 * Fetch a single content request by ID
 */
export async function useContentRequestDetail(id: number) {
	return await useDirectus<ContentRequestView>(
		readItem('content_requests', id, {
			fields: [
				'*',
				{
					user_created: ['id', 'first_name', 'last_name', 'email', 'avatar'],
					user_updated: ['id', 'first_name', 'last_name', 'email', 'avatar'],
					knowledge_document: ['*'],
				},
			],
		}),
	);
}

/**
 * Update content request status and holder
 */
export async function updateContentRequestStatus(
	id: number,
	status: ContentRequestStatus,
	currentHolder?: string,
): Promise<ContentRequest> {
	const updates: Partial<ContentRequest> = {
		status,
	};

	if (currentHolder !== undefined) {
		updates.current_holder = currentHolder;
	}

	return await useDirectus<ContentRequest>(updateItem('content_requests', id, updates));
}

/**
 * Update content request fields
 */
export async function updateContentRequest(id: number, updates: Partial<ContentRequest>): Promise<ContentRequest> {
	return await useDirectus<ContentRequest>(updateItem('content_requests', id, updates));
}

/**
 * Helper: Get my tasks (requests I need to action)
 * For now, returns all requests in review/approval states
 * TODO: Filter by current_holder matching current user
 */
export async function useMyTasks() {
	return await useContentRequestsList({
		status: ['awaiting_review', 'awaiting_approval'],
	});
}

/**
 * Helper: Approve a content request
 * Moves from awaiting_review → awaiting_approval or awaiting_approval → published
 */
export async function approveContentRequest(id: number, currentStatus: ContentRequestStatus): Promise<ContentRequest> {
	let newStatus: ContentRequestStatus;
	let newHolder: string | undefined;

	if (currentStatus === 'awaiting_review') {
		// Move to awaiting_approval for final sign-off
		newStatus = 'awaiting_approval';
		newHolder = 'editor'; // Could be team lead/manager
	} else if (currentStatus === 'awaiting_approval') {
		// Final approval - publish
		newStatus = 'published';
		newHolder = 'system';
	} else {
		throw new Error(`Cannot approve request with status: ${currentStatus}`);
	}

	return await updateContentRequestStatus(id, newStatus, newHolder);
}

/**
 * Helper: Reject a content request
 * Moves to rejected status
 */
export async function rejectContentRequest(id: number, currentStatus: ContentRequestStatus): Promise<ContentRequest> {
	if (!['awaiting_review', 'awaiting_approval'].includes(currentStatus)) {
		throw new Error(`Cannot reject request with status: ${currentStatus}`);
	}

	return await updateContentRequestStatus(id, 'rejected', undefined);
}

/**
 * Helper: Request changes on a content request
 * Moves back to drafting for revisions and attaches a comment
 *
 * @param id - Content request ID
 * @param comment - Comment explaining what changes are needed
 * @returns Updated content request
 */
export async function requestChanges(id: number, comment?: string): Promise<ContentRequest> {
	// Step 1: Update status to drafting
	const updatedRequest = await updateContentRequestStatus(id, 'drafting', 'agent');

	// Step 2: Create comment if provided (separate API call)
	if (comment && comment.trim().length > 0) {
		try {
			await useDirectus(
				createComment({
					collection: 'content_requests',
					item: String(id),
					comment: comment.trim(),
				}),
			);
		} catch (error) {
			// Log error but don't fail the entire operation
			// Status update succeeded, comment creation failed
			console.error('[requestChanges] Failed to create comment:', error);
			throw new Error('Status updated successfully, but comment creation failed. Please add comment manually.');
		}
	}

	return updatedRequest;
}
