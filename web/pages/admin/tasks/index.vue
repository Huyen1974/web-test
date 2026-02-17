<script setup lang="ts">
import type { Task, TaskStatus } from '~/types/tasks';
import { TASK_STATUS_META, TASK_PRIORITY_META } from '~/types/tasks';

definePageMeta({
	title: 'Task Manager',
	description: 'Super Session task management',
});

const {
	data: tasks,
	error,
	pending,
	refresh,
} = await useAsyncData(
	'tasks-list',
	async () => {
		return await useTasksList();
	},
	{ watch: [] },
);

// Status filter
const selectedStatus = ref<TaskStatus | ''>('');

const statusOptions = [
	{ value: '', label: 'All Statuses' },
	{ value: 'draft', label: 'Draft' },
	{ value: 'active', label: 'Active' },
	{ value: 'in_review', label: 'In Review' },
	{ value: 'completed', label: 'Completed' },
	{ value: 'archived', label: 'Archived' },
];

const filteredTasks = computed(() => {
	if (!tasks.value) return [];
	if (!selectedStatus.value) return tasks.value;
	return tasks.value.filter((t) => t.status === selectedStatus.value);
});

// Stats
const stats = computed(() => {
	if (!tasks.value) return { total: 0, active: 0, in_review: 0, completed: 0 };
	return {
		total: tasks.value.length,
		active: tasks.value.filter((t) => t.status === 'active').length,
		in_review: tasks.value.filter((t) => t.status === 'in_review').length,
		completed: tasks.value.filter((t) => t.status === 'completed').length,
	};
});

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

		<!-- Stats Cards -->
		<div class="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
			<div class="rounded-lg bg-white p-4 shadow dark:bg-gray-800">
				<p class="text-sm font-medium text-gray-500 dark:text-gray-400">Total</p>
				<p class="text-2xl font-bold text-gray-900 dark:text-white">{{ stats.total }}</p>
			</div>
			<div class="rounded-lg bg-white p-4 shadow dark:bg-gray-800">
				<p class="text-sm font-medium text-blue-500">Active</p>
				<p class="text-2xl font-bold text-gray-900 dark:text-white">{{ stats.active }}</p>
			</div>
			<div class="rounded-lg bg-white p-4 shadow dark:bg-gray-800">
				<p class="text-sm font-medium text-yellow-500">In Review</p>
				<p class="text-2xl font-bold text-gray-900 dark:text-white">{{ stats.in_review }}</p>
			</div>
			<div class="rounded-lg bg-white p-4 shadow dark:bg-gray-800">
				<p class="text-sm font-medium text-green-500">Completed</p>
				<p class="text-2xl font-bold text-gray-900 dark:text-white">{{ stats.completed }}</p>
			</div>
		</div>

		<!-- Filter -->
		<div class="mb-6 flex items-center gap-4">
			<select
				v-model="selectedStatus"
				class="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
			>
				<option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
			</select>
			<button
				class="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
				@click="refresh()"
			>
				Refresh
			</button>
		</div>

		<!-- Loading -->
		<div v-if="pending" class="py-12 text-center">
			<div class="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
			<p class="mt-2 text-gray-600 dark:text-gray-400">Loading tasks...</p>
		</div>

		<!-- Error -->
		<div
			v-else-if="error"
			class="rounded-md border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20"
		>
			<p class="text-red-800 dark:text-red-200">Error loading tasks: {{ error.message }}</p>
		</div>

		<!-- Empty -->
		<div v-else-if="!filteredTasks.length" class="py-12 text-center">
			<h3 class="text-lg font-medium text-gray-900 dark:text-white">No tasks found</h3>
			<p class="mt-1 text-gray-500 dark:text-gray-400">No tasks match the current filter.</p>
		</div>

		<!-- Table -->
		<div v-else class="overflow-hidden rounded-lg bg-white shadow-md dark:bg-gray-800">
			<table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
				<thead class="bg-gray-50 dark:bg-gray-900">
					<tr>
						<th
							class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
						>
							Name
						</th>
						<th
							class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
						>
							Status
						</th>
						<th
							class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
						>
							Priority
						</th>
						<th
							class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
						>
							Assigned To
						</th>
						<th
							class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
						>
							Deadline
						</th>
						<th
							class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
						>
							Updated
						</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
					<tr
						v-for="task in filteredTasks"
						:key="task.id"
						class="cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
						@click="navigateTo(`/admin/tasks/${task.id}`)"
					>
						<td class="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">
							{{ task.name }}
						</td>
						<td class="px-6 py-4 whitespace-nowrap">
							<span
								:class="`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-${TASK_STATUS_META[task.status].color}-100 text-${TASK_STATUS_META[task.status].color}-800 dark:bg-${TASK_STATUS_META[task.status].color}-900/30 dark:text-${TASK_STATUS_META[task.status].color}-400`"
							>
								{{ TASK_STATUS_META[task.status].label }}
							</span>
						</td>
						<td class="px-6 py-4 whitespace-nowrap">
							<span
								v-if="task.priority"
								:class="`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-${TASK_PRIORITY_META[task.priority].color}-100 text-${TASK_PRIORITY_META[task.priority].color}-800 dark:bg-${TASK_PRIORITY_META[task.priority].color}-900/30 dark:text-${TASK_PRIORITY_META[task.priority].color}-400`"
							>
								{{ TASK_PRIORITY_META[task.priority].label }}
							</span>
							<span v-else class="text-sm text-gray-400">-</span>
						</td>
						<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
							{{ task.assigned_to || 'Unassigned' }}
						</td>
						<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
							{{ task.deadline ? new Date(task.deadline).toLocaleDateString() : '-' }}
						</td>
						<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
							{{ formatDate(task.date_updated) }}
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>
</template>
