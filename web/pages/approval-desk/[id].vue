<script setup lang="ts">
import type { ContentRequestView, ContentRequestStatus } from '~/types';
import { CONTENT_REQUEST_STATUS_META } from '~/types/content-requests';

const route = useRoute();
const router = useRouter();
const requestId = computed(() => parseInt(route.params.id as string));

// Fetch content request details
const {
	data: request,
	error,
	pending,
	refresh,
} = await useAsyncData(`content-request-${requestId.value}`, async () => {
	return await useContentRequestDetail(requestId.value);
});

// Action state
const actionPending = ref(false);
const actionError = ref<string | null>(null);
const actionSuccess = ref<string | null>(null);
const comment = ref('');

// Handle approve action
async function handleApprove() {
	if (!request.value) return;

	actionPending.value = true;
	actionError.value = null;
	actionSuccess.value = null;

	try {
		await approveContentRequest(request.value.id, request.value.status);
		actionSuccess.value = 'Request approved successfully!';
		await refresh();

		// Redirect back to list after success
		setTimeout(() => {
			router.push('/approval-desk');
		}, 2000);
	} catch (err: any) {
		actionError.value = err.message || 'Failed to approve request';
	} finally {
		actionPending.value = false;
	}
}

// Handle reject action
async function handleReject() {
	if (!request.value) return;

	if (!confirm('Are you sure you want to reject this request? This action cannot be undone.')) {
		return;
	}

	actionPending.value = true;
	actionError.value = null;
	actionSuccess.value = null;

	try {
		await rejectContentRequest(request.value.id, request.value.status);
		actionSuccess.value = 'Request rejected';
		await refresh();

		// Redirect back to list after success
		setTimeout(() => {
			router.push('/approval-desk');
		}, 2000);
	} catch (err: any) {
		actionError.value = err.message || 'Failed to reject request';
	} finally {
		actionPending.value = false;
	}
}

// Handle request changes action
async function handleRequestChanges() {
	if (!request.value) return;

	if (!comment.value.trim()) {
		actionError.value = 'Please provide feedback in the comment box';
		return;
	}

	actionPending.value = true;
	actionError.value = null;
	actionSuccess.value = null;

	try {
		await requestChanges(request.value.id);
		// TODO: Add comment via Directus comments API
		actionSuccess.value = 'Request sent back for changes';
		await refresh();

		// Redirect back to list after success
		setTimeout(() => {
			router.push('/approval-desk');
		}, 2000);
	} catch (err: any) {
		actionError.value = err.message || 'Failed to request changes';
	} finally {
		actionPending.value = false;
	}
}

// Can user take action on this request?
const canApprove = computed(() => {
	if (!request.value) return false;
	return ['awaiting_review', 'awaiting_approval'].includes(request.value.status);
});

const canReject = computed(() => {
	if (!request.value) return false;
	return ['awaiting_review', 'awaiting_approval'].includes(request.value.status);
});

// Format date helper
function formatDateTime(dateStr?: string): string {
	if (!dateStr) return 'N/A';
	const date = new Date(dateStr);
	return date.toLocaleString();
}
</script>

