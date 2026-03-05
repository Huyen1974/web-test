<script setup lang="ts">
import type { FieldConfig } from '~/composables/useDirectusTable';
import type { TaskStatus, TaskPriority } from '~/types/tasks';
import { TASK_STATUS_META, TASK_PRIORITY_META } from '~/types/tasks';

definePageMeta({
	title: 'Task Manager',
	description: 'Super Session task management',
});

const taskFields: FieldConfig[] = [
	{ key: 'name', label: 'Name', sortable: true },
	{
		key: 'status',
		label: 'Status',
		sortable: true,
		filterable: true,
		filterOptions: [
			{ label: 'Draft', value: 'draft' },
			{ label: 'Active', value: 'active' },
			{ label: 'In Review', value: 'in_review' },
			{ label: 'Completed', value: 'completed' },
			{ label: 'Archived', value: 'archived' },
		],
	},
	{ key: 'priority', label: 'Priority', sortable: true },
	{ key: 'assigned_to', label: 'Assigned To', sortable: false, render: (v: string) => v || 'Unassigned' },
	{ key: 'deadline', label: 'Deadline', sortable: true, render: (v: string) => v ? new Date(v).toLocaleDateString() : '-' },
	{ key: 'date_updated', label: 'Updated', sortable: true, render: (v: string) => formatDate(v) },
];

function statusMeta(status: string) {
	return TASK_STATUS_META[status as TaskStatus] || { label: status, color: 'gray', icon: '' };
}

function priorityMeta(priority: string) {
	return TASK_PRIORITY_META[priority as TaskPriority] || { label: priority, color: 'gray' };
}

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
</script>

<template>
	<div class="container mx-auto px-4 py-8">
		<!-- Header -->
		<div class="mb-8">
			<h1 class="text-3xl font-bold text-gray-900 dark:text-white">Task Manager</h1>
			<p class="mt-2 text-gray-600 dark:text-gray-400">Super Session collaborative task management</p>
		</div>

		<SharedDirectusTable
			collection="tasks"
			:fields="taskFields"
			:default-sort="['-date_updated']"
			:page-size="25"
			:row-link="(item: any) => `/knowledge/current-tasks/${item.id}`"
			:show-insert-marks="false"
			:show-column-marks="false"
		>
			<template #cell-status="{ value }">
				<UBadge
					:label="statusMeta(value).label"
					:color="statusMeta(value).color"
					variant="subtle"
					size="xs"
				/>
			</template>
			<template #cell-priority="{ value }">
				<UBadge
					v-if="value"
					:label="priorityMeta(value).label"
					:color="priorityMeta(value).color"
					variant="subtle"
					size="xs"
				/>
				<span v-else class="text-sm text-gray-400">-</span>
			</template>
		</SharedDirectusTable>
	</div>
</template>
