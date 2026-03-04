<script setup lang="ts">
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

const {
	data,
	pending,
	error,
} = await useAsyncData(
	() => `workflow-detail-page:${workflowId.value}`,
	async () => {
		if (!Number.isInteger(workflowId.value) || workflowId.value <= 0) {
			throw createError({ statusCode: 400, statusMessage: 'Workflow id must be a positive integer.' });
		}

		return await useWorkflowMatrix(workflowId.value);
	},
	{
		watch: [workflowId],
	},
);

const workflow = computed(() => data.value?.workflow || null);

useSeoMeta({
	title: () => workflow.value?.title || 'Workflow Detail',
	description: () => workflow.value?.description || 'Workflow supervisor view',
});

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
			v-else-if="error"
			class="rounded-md border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20"
		>
			<p class="text-red-800 dark:text-red-200">Error loading workflow: {{ error.message }}</p>
		</div>

		<div v-else-if="workflow" class="space-y-6">
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

			<ModulesWorkflowModulePartialsWorkflowMatrixView
				v-if="activeTab === 'matrix'"
				:workflow-id="workflow.id"
			/>

			<NuxtErrorBoundary v-else-if="activeTab === 'diagram'">
				<ModulesWorkflowModuleWorkflowViewer :workflow-id="workflow.id" />

				<template #error="{ error: bpmnError }">
					<div class="rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-900/20">
						<p class="text-sm font-medium text-red-700 dark:text-red-300">Unable to load workflow diagram</p>
						<p class="mt-1 text-xs text-red-500 dark:text-red-400">{{ bpmnError?.message || 'Unknown error' }}</p>
					</div>
				</template>
			</NuxtErrorBoundary>

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