<template>
	<div class="container mx-auto px-4 py-8 max-w-5xl">
		<!-- Back button -->
		<div class="mb-6">
			<NuxtLink
				to="/approval-desk"
				class="inline-flex items-center text-sm font-medium text-purple-600 hover:text-purple-800 dark:text-purple-400"
			>
				<svg class="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
				</svg>
				Back to My Tasks
			</NuxtLink>
		</div>

		<!-- Loading state -->
		<div v-if="pending" class="text-center py-12">
			<div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
			<p class="mt-2 text-gray-600 dark:text-gray-400">Loading request...</p>
		</div>

		<!-- Error state -->
		<div
			v-else-if="error"
			class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4"
		>
			<p class="text-red-800 dark:text-red-200">Error loading request: {{ error.message }}</p>
		</div>

		<!-- Content -->
		<div v-else-if="request" class="space-y-6">
			<!-- Header -->
			<div class="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
				<div class="flex items-start justify-between">
					<div class="flex-1">
						<div class="flex items-center gap-3 mb-2">
							<h1 class="text-2xl font-bold text-gray-900 dark:text-white">
								{{ request.title }}
							</h1>
							<span
								:class="`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-${CONTENT_REQUEST_STATUS_META[request.status].color}-100 text-${CONTENT_REQUEST_STATUS_META[request.status].color}-800 dark:bg-${CONTENT_REQUEST_STATUS_META[request.status].color}-900/30 dark:text-${CONTENT_REQUEST_STATUS_META[request.status].color}-400`"
							>
								{{ CONTENT_REQUEST_STATUS_META[request.status].label }}
							</span>
						</div>
						<p class="text-sm text-gray-500 dark:text-gray-400">
							Request #{{ request.id }} • Created {{ formatDateTime(request.date_created) }}
						</p>
					</div>
				</div>
			</div>

			<!-- Metadata -->
			<div class="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
				<h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Request Details</h2>
				<dl class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<div>
						<dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Goal</dt>
						<dd class="mt-1 text-sm text-gray-900 dark:text-white">{{ request.goal || 'Not specified' }}</dd>
					</div>
					<div>
						<dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Current Holder</dt>
						<dd class="mt-1 text-sm text-gray-900 dark:text-white">{{ request.current_holder || 'Unassigned' }}</dd>
					</div>
					<div>
						<dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Target Audience</dt>
						<dd class="mt-1 text-sm text-gray-900 dark:text-white">{{ request.target_audience || 'Not specified' }}</dd>
					</div>
					<div>
						<dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Tone</dt>
						<dd class="mt-1 text-sm text-gray-900 dark:text-white">{{ request.tone || 'Not specified' }}</dd>
					</div>
					<div class="sm:col-span-2">
						<dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Last Updated</dt>
						<dd class="mt-1 text-sm text-gray-900 dark:text-white">{{ formatDateTime(request.date_updated) }}</dd>
					</div>
				</dl>
			</div>

			<!-- Requirements -->
			<div class="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
				<h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Requirements</h2>
				<div class="prose dark:prose-invert max-w-none">
					<p v-if="!request.requirements" class="text-gray-500 dark:text-gray-400 italic">No requirements specified</p>
					<div v-else class="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{{ request.requirements }}</div>
				</div>
			</div>

			<!-- Knowledge Document (if linked) -->
			<div v-if="request.knowledge_document" class="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
				<h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Linked Knowledge Document</h2>
				<div class="flex items-center justify-between">
					<div>
						<p class="font-medium text-gray-900 dark:text-white">{{ request.knowledge_document.title }}</p>
						<p class="text-sm text-gray-500 dark:text-gray-400">ID: {{ request.knowledge_document.id }}</p>
					</div>
					<a
						v-if="request.knowledge_document.slug"
						:href="`/knowledge/${request.knowledge_document.slug}`"
						target="_blank"
						class="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
					>
						View Document
						<svg class="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
							/>
						</svg>
					</a>
				</div>
			</div>

			<!-- Diff Section (Placeholder) -->
			<div class="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
				<h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Content Diff / Revisions</h2>
				<div class="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
					<svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
						/>
					</svg>
					<p class="mt-2 text-sm text-gray-500 dark:text-gray-400">Diff view will be available here</p>
					<p class="text-xs text-gray-400 dark:text-gray-500 mt-1">
						MVP: Link to Directus revisions UI or embed simple text diff
					</p>
				</div>
			</div>

			<!-- Action messages -->
			<div
				v-if="actionSuccess"
				class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-4"
			>
				<p class="text-green-800 dark:text-green-200">✓ {{ actionSuccess }}</p>
			</div>

			<div
				v-if="actionError"
				class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4"
			>
				<p class="text-red-800 dark:text-red-200">✗ {{ actionError }}</p>
			</div>

			<!-- Actions Panel -->
			<div v-if="canApprove || canReject" class="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
				<h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Review Actions</h2>

				<!-- Comment box -->
				<div class="mb-4">
					<label for="comment" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
						Add Comment (optional for approval, required for requesting changes)
					</label>
					<textarea
						id="comment"
						v-model="comment"
						rows="4"
						class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-purple-500 focus:ring-purple-500"
						placeholder="Enter your feedback or comments here..."
						:disabled="actionPending"
					></textarea>
				</div>

				<!-- Action buttons -->
				<div class="flex flex-wrap gap-3">
					<button
						v-if="canApprove"
						:disabled="actionPending"
						class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
						@click="handleApprove"
					>
						<svg class="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
						</svg>
						{{ actionPending ? 'Processing...' : 'Approve' }}
					</button>

					<button
						:disabled="actionPending || !comment.trim()"
						class="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
						@click="handleRequestChanges"
					>
						<svg class="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
							/>
						</svg>
						{{ actionPending ? 'Processing...' : 'Request Changes' }}
					</button>

					<button
						v-if="canReject"
						:disabled="actionPending"
						class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
						@click="handleReject"
					>
						<svg class="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
						{{ actionPending ? 'Processing...' : 'Reject' }}
					</button>
				</div>

				<p class="mt-3 text-sm text-gray-500 dark:text-gray-400">
					<strong>Note:</strong>
					Actions will update the request status and trigger E1-02 Flows for webhook notifications and audit logging.
				</p>
			</div>

			<!-- Not actionable notice -->
			<div v-else class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4">
				<p class="text-blue-800 dark:text-blue-200">
					This request is in "{{ CONTENT_REQUEST_STATUS_META[request.status].label }}" status and cannot be actioned
					from the Approval Desk.
				</p>
			</div>
		</div>
	</div>
</template>
