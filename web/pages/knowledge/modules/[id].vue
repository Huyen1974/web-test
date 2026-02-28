<script setup lang="ts">
import { readItem } from '@directus/sdk';
import type { Task, TaskStatus, TaskPriority } from '~/types/tasks';
import { TASK_STATUS_META, TASK_PRIORITY_META } from '~/types/tasks';

const route = useRoute();
const moduleId = route.params.id as string;

const { data: mod, pending, error } = await useAsyncData(
	`module-${moduleId}`,
	async () => {
		return await useDirectus<Task>(
			readItem('tasks', moduleId, {
				fields: ['*'],
			}),
		);
	},
);

useSeoMeta({
	title: () => mod.value?.name || 'Module Detail',
	description: () => mod.value?.description || 'Module showcase and testing',
});

function statusMeta(status: string) {
	return TASK_STATUS_META[status as TaskStatus] || { label: status, color: 'gray', icon: '' };
}

function priorityMeta(priority: string) {
	return TASK_PRIORITY_META[priority as TaskPriority] || { label: priority, color: 'gray' };
}
</script>

<template>
	<div class="container mx-auto px-4 py-8">
		<!-- Loading -->
		<div v-if="pending" class="py-12 text-center">
			<div class="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
			<p class="mt-2 text-gray-600 dark:text-gray-400">Loading module...</p>
		</div>

		<!-- Error -->
		<div
			v-else-if="error"
			class="rounded-md border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20"
		>
			<p class="text-red-800 dark:text-red-200">Error loading module: {{ error.message }}</p>
		</div>

		<!-- Module Detail -->
		<div v-else-if="mod" class="space-y-6">
			<!-- Header -->
			<div>
				<NuxtLink
					to="/knowledge/modules"
					class="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
				>
					&larr; Back to Modules
				</NuxtLink>

				<div class="flex flex-wrap items-start justify-between gap-4">
					<div>
						<h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ mod.name }}</h1>
						<p v-if="mod.description" class="mt-1 text-gray-600 dark:text-gray-400">
							{{ mod.description }}
						</p>
					</div>

					<div class="flex flex-wrap items-center gap-2">
						<span
							:class="`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium bg-${statusMeta(mod.status).color}-100 text-${statusMeta(mod.status).color}-800 dark:bg-${statusMeta(mod.status).color}-900/30 dark:text-${statusMeta(mod.status).color}-400`"
						>
							{{ statusMeta(mod.status).label }}
						</span>
						<span
							v-if="mod.priority"
							:class="`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium bg-${priorityMeta(mod.priority!).color}-100 text-${priorityMeta(mod.priority!).color}-800 dark:bg-${priorityMeta(mod.priority!).color}-900/30 dark:text-${priorityMeta(mod.priority!).color}-400`"
						>
							{{ priorityMeta(mod.priority!).label }}
						</span>
					</div>
				</div>
			</div>

			<!-- Info Cards -->
			<div class="grid gap-4 sm:grid-cols-3">
				<div class="rounded-lg bg-white p-4 shadow dark:bg-gray-800">
					<p class="text-sm font-medium text-gray-500 dark:text-gray-400">Lead AI</p>
					<p class="mt-1 text-lg font-semibold text-gray-900 dark:text-white">{{ mod.lead_ai || 'Unassigned' }}</p>
				</div>
				<div class="rounded-lg bg-white p-4 shadow dark:bg-gray-800">
					<p class="text-sm font-medium text-gray-500 dark:text-gray-400">Critic AI</p>
					<p class="mt-1 text-lg font-semibold text-gray-900 dark:text-white">{{ mod.critic_ai || 'Unassigned' }}</p>
				</div>
				<div v-if="mod.plan_document_path" class="rounded-lg bg-white p-4 shadow dark:bg-gray-800">
					<p class="text-sm font-medium text-gray-500 dark:text-gray-400">Plan Document</p>
					<NuxtLink
						:to="`/knowledge/${mod.plan_document_path.replace(/^knowledge\//, '').replace(/\.md$/, '')}`"
						class="mt-1 block text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400"
					>
						View Plan &rarr;
					</NuxtLink>
				</div>
			</div>

			<!-- Task Detail Link -->
			<div class="text-sm text-gray-500 dark:text-gray-400">
				<NuxtLink
					:to="`/knowledge/current-tasks/${mod.id}`"
					class="text-primary-600 hover:text-primary-700 dark:text-primary-400"
				>
					View full task detail &rarr;
				</NuxtLink>
			</div>

			<!-- Live CommentModule -->
			<ModulesCommentModule :task-id="mod.id" title="Module Discussion" />
		</div>
	</div>
</template>
