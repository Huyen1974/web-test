<script setup lang="ts">
import type { FieldConfig } from '~/composables/useDirectusTable';

const route = useRoute();
const workflowId = computed(() => Number(route.params.id));
const activeTab = computed(() => {
	const tab = typeof route.query.tab === 'string' ? route.query.tab : 'matrix';
	return ['matrix', 'diagram', 'wcr'].includes(tab) ? tab : 'matrix';
});

const tabs = computed(() => [
	{ name: 'Bang buoc', href: `/knowledge/workflows/${workflowId.value}?tab=matrix` },
	{ name: 'So do BPMN', href: `/knowledge/workflows/${workflowId.value}?tab=diagram` },
	{ name: 'De xuat thay doi', href: `/knowledge/workflows/${workflowId.value}?tab=wcr` },
]);

// Fetch workflow header info
const {
	data: workflow,
	pending,
	error,
} = await useAsyncData(
	() => `workflow-header:${workflowId.value}`,
	async () => {
		if (!Number.isInteger(workflowId.value) || workflowId.value <= 0) {
			throw createError({ statusCode: 400, statusMessage: 'Workflow id must be a positive integer.' });
		}
		const items = await useDirectus<any[]>(
			readItems('workflows', {
				filter: { id: { _eq: workflowId.value } },
				fields: ['id', 'title', 'description', 'status', 'task_id', 'version', 'process_code', 'sort', 'level', 'date_updated'],
				limit: 1,
			}),
		);
		return items?.[0] || null;
	},
	{ watch: [workflowId] },
);

import { readItems } from '@directus/sdk';

useSeoMeta({
	title: () => workflow.value?.title || 'Workflow Detail',
	description: () => workflow.value?.description || 'Workflow supervisor view',
});

// Steps table config
const stepFields: FieldConfig[] = [
	{ key: 'step_key', label: 'Ma buoc', sortable: true },
	{ key: 'title', label: 'Ten buoc', sortable: true },
	{ key: 'description', label: 'Mo ta', sortable: false, render: (v: string) => v || '—' },
	{ key: 'step_type', label: 'Loai buoc', sortable: true },
	{ key: 'actor_type', label: 'Actor', sortable: true, render: (v: string) => v || '—' },
];

const levelLabel: Record<number, string> = {
	1: 'Cu',
	2: 'Ba',
	3: 'Me',
};

function workflowLevel(level?: number | null) {
	return levelLabel[level || 1] || `Tang ${level || 1}`;
}
</script>

<template>
	<div class="container mx-auto px-4 py-8">
		<div v-if="pending" class="py-12 text-center">
			<div class="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
			<p class="mt-2 text-gray-600 dark:text-gray-400">Loading workflow...</p>
		</div>

		<div
			v-else-if="error || !workflow"
			class="rounded-md border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20"
		>
			<p class="text-red-800 dark:text-red-200">Error loading workflow: {{ error?.message || 'Not found' }}</p>
		</div>

		<div v-else class="space-y-6">
			<div>
				<NuxtLink
					to="/knowledge/workflows"
					class="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
				>
					&larr; Back to Workflows
				</NuxtLink>

				<div class="flex flex-wrap items-start justify-between gap-4">
					<div>
						<div class="flex flex-wrap items-center gap-2">
							<h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ workflow.title }}</h1>
							<span
								v-if="workflow.process_code"
								class="inline-flex rounded-full bg-primary-100 px-2.5 py-1 text-xs font-medium text-primary-700 dark:bg-primary-900/40 dark:text-primary-300"
							>
								{{ workflow.process_code }}
							</span>
						</div>
						<p v-if="workflow.description" class="mt-1 text-gray-600 dark:text-gray-400">
							{{ workflow.description }}
						</p>
					</div>

					<div class="flex flex-wrap items-center gap-2">
						<span
							class="inline-flex rounded-full bg-gray-100 px-3 py-1 text-sm font-medium capitalize text-gray-700 dark:bg-gray-700/50 dark:text-gray-300"
						>
							{{ workflow.status }}
						</span>
						<span
							class="inline-flex rounded-full bg-sky-100 px-3 py-1 text-sm font-medium text-sky-700 dark:bg-sky-900/40 dark:text-sky-300"
						>
							{{ workflowLevel(workflow.level) }}
						</span>
					</div>
				</div>
			</div>

			<div class="grid gap-4 sm:grid-cols-4">
				<div class="rounded-lg bg-white p-4 shadow dark:bg-gray-800">
					<p class="text-sm font-medium text-gray-500 dark:text-gray-400">STT</p>
					<p class="mt-1 text-lg font-semibold text-gray-900 dark:text-white">{{ workflow.sort ?? '—' }}</p>
				</div>
				<div class="rounded-lg bg-white p-4 shadow dark:bg-gray-800">
					<p class="text-sm font-medium text-gray-500 dark:text-gray-400">Version</p>
					<p class="mt-1 text-lg font-semibold text-gray-900 dark:text-white">{{ workflow.version }}</p>
				</div>
				<div class="rounded-lg bg-white p-4 shadow dark:bg-gray-800">
					<p class="text-sm font-medium text-gray-500 dark:text-gray-400">Task linked</p>
					<p class="mt-1 text-lg font-semibold text-gray-900 dark:text-white">{{ workflow.task_id || '—' }}</p>
				</div>
				<div class="rounded-lg bg-white p-4 shadow dark:bg-gray-800">
					<p class="text-sm font-medium text-gray-500 dark:text-gray-400">Workflow ID</p>
					<p class="mt-1 text-lg font-semibold text-gray-900 dark:text-white">#{{ workflow.id }}</p>
				</div>
			</div>

			<VHorizontalNavigation :items="tabs" />

			<!-- Steps tab: DirectusDataTable -->
			<SharedDirectusDataTable
				v-if="activeTab === 'matrix'"
				collection="workflow_steps"
				:fields="stepFields"
				:filters="{ workflow_id: { _eq: workflowId } }"
				:default-sort="['sort_order', 'id']"
				:page-size="50"
				:searchable="false"
				title="Bang buoc"
				:stt="true"
			>
				<template #cell-step_type="{ value }">
					<span
						class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium"
						:class="{
							'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300': value === 'action',
							'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300': value === 'condition',
							'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300': value === 'agent_call',
							'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300': value === 'human_checkpoint',
							'bg-slate-100 text-slate-700 dark:bg-slate-700/50 dark:text-slate-200': value === 'wait_for_event',
							'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300': value === 'loop',
							'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/40 dark:text-fuchsia-300': value === 'parallel',
						}"
					>
						{{ value }}
					</span>
				</template>
			</SharedDirectusDataTable>

			<!-- Diagram tab -->
			<NuxtErrorBoundary v-else-if="activeTab === 'diagram'">
				<ModulesWorkflowModuleWorkflowViewer :workflow-id="workflow.id" />

				<template #error="{ error: bpmnError }">
					<div class="rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-900/20">
						<p class="text-sm font-medium text-red-700 dark:text-red-300">Unable to load workflow diagram</p>
						<p class="mt-1 text-xs text-red-500 dark:text-red-400">{{ bpmnError?.message || 'Unknown error' }}</p>
					</div>
				</template>
			</NuxtErrorBoundary>

			<!-- WCR tab: keep existing component (has create form, not just a table) -->
			<ModulesWorkflowModulePartialsWcrIntakePanel
				v-else
				:workflow-id="workflow.id"
			/>

			<ModulesCommentModule
				v-if="workflow.task_id"
				:task-id="workflow.task_id"
				title="Workflow Governance"
				show-checkpoints
			/>
		</div>
	</div>
</template>
