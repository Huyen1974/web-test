<script setup lang="ts">
definePageMeta({
	title: 'Entity Matrix — DNA da chieu',
	description: 'Tong quan da chieu cho toan bo entity system',
});

useHead({
	title: 'Entity Matrix',
});

const LEVEL_CONFIG: Record<string, { label: string; color: string }> = {
	atom: { label: 'Atom', color: 'green' },
	molecule: { label: 'Molecule', color: 'blue' },
	compound: { label: 'Compound', color: 'purple' },
	material: { label: 'Material', color: 'orange' },
	product: { label: 'Product', color: 'amber' },
	building: { label: 'Building', color: 'indigo' },
	unclassified: { label: '?', color: 'gray' },
};

const SCORE_CONFIG: Record<number, { label: string; color: string }> = {
	4: { label: '4/4', color: 'green' },
	3: { label: '3/4', color: 'yellow' },
	2: { label: '2/4', color: 'orange' },
	1: { label: '1/4', color: 'red' },
	0: { label: '0/4', color: 'red' },
};

const { data: matrixData, status } = useAsyncData(
	'entity-matrix',
	() => $fetch('/api/registry/matrix'),
	{ default: () => ({ entities: [], summary: { total: 0, byScore: {}, byLevel: {} }, cachedAt: '' }) },
);

// Filters
const filterLevel = ref('');
const filterScore = ref('');
const searchQuery = ref('');

const filteredEntities = computed(() => {
	let items = matrixData.value?.entities || [];
	if (filterLevel.value) items = items.filter((i: any) => (i.compositionLevel || 'unclassified') === filterLevel.value);
	if (filterScore.value) items = items.filter((i: any) => String(i.completenessScore) === filterScore.value);
	if (searchQuery.value) {
		const q = searchQuery.value.toLowerCase();
		items = items.filter((i: any) => i.code.toLowerCase().includes(q) || (i.name && i.name.toLowerCase().includes(q)));
	}
	return items;
});

const levelOptions = computed(() => {
	const levels = matrixData.value?.summary?.byLevel || {};
	return [
		{ label: 'All layers', value: '' },
		...Object.entries(levels).map(([k, v]) => ({
			label: `${LEVEL_CONFIG[k]?.label || k} (${v})`,
			value: k,
		})),
	];
});

const scoreOptions = computed(() => {
	const scores = matrixData.value?.summary?.byScore || {};
	return [
		{ label: 'All scores', value: '' },
		...[4, 3, 2, 1, 0].filter((s) => scores[s]).map((s) => ({
			label: `${SCORE_CONFIG[s]?.label || s} (${scores[s]})`,
			value: String(s),
		})),
	];
});

// Collection entity_type mapping for row links
const COLLECTION_ENTITY_MAP: Record<string, string> = {
	meta_catalog: 'catalog',
	table_registry: 'table',
	modules: 'module',
	workflows: 'workflow',
	workflow_steps: 'workflow_step',
	workflow_change_requests: 'wcr',
	dot_tools: 'dot_tool',
	ui_pages: 'page',
	collection_registry: 'collection',
	tasks: 'task',
	agents: 'agent',
	checkpoint_types: 'checkpoint_type',
	checkpoint_sets: 'checkpoint_set',
	entity_dependencies: 'entity_dependency',
	table_proposals: 'table_proposal',
	checkpoint_instances: 'checkpoint_instance',
	system_issues: 'system_issue',
	taxonomy: 'taxonomy_label',
	trigger_registry: 'trigger',
};

const columns = [
	{ key: 'code', label: 'Code', sortable: true },
	{ key: 'name', label: 'Name', sortable: true },
	{ key: 'compositionLevel', label: 'Layer', sortable: true },
	{ key: 'edgesTotal', label: 'Edges', sortable: true },
	{ key: 'labelCount', label: 'Labels', sortable: true },
	{ key: 'facetsCovered', label: 'Facets', sortable: true },
	{ key: 'completenessScore', label: 'Score', sortable: true },
];

const rows = computed(() =>
	filteredEntities.value.map((e: any) => ({
		...e,
		entityType: COLLECTION_ENTITY_MAP[e.collection] || e.collection,
	})),
);

const summary = computed(() => matrixData.value?.summary || { total: 0, byScore: {}, byLevel: {} });

const pctPerfect = computed(() => {
	const total = summary.value.total;
	if (!total) return 0;
	return Math.round(((summary.value.byScore[4] || 0) / total) * 100);
});
</script>

