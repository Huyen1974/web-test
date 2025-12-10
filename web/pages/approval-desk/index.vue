<script setup lang="ts">
import type { ContentRequestView, ContentRequestStatus } from '~/types';
import { CONTENT_REQUEST_STATUS_META, isOverdue } from '~/types/content-requests';

definePageMeta({
	title: 'Approval Desk',
	description: 'Review and approve content requests',
});

// Fetch my tasks
const {
	data: tasks,
	error,
	pending,
	refresh,
} = await useAsyncData(
	'my-tasks',
	async () => {
		return await useMyTasks();
	},
	{
		watch: [],
	},
);

// Status filter
const selectedStatus = ref<ContentRequestStatus[]>(['awaiting_review', 'awaiting_approval']);
const showOverdueOnly = ref(false);

// Computed filtered tasks
const filteredTasks = computed(() => {
	if (!tasks.value) return [];

	let filtered = tasks.value;

	// Filter by status
	if (selectedStatus.value.length > 0) {
		filtered = filtered.filter((task) => selectedStatus.value.includes(task.status));
	}

	// Filter by overdue
	if (showOverdueOnly.value) {
		filtered = filtered.filter((task) => {
			if (!task.date_updated) return false;
			if (!['awaiting_review', 'awaiting_approval'].includes(task.status)) return false;
			return isOverdue(task.date_updated, 24);
		});
	}

	return filtered;
});

// Table columns
const columns = [
	{
		key: 'id',
		label: 'ID',
	},
	{
		key: 'title',
		label: 'Title',
	},
	{
		key: 'status',
		label: 'Status',
	},
	{
		key: 'current_holder',
		label: 'Assigned To',
	},
	{
		key: 'date_updated',
		label: 'Last Updated',
	},
	{
		key: 'actions',
		label: 'Actions',
	},
];

// Status filter options
const statusOptions = [
	{ value: 'awaiting_review', label: 'Awaiting Review' },
	{ value: 'awaiting_approval', label: 'Awaiting Approval' },
	{ value: 'drafting', label: 'Drafting' },
	{ value: 'new', label: 'New' },
	{ value: 'assigned', label: 'Assigned' },
];

// Helper to format date
function formatDate(dateStr?: string): string {
	if (!dateStr) return 'N/A';
	const date = new Date(dateStr);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
	const diffDays = Math.floor(diffHours / 24);

	if (diffHours < 1) {
		return 'Just now';
	} else if (diffHours < 24) {
		return `${diffHours}h ago`;
	} else if (diffDays < 7) {
		return `${diffDays}d ago`;
	} else {
		return date.toLocaleDateString();
	}
}

// Helper to check if overdue
function isTaskOverdue(task: ContentRequestView): boolean {
	if (!task.date_updated) return false;
	if (!['awaiting_review', 'awaiting_approval'].includes(task.status)) return false;
	return isOverdue(task.date_updated, 24);
}
</script>

