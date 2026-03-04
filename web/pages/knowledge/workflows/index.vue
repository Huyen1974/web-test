<script setup lang="ts">
definePageMeta({
	title: 'Workflows',
	description: 'Workflow registry for supervisors',
});

const route = useRoute();
const router = useRouter();

const page = computed(() => {
	const value = Number(route.query.page || 1);
	return Number.isFinite(value) && value > 0 ? value : 1;
});

const searchQuery = computed(() => (typeof route.query.q === 'string' ? route.query.q : ''));
const filterStatus = computed(() => (typeof route.query.status === 'string' ? route.query.status : ''));
const filterLevel = computed(() => {
	const value = typeof route.query.level === 'string' ? Number(route.query.level) : null;
	return Number.isFinite(value) && value ? value : null;
});

function updateQuery(next: Record<string, string | number | null | undefined>) {
	const query = {
		...route.query,
		...Object.fromEntries(Object.entries(next).filter(([, value]) => value !== undefined)),
	} as Record<string, any>;

	for (const key of Object.keys(query)) {
		if (query[key] === '' || query[key] === null || query[key] === undefined) {
			delete query[key];
		}
	}

	router.replace({ query });
}

function handleWorkflowSelected(id: number) {
	router.push(`/knowledge/workflows/${id}`);
}

function handlePageChange(nextPage: number) {
	updateQuery({ page: nextPage });
}

function handleSearchChange(value: string) {
	updateQuery({ q: value, page: 1 });
}

function handleStatusChange(value: string) {
	updateQuery({ status: value, page: 1 });
}

function handleLevelChange(value: number | '' | null) {
	updateQuery({ level: value || null, page: 1 });
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
			<h1 class="text-3xl font-bold text-gray-900 dark:text-white">Workflows</h1>
			<p class="mt-2 text-gray-600 dark:text-gray-400">
				Danh sach quy trinh duoc quan tri bang DSL + workflow change request.
			</p>
		</div>

		<ModulesWorkflowModulePartialsProcessRegistryView
			:page="page"
			:page-size="25"
			:search-query="searchQuery"
			:filter-status="filterStatus"
			:filter-level="filterLevel"
			@workflow-selected="handleWorkflowSelected"
			@page-change="handlePageChange"
			@update:search-query="handleSearchChange"
			@update:filter-status="handleStatusChange"
			@update:filter-level="handleLevelChange"
		/>
	</div>
</template>
