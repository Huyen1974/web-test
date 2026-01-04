/**
 * Composable for managing content_requests (E1 Approval Desk)
 * Provides data access layer for content request operations
 */

import { readItems, readItem, updateItem, customEndpoint } from '@directus/sdk';
import type {
	ContentRequest,
	ContentRequestView,
	ContentRequestStatus,
	ContentRequestFilters,
	DirectusTranslation,
	DirectusFilter,
} from '~/types';
import { CONTENT_REQUEST_HOLDER, CONTENT_REQUEST_STATUS } from '~/types/content-requests';

const DEFAULT_LANGUAGE = 'vi';

function normalizeTranslations(translations?: DirectusTranslation[] | null): DirectusTranslation[] {
	return Array.isArray(translations) ? translations : [];
}

export function resolveContentRequestTranslation(
	translations: DirectusTranslation[] | null | undefined,
	preferredLanguage: string,
	fallbackLanguage: string = DEFAULT_LANGUAGE,
): DirectusTranslation | undefined {
	const normalized = normalizeTranslations(translations);
	if (!normalized.length) return undefined;

	return (
		normalized.find((entry) => entry.languages_code === preferredLanguage) ??
		normalized.find((entry) => entry.languages_code === fallbackLanguage) ??
		normalized[0]
	);
}

function normalizeContentRequest<T extends { translations?: DirectusTranslation[] | null }>(
	item: T,
): T & { translations: DirectusTranslation[] } {
	return {
		...item,
		translations: normalizeTranslations(item.translations),
	};
}

type ContentRequestUpdateOptions = {
	comment?: string;
};

function normalizeComment(comment?: string): string | undefined {
	const trimmed = comment?.trim();
	return trimmed ? trimmed : undefined;
}

async function updateContentRequestWithOptions(
	id: number,
	updates: Partial<ContentRequest>,
	options?: ContentRequestUpdateOptions,
): Promise<ContentRequest> {
	const comment = normalizeComment(options?.comment);
	if (!comment) {
		return await useDirectus<ContentRequest>(updateItem('content_requests', id, updates));
	}

	return await useDirectus<ContentRequest>(
		customEndpoint({
			path: `/items/content_requests/${id}`,
			method: 'PATCH',
			params: { comment },
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(updates),
		}),
	);
}

/**
 * Fetch content requests with filters
 */
export async function useContentRequestsList(filters?: ContentRequestFilters) {
	const directusFilter: DirectusFilter = {};

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
				_or: [
					{ status: { _eq: CONTENT_REQUEST_STATUS.AWAITING_REVIEW } },
					{ status: { _eq: CONTENT_REQUEST_STATUS.AWAITING_APPROVAL } },
				],
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

	const items = await useDirectus<ContentRequestView[]>(
		readItems('content_requests', {
			fields: [
				'*',
				'translations.*',
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

	return items.map((item) => normalizeContentRequest(item));
}

/**
 * Fetch a single content request by ID
 */
export async function useContentRequestDetail(id: number) {
	const item = await useDirectus<ContentRequestView>(
		readItem('content_requests', id, {
			fields: [
				'*',
				'translations.*',
				{
					user_created: ['id', 'first_name', 'last_name', 'email', 'avatar'],
					user_updated: ['id', 'first_name', 'last_name', 'email', 'avatar'],
					knowledge_document: ['*'],
				},
			],
		}),
	);

	return normalizeContentRequest(item);
}

/**
 * Update content request status and holder
 */
export async function updateContentRequestStatus(
	id: number,
	status: ContentRequestStatus,
	currentHolder?: string,
	options?: ContentRequestUpdateOptions,
): Promise<ContentRequest> {
	const updates: Partial<ContentRequest> = {
		status,
	};

	if (currentHolder !== undefined) {
		updates.current_holder = currentHolder;
	}

	return await updateContentRequestWithOptions(id, updates, options);
}

/**
 * Update content request fields
 */
export async function updateContentRequest(id: number, updates: Partial<ContentRequest>): Promise<ContentRequest> {
	return await updateContentRequestWithOptions(id, updates);
}

/**
 * Helper: Get my tasks (requests I need to action)
 * For now, returns all requests in review/approval states
 * TODO: Filter by current_holder matching current user
 */
export async function useMyTasks() {
	return await useContentRequestsList({
		status: [CONTENT_REQUEST_STATUS.AWAITING_REVIEW, CONTENT_REQUEST_STATUS.AWAITING_APPROVAL],
	});
}

/**
 * Helper: Approve a content request
 * Moves from awaiting_review → awaiting_approval or awaiting_approval → published
 */
export async function approveContentRequest(id: number, currentStatus: ContentRequestStatus): Promise<ContentRequest> {
	let newStatus: ContentRequestStatus;
	let newHolder: string | undefined;

	if (currentStatus === CONTENT_REQUEST_STATUS.AWAITING_REVIEW) {
		// Move to awaiting_approval for final sign-off
		newStatus = CONTENT_REQUEST_STATUS.AWAITING_APPROVAL;
		newHolder = CONTENT_REQUEST_HOLDER.EDITOR; // Could be team lead/manager
	} else if (currentStatus === CONTENT_REQUEST_STATUS.AWAITING_APPROVAL) {
		// Final approval - publish
		newStatus = CONTENT_REQUEST_STATUS.PUBLISHED;
		newHolder = CONTENT_REQUEST_HOLDER.SYSTEM;
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
	if (
		![CONTENT_REQUEST_STATUS.AWAITING_REVIEW, CONTENT_REQUEST_STATUS.AWAITING_APPROVAL].includes(currentStatus)
	) {
		throw new Error(`Cannot reject request with status: ${currentStatus}`);
	}

	return await updateContentRequestStatus(id, CONTENT_REQUEST_STATUS.REJECTED, undefined);
}

/**
 * Helper: Request changes on a content request
 * Moves back to drafting for revisions
 */
export async function requestChanges(id: number, comment: string): Promise<ContentRequest> {
	const trimmedComment = normalizeComment(comment);
	if (!trimmedComment) {
		throw new Error('Comment is required to request changes.');
	}

	return await updateContentRequestStatus(id, CONTENT_REQUEST_STATUS.DRAFTING, CONTENT_REQUEST_HOLDER.AGENT, {
		comment: trimmedComment,
	});
}