<template>
	<div class="container mx-auto px-4 py-8">
		<!-- Header -->
		<div class="mb-8">
			<h1 class="text-3xl font-bold text-gray-900 dark:text-white">Approval Desk</h1>
			<p class="mt-2 text-gray-600 dark:text-gray-400">Review and approve content requests assigned to you</p>
		</div>

		<!-- Filters -->
		<div class="mb-6 flex flex-wrap gap-4">
			<div class="flex-1 min-w-[200px]">
				<label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Filter by Status</label>
				<select
					v-model="selectedStatus"
					multiple
					class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-800 shadow-sm focus:border-purple-500 focus:ring-purple-500"
				>
					<option v-for="option in statusOptions" :key="option.value" :value="option.value">
						{{ option.label }}
					</option>
				</select>
			</div>

			<div class="flex items-end">
				<label class="flex items-center space-x-2 cursor-pointer">
					<input
						v-model="showOverdueOnly"
						type="checkbox"
						class="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
					/>
					<span class="text-sm font-medium text-gray-700 dark:text-gray-300">Show overdue only (>24h)</span>
				</label>
			</div>

			<div class="flex items-end ml-auto">
				<button
					class="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
					@click="refresh()"
				>
					Refresh
				</button>
			</div>
		</div>

		<!-- Loading state -->
		<div v-if="pending" class="text-center py-12">
			<div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
			<p class="mt-2 text-gray-600 dark:text-gray-400">Loading tasks...</p>
		</div>

		<!-- Error state -->
		<div
			v-else-if="error"
			class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4"
		>
			<p class="text-red-800 dark:text-red-200">Error loading tasks: {{ error.message }}</p>
		</div>

		<!-- Empty state -->
		<div v-else-if="!filteredTasks || filteredTasks.length === 0" class="text-center py-12">
			<div class="text-gray-400 dark:text-gray-600 mb-4">
				<svg class="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
					/>
				</svg>
			</div>
			<h3 class="text-lg font-medium text-gray-900 dark:text-white">No tasks found</h3>
			<p class="mt-1 text-gray-500 dark:text-gray-400">There are no content requests matching your filters.</p>
		</div>

		<!-- Tasks table -->
		<div v-else class="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
			<table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
				<thead class="bg-gray-50 dark:bg-gray-900">
					<tr>
						<th
							v-for="column in columns"
							:key="column.key"
							scope="col"
							class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
						>
							{{ column.label }}
						</th>
					</tr>
				</thead>
				<tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
					<tr
						v-for="task in filteredTasks"
						:key="task.id"
						class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
					>
						<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">#{{ task.id }}</td>
						<td class="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
							<div class="flex items-center">
								<NuxtLink
									:to="`/approval-desk/${task.id}`"
									class="font-medium text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300"
								>
									{{ task.title }}
								</NuxtLink>
								<span
									v-if="isTaskOverdue(task)"
									class="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
								>
									Overdue
								</span>
							</div>
						</td>
						<td class="px-6 py-4 whitespace-nowrap">
							<span
								:class="`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${CONTENT_REQUEST_STATUS_META[task.status].color}-100 text-${CONTENT_REQUEST_STATUS_META[task.status].color}-800 dark:bg-${CONTENT_REQUEST_STATUS_META[task.status].color}-900/30 dark:text-${CONTENT_REQUEST_STATUS_META[task.status].color}-400`"
							>
								{{ CONTENT_REQUEST_STATUS_META[task.status].label }}
							</span>
						</td>
						<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
							{{ task.current_holder || 'Unassigned' }}
						</td>
						<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
							{{ formatDate(task.date_updated) }}
						</td>
						<td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
							<NuxtLink
								:to="`/approval-desk/${task.id}`"
								class="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300"
							>
								Review →
							</NuxtLink>
						</td>
					</tr>
				</tbody>
			</table>
		</div>

		<!-- Summary stats -->
		<div v-if="filteredTasks && filteredTasks.length > 0" class="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
			<div class="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
				<div class="p-5">
					<div class="flex items-center">
						<div class="flex-shrink-0">
							<svg class="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
								/>
							</svg>
						</div>
						<div class="ml-5 w-0 flex-1">
							<dl>
								<dt class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Total Tasks</dt>
								<dd class="text-lg font-semibold text-gray-900 dark:text-white">{{ filteredTasks.length }}</dd>
							</dl>
						</div>
					</div>
				</div>
			</div>

			<div class="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
				<div class="p-5">
					<div class="flex items-center">
						<div class="flex-shrink-0">
							<svg class="h-6 w-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
						</div>
						<div class="ml-5 w-0 flex-1">
							<dl>
								<dt class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Awaiting Review</dt>
								<dd class="text-lg font-semibold text-gray-900 dark:text-white">
									{{ filteredTasks.filter((t) => t.status === 'awaiting_review').length }}
								</dd>
							</dl>
						</div>
					</div>
				</div>
			</div>

			<div class="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
				<div class="p-5">
					<div class="flex items-center">
						<div class="flex-shrink-0">
							<svg class="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
								/>
							</svg>
						</div>
						<div class="ml-5 w-0 flex-1">
							<dl>
								<dt class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Overdue</dt>
								<dd class="text-lg font-semibold text-gray-900 dark:text-white">
									{{ filteredTasks.filter((t) => isTaskOverdue(t)).length }}
								</dd>
							</dl>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>
