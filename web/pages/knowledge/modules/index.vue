<script setup lang="ts">
import { readItems } from '@directus/sdk';
import type { Task, TaskStatus } from '~/types/tasks';
import { TASK_STATUS_META } from '~/types/tasks';

definePageMeta({
	title: 'Modules',
	description: 'Module showcase and testing',
});

const { data: modules, pending, error } = await useAsyncData(
	'modules-list',
	async () => {
		return await useDirectus<Task[]>(
			readItems('tasks', {
				filter: { task_type: { _eq: 'module' } },
				fields: ['id', 'name', 'description', 'status', 'priority', 'lead_ai', 'critic_ai', 'date_updated'],
				sort: ['sort', '-date_updated'],
				limit: 50,
			}),
		);
	},
);

function statusMeta(status: string) {
	return TASK_STATUS_META[status as TaskStatus] || { label: status, color: 'gray', icon: '' };
}
</script>

<template>
	<div class="container mx-auto px-4 py-8">
		<div class="mb-8">
			<NuxtLink
				to="/knowledge"
				class="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
			>
				&larr; Knowledge Hub
			</NuxtLink>
			<h1 class="text-3xl font-bold text-gray-900 dark:text-white">Modules</h1>
			<p class="mt-2 text-gray-600 dark:text-gray-400">
				Reusable components built for the AI collaboration platform. Click a module to test it live.
			</p>
		</div>

		<!-- Loading -->
		<div v-if="pending" class="py-12 text-center">
			<div class="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
			<p class="mt-2 text-gray-600 dark:text-gray-400">Loading modules...</p>
		</div>

		<!-- Error -->
		<div
			v-else-if="error"
			class="rounded-md border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20"
		>
			<p class="text-red-800 dark:text-red-200">Error loading modules: {{ error.message }}</p>
		</div>

		<!-- Empty -->
		<div v-else-if="!modules?.length" class="py-12 text-center">
			<h3 class="text-lg font-medium text-gray-900 dark:text-white">No modules yet</h3>
			<p class="mt-1 text-gray-500 dark:text-gray-400">Modules will appear here when created with task_type "module".</p>
		</div>

		<!-- Module Cards -->
		<div v-else class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
			<NuxtLink
				v-for="mod in modules"
				:key="mod.id"
				:to="`/knowledge/modules/${mod.id}`"
				class="group rounded-lg bg-white p-6 shadow transition-shadow hover:shadow-lg dark:bg-gray-800"
			>
				<div class="flex items-start justify-between">
					<h3 class="text-lg font-semibold text-gray-900 group-hover:text-primary-600 dark:text-white dark:group-hover:text-primary-400">
						{{ mod.name }}
					</h3>
					<span
						:class="`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-${statusMeta(mod.status).color}-100 text-${statusMeta(mod.status).color}-800 dark:bg-${statusMeta(mod.status).color}-900/30 dark:text-${statusMeta(mod.status).color}-400`"
					>
						{{ statusMeta(mod.status).label }}
					</span>
				</div>

				<p v-if="mod.description" class="mt-2 text-sm text-gray-600 line-clamp-2 dark:text-gray-400">
					{{ mod.description }}
				</p>

				<div class="mt-4 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
					<span v-if="mod.lead_ai" class="inline-flex items-center gap-1">
						Lead: {{ mod.lead_ai }}
					</span>
					<span v-if="mod.critic_ai" class="inline-flex items-center gap-1">
						Critic: {{ mod.critic_ai }}
					</span>
				</div>
			</NuxtLink>
		</div>
	</div>
</template>