<template>
	<div class="container mx-auto px-4 py-8">
		<div class="mb-8">
			<NuxtLink
				to="/knowledge/registries"
				class="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
			>
				&larr; Danh muc he thong
			</NuxtLink>
			<div class="mb-2">
				<UBadge color="primary" variant="solid" size="sm">LAYER 3</UBadge>
			</div>
			<h1 class="text-3xl font-bold text-gray-900 dark:text-white">Entity Matrix</h1>
			<p class="mt-2 text-gray-600 dark:text-gray-400">
				4 dimensions: Identity (name) + Composition (layer) + Connectivity (edges) + Classification (labels)
			</p>
		</div>

		<!-- Summary cards -->
		<div v-if="status !== 'pending'" class="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
			<div class="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
				<div class="text-2xl font-bold text-gray-900 dark:text-white">{{ summary.total }}</div>
				<div class="text-sm text-gray-500 dark:text-gray-400">Total Entities</div>
			</div>
			<div class="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
				<div class="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{{ pctPerfect }}%</div>
				<div class="text-sm text-gray-500 dark:text-gray-400">Complete (4/4)</div>
			</div>
			<div class="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
				<div class="text-2xl font-bold text-amber-600 dark:text-amber-400">{{ summary.byScore[3] || 0 }}</div>
				<div class="text-sm text-gray-500 dark:text-gray-400">Score 3/4</div>
			</div>
			<div class="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
				<div class="text-2xl font-bold text-red-600 dark:text-red-400">{{ (summary.byScore[2] || 0) + (summary.byScore[1] || 0) + (summary.byScore[0] || 0) }}</div>
				<div class="text-sm text-gray-500 dark:text-gray-400">Score &le;2/4</div>
			</div>
		</div>

		<!-- Distribution by layer -->
		<div v-if="status !== 'pending'" class="mb-6 flex flex-wrap gap-2">
			<template v-for="(count, level) in summary.byLevel" :key="level">
				<UBadge
					:color="(LEVEL_CONFIG[level as string]?.color as any) || 'gray'"
					variant="subtle"
					size="sm"
				>
					{{ LEVEL_CONFIG[level as string]?.label || level }}: {{ count }}
				</UBadge>
			</template>
		</div>

		<!-- Filters -->
		<div class="mb-4 flex flex-wrap items-center gap-3">
			<UInput v-model="searchQuery" placeholder="Search code or name..." icon="i-heroicons-magnifying-glass" class="w-64" />
			<USelect v-model="filterLevel" :options="levelOptions" option-attribute="label" value-attribute="value" class="w-48" />
			<USelect v-model="filterScore" :options="scoreOptions" option-attribute="label" value-attribute="value" class="w-48" />
			<span class="text-sm text-gray-400">{{ filteredEntities.length }} / {{ summary.total }}</span>
		</div>

		<div v-if="status === 'pending'" class="py-8 text-center text-gray-500 dark:text-gray-400">
			Loading entity matrix...
		</div>

		<UTable v-else :columns="columns" :rows="rows">
			<template #cell-code="{ row }">
				<NuxtLink
					:to="`/knowledge/registries/${row.entityType}/${row.code}`"
					class="font-mono text-xs text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-200"
					@click.stop
				>
					{{ row.code }}
				</NuxtLink>
			</template>
			<template #cell-name="{ row }">
				<span class="text-sm">{{ row.name || '—' }}</span>
			</template>
			<template #cell-compositionLevel="{ row }">
				<UBadge
					:color="(LEVEL_CONFIG[row.compositionLevel || 'unclassified']?.color as any) || 'gray'"
					variant="subtle"
					size="xs"
				>
					{{ LEVEL_CONFIG[row.compositionLevel || 'unclassified']?.label || '?' }}
				</UBadge>
			</template>
			<template #cell-edgesTotal="{ row }">
				<span v-if="row.edgesTotal > 0" class="text-sm">
					{{ row.edgesTotal }}
					<span class="text-xs text-gray-400">({{ row.edgesOut }}/{{ row.edgesIn }})</span>
				</span>
				<span v-else class="text-gray-300 dark:text-gray-600">0</span>
			</template>
			<template #cell-labelCount="{ row }">
				<span v-if="row.labelCount > 0" class="text-sm font-medium">{{ row.labelCount }}</span>
				<span v-else class="text-gray-300 dark:text-gray-600">0</span>
			</template>
			<template #cell-facetsCovered="{ row }">
				<span v-if="row.facetsCovered > 0" class="text-sm">{{ row.facetsCovered }}/6</span>
				<span v-else class="text-gray-300 dark:text-gray-600">0</span>
			</template>
			<template #cell-completenessScore="{ row }">
				<UBadge
					:color="(SCORE_CONFIG[row.completenessScore as number]?.color as any) || 'gray'"
					variant="subtle"
					size="sm"
				>
					{{ SCORE_CONFIG[row.completenessScore as number]?.label || row.completenessScore }}
				</UBadge>
			</template>
		</UTable>
	</div>
</template>
