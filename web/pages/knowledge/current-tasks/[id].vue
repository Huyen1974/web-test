<script setup lang="ts">
import type { TaskStatus, TaskPriority } from '~/types/tasks';
import { TASK_STATUS_META, TASK_PRIORITY_META, TAB_CONFIG } from '~/types/tasks';

function statusMeta(status: string) {
	return TASK_STATUS_META[status as TaskStatus] || { label: status, color: 'gray', icon: '' };
}

function priorityMeta(priority: string) {
	return TASK_PRIORITY_META[priority as TaskPriority] || { label: priority, color: 'gray' };
}

const route = useRoute();
const taskId = route.params.id as string;

const {
	data: task,
	error,
	pending,
	refresh,
} = await useAsyncData(`task-${taskId}`, async () => {
	return await useTaskDetail(taskId);
});

// Build tab navigation items
const tabs = computed(() => {
	return TAB_CONFIG.map((tab) => ({
		name: tab.label,
		href: `/knowledge/current-tasks/${taskId}/${tab.key}`,
	}));
});

// Provide task data to child pages
provide('task', task);
provide('refreshTask', refresh);
</script>

<template>
	<div class="container mx-auto px-4 py-8">
		<!-- Loading -->
		<div v-if="pending" class="py-12 text-center">
			<div class="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
			<p class="mt-2 text-gray-600 dark:text-gray-400">Loading task...</p>
		</div>

		<!-- Error -->
		<div
			v-else-if="error"
			class="rounded-md border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20"
		>
			<p class="text-red-800 dark:text-red-200">Error loading task: {{ error.message }}</p>
		</div>

		<!-- Task Detail -->
		<div v-else-if="task" class="space-y-6">
			<!-- Header -->
			<div>
				<NuxtLink
					to="/knowledge/current-tasks"
					class="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
				>
					&larr; Back to Tasks
				</NuxtLink>

				<div class="flex flex-wrap items-start justify-between gap-4">
					<div>
						<h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ task.name }}</h1>
						<p v-if="task.description" class="mt-1 text-gray-600 dark:text-gray-400">
							{{ task.description }}
						</p>
					</div>

					<div class="flex flex-wrap items-center gap-2">
						<span
							:class="`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium bg-${statusMeta(task.status).color}-100 text-${statusMeta(task.status).color}-800 dark:bg-${statusMeta(task.status).color}-900/30 dark:text-${statusMeta(task.status).color}-400`"
						>
							{{ statusMeta(task.status).label }}
						</span>
						<span
							v-if="task.priority"
							:class="`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium bg-${priorityMeta(task.priority!).color}-100 text-${priorityMeta(task.priority!).color}-800 dark:bg-${priorityMeta(task.priority!).color}-900/30 dark:text-${priorityMeta(task.priority!).color}-400`"
						>
							{{ priorityMeta(task.priority!).label }}
						</span>
						<span
							v-if="task.assigned_to"
							class="inline-flex items-center rounded-full bg-purple-100 px-3 py-1 text-sm font-medium text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
						>
							{{ task.assigned_to }}
						</span>
						<span
							v-if="task.deadline"
							class="inline-flex items-center text-sm text-gray-500 dark:text-gray-400"
						>
							Due: {{ new Date(task.deadline).toLocaleDateString() }}
						</span>
					</div>
				</div>
			</div>

			<!-- Tabs -->
			<VHorizontalNavigation :items="tabs" />

			<!-- Tab Content -->
			<NuxtPage />
		</div>
	</div>
</template>
