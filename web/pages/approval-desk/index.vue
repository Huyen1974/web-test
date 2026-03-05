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

// UTable columns
const columns = [
	{ key: 'id', label: 'ID', sortable: true },
	{ key: 'title', label: 'Title', sortable: true },
	{ key: 'status', label: 'Status', sortable: true },
	{ key: 'current_holder', label: 'Assigned To', sortable: false },
	{ key: 'date_updated', label: 'Last Updated', sortable: true },
	{ key: 'actions', label: 'Actions', sortable: false },
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

	if (diffHours < 1) return 'Just now';
	if (diffHours < 24) return `${diffHours}h ago`;
	if (diffDays < 7) return `${diffDays}d ago`;
	return date.toLocaleDateString();
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
			<div class="min-w-[200px] flex-1">
				<label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Filter by Status</label>
				<USelectMenu
					v-model="selectedStatus"
					:options="statusOptions"
					value-attribute="value"
					option-attribute="label"
					multiple
					placeholder="Select statuses"
				/>
			</div>

			<div class="flex items-end">
				<UCheckbox
					v-model="showOverdueOnly"
					label="Show overdue only (>24h)"
				/>
			</div>

			<div class="ml-auto flex items-end">
				<UButton color="purple" @click="refresh()">Refresh</UButton>
			</div>
		</div>

		<!-- Loading state -->
		<div v-if="pending" class="py-12 text-center">
			<div class="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-purple-600"></div>
			<p class="mt-2 text-gray-600 dark:text-gray-400">Loading tasks...</p>
		</div>

		<!-- Error state -->
		<div
			v-else-if="error"
			class="rounded-md border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20"
		>
			<p class="text-red-800 dark:text-red-200">Error loading tasks: {{ error.message }}</p>
		</div>

		<!-- Empty state -->
		<div v-else-if="!filteredTasks || filteredTasks.length === 0" class="py-12 text-center">
			<div class="mb-4 text-gray-400 dark:text-gray-600">
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

		<!-- Tasks table (UTable) -->
		<div v-else>
			<UTable
				:rows="filteredTasks"
				:columns="columns"
				:ui="{
					tr: { active: 'hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors' },
				}"
			>
				<template #id-data="{ row }">
					<span class="text-sm text-gray-900 dark:text-gray-100">#{{ row.id }}</span>
				</template>

				<template #title-data="{ row }">
					<div class="flex items-center">
						<NuxtLink
							:to="`/approval-desk/${row.id}`"
							class="font-medium text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300"
						>
							{{ row.title }}
						</NuxtLink>
						<UBadge v-if="isTaskOverdue(row)" label="Overdue" color="red" variant="subtle" size="xs" class="ml-2" />
					</div>
				</template>

				<template #status-data="{ row }">
					<UBadge
						:label="CONTENT_REQUEST_STATUS_META[row.status]?.label || row.status"
						:color="CONTENT_REQUEST_STATUS_META[row.status]?.color || 'gray'"
						variant="subtle"
						size="xs"
					/>
				</template>

				<template #current_holder-data="{ row }">
					<span class="text-sm text-gray-500 dark:text-gray-400">{{ row.current_holder || 'Unassigned' }}</span>
				</template>

				<template #date_updated-data="{ row }">
					<span class="text-sm text-gray-500 dark:text-gray-400">{{ formatDate(row.date_updated) }}</span>
				</template>

				<template #actions-data="{ row }">
					<NuxtLink
						:to="`/approval-desk/${row.id}`"
						class="text-sm font-medium text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300"
					>
						Review
					</NuxtLink>
				</template>
			</UTable>

			<!-- Summary stats -->
			<div class="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
				<div class="overflow-hidden rounded-lg bg-white shadow dark:bg-gray-800">
					<div class="p-5">
						<p class="truncate text-sm font-medium text-gray-500 dark:text-gray-400">Total Tasks</p>
						<p class="text-lg font-semibold text-gray-900 dark:text-white">{{ filteredTasks.length }}</p>
					</div>
				</div>
				<div class="overflow-hidden rounded-lg bg-white shadow dark:bg-gray-800">
					<div class="p-5">
						<p class="truncate text-sm font-medium text-gray-500 dark:text-gray-400">Awaiting Review</p>
						<p class="text-lg font-semibold text-gray-900 dark:text-white">
							{{ filteredTasks.filter((t) => t.status === 'awaiting_review').length }}
						</p>
					</div>
				</div>
				<div class="overflow-hidden rounded-lg bg-white shadow dark:bg-gray-800">
					<div class="p-5">
						<p class="truncate text-sm font-medium text-gray-500 dark:text-gray-400">Overdue</p>
						<p class="text-lg font-semibold text-gray-900 dark:text-white">
							{{ filteredTasks.filter((t) => isTaskOverdue(t)).length }}
						</p>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>
