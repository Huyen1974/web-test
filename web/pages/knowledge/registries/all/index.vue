<script setup lang="ts">
import { readItems } from '@directus/sdk';

definePageMeta({
	title: 'Tổng nguyên tử',
});

useHead({
	title: 'Tổng nguyên tử — Tất cả thực thể',
});

const { $directus } = useNuxtApp();

// Collection config: registry_collection → { code_field, name_field, entity_type }
const COLLECTION_MAP: Record<string, { codeField: string; nameField: string; entityType: string }> = {
	meta_catalog: { codeField: 'code', nameField: 'name', entityType: 'catalog' },
	table_registry: { codeField: 'table_id', nameField: 'name', entityType: 'table' },
	modules: { codeField: 'code', nameField: 'name', entityType: 'module' },
	workflows: { codeField: 'process_code', nameField: 'title', entityType: 'workflow' },
	workflow_steps: { codeField: 'code', nameField: 'title', entityType: 'workflow_step' },
	workflow_change_requests: { codeField: 'code', nameField: 'title', entityType: 'wcr' },
	dot_tools: { codeField: 'code', nameField: 'name', entityType: 'dot_tool' },
	ui_pages: { codeField: 'code', nameField: 'name', entityType: 'page' },
	collection_registry: { codeField: 'code', nameField: 'name', entityType: 'collection' },
	tasks: { codeField: 'code', nameField: 'name', entityType: 'task' },
	agents: { codeField: 'code', nameField: 'name', entityType: 'agent' },
	checkpoint_types: { codeField: 'code', nameField: 'name', entityType: 'checkpoint_type' },
	checkpoint_sets: { codeField: 'code', nameField: 'name', entityType: 'checkpoint_set' },
	entity_dependencies: { codeField: 'code', nameField: 'source_code', entityType: 'entity_dependency' },
	table_proposals: { codeField: 'code', nameField: 'name', entityType: 'table_proposal' },
	checkpoint_instances: { codeField: 'code', nameField: 'name', entityType: 'checkpoint_instance' },
	system_issues: { codeField: 'code', nameField: 'title', entityType: 'system_issue' },
};

// Fetch meta_catalog for atom_group info
const { data: catalogEntries } = useAsyncData(
	'all-atoms-catalog',
	() =>
		$directus.request(
			readItems('meta_catalog' as any, {
				fields: ['entity_type', 'name', 'registry_collection', 'atom_group', 'status'],
				filter: { status: { _in: ['active', 'published'] } },
				limit: -1,
			}),
		),
	{ default: () => [] },
);

// Map entity_type -> display name + atom_group (from catalogEntries or allAtoms as fallback)
const entityMeta = computed(() => {
	const map: Record<string, { name: string; atomGroup: string }> = {};
	const entries = catalogEntries.value as any[];
	if (entries.length) {
		for (const e of entries) {
			map[e.entity_type] = { name: e.name || e.entity_type, atomGroup: e.atom_group || '' };
		}
	} else {
		// Derive from allAtoms when catalogEntries hasn't loaded yet
		for (const a of allAtoms.value || []) {
			if (!map[a.entityType]) map[a.entityType] = { name: a.entityType, atomGroup: a.atomGroup };
		}
	}
	return map;
});

// Atom group labels
const GROUP_LABELS: Record<string, string> = {
	'cấu_trúc': 'Cấu trúc',
	'quy_trình': 'Quy trình',
	'công_cụ': 'Công cụ',
	'dữ_liệu': 'Dữ liệu',
	'giám_sát': 'Giám sát',
};

// Fetch all atoms from all collections (fetches catalog inline to avoid SSR race)
const { data: allAtoms, status: loadStatus } = useAsyncData(
	'all-atoms-data',
	async () => {
		// Fetch catalog inline to avoid SSR race condition with separate useAsyncData
		const entries = (await $directus.request(
			readItems('meta_catalog' as any, {
				fields: ['entity_type', 'name', 'registry_collection', 'atom_group', 'status'],
				filter: { status: { _in: ['active', 'published'] } },
				limit: -1,
			}),
		)) as any[];
		if (!entries.length) return [];

		const results: Array<{ code: string; name: string; entityType: string; atomGroup: string }> = [];

		for (const entry of entries) {
			const col = entry.registry_collection;
			if (!col || col === '_uncategorized' || col === 'registry_changelog') continue;
			const config = COLLECTION_MAP[col];
			if (!config) continue;

			try {
				const items = await $directus.request(
					readItems(col as any, {
						fields: ['id', config.codeField, config.nameField],
						limit: -1,
					}),
				);
				for (const item of items as any[]) {
					results.push({
						code: item[config.codeField] || `#${item.id}`,
						name: item[config.nameField] || '',
						entityType: config.entityType,
						atomGroup: entry.atom_group || '',
					});
				}
			} catch {
				// Skip collections with permission errors
			}
		}
		return results;
	},
	{ default: () => [] },
);

// Filters
const filterType = ref('');
const filterGroup = ref('');
const searchQuery = ref('');

const filteredAtoms = computed(() => {
	let items = allAtoms.value || [];
	if (filterType.value) items = items.filter((i) => i.entityType === filterType.value);
	if (filterGroup.value) items = items.filter((i) => i.atomGroup === filterGroup.value);
	if (searchQuery.value) {
		const q = searchQuery.value.toLowerCase();
		items = items.filter((i) => i.code.toLowerCase().includes(q) || i.name.toLowerCase().includes(q));
	}
	return items;
});

// Options for filters
const typeOptions = computed(() => {
	const types = new Set((allAtoms.value || []).map((i) => i.entityType));
	return [{ label: 'Tất cả loại', value: '' }, ...Array.from(types).sort().map((t) => ({
		label: entityMeta.value[t]?.name || t,
		value: t,
	}))];
});

const groupOptions = computed(() => [
	{ label: 'Tất cả nhóm', value: '' },
	{ label: 'Cấu trúc', value: 'cấu_trúc' },
	{ label: 'Quy trình', value: 'quy_trình' },
	{ label: 'Công cụ', value: 'công_cụ' },
	{ label: 'Dữ liệu', value: 'dữ_liệu' },
	{ label: 'Giám sát', value: 'giám_sát' },
]);

// UTable columns
const columns = [
	{ key: 'code', label: 'Mã', sortable: true },
	{ key: 'name', label: 'Tên', sortable: true },
	{ key: 'typeName', label: 'Loại', sortable: true },
	{ key: 'groupName', label: 'Phân nhóm', sortable: true },
];

const rows = computed(() =>
	filteredAtoms.value.map((i) => ({
		code: i.code,
		name: i.name,
		entityType: i.entityType,
		typeName: entityMeta.value[i.entityType]?.name || i.entityType,
		groupName: GROUP_LABELS[i.atomGroup] || i.atomGroup || '—',
		atomGroup: i.atomGroup,
	})),
);
</script>

<template>
	<div class="container mx-auto px-4 py-8">
		<div class="mb-8">
			<NuxtLink
				to="/knowledge/registries"
				class="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
			>
				&larr; Danh mục hệ thống
			</NuxtLink>

			<div class="flex items-center gap-3">
				<h1 class="text-3xl font-bold text-gray-900 dark:text-white">Tổng nguyên tử</h1>
				<span
					v-if="allAtoms.length > 0"
					class="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300"
				>
					{{ filteredAtoms.length }}<template v-if="filteredAtoms.length !== allAtoms.length"> / {{ allAtoms.length }}</template> items
				</span>
			</div>
			<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
				Tất cả thực thể across {{ Object.keys(entityMeta).length }} loại
			</p>
		</div>

		<!-- Filters -->
		<div class="mb-4 flex flex-wrap items-center gap-3">
			<UInput v-model="searchQuery" placeholder="Tìm kiếm mã hoặc tên..." icon="i-heroicons-magnifying-glass" class="w-64" />
			<USelect v-model="filterType" :options="typeOptions" option-attribute="label" value-attribute="value" class="w-48" />
			<USelect v-model="filterGroup" :options="groupOptions" option-attribute="label" value-attribute="value" class="w-48" />
		</div>

		<div v-if="loadStatus === 'pending'" class="py-8 text-center text-gray-500 dark:text-gray-400">
			Đang tải dữ liệu từ tất cả collections...
		</div>

		<UTable
			v-else
			:rows="rows"
			:columns="columns"
		>
			<template #cell-code="{ row }">
				<NuxtLink
					:to="`/knowledge/registries/${row.entityType}/${row.code}`"
					class="font-mono text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-200"
					@click.stop
				>
					{{ row.code }}
				</NuxtLink>
			</template>
			<template #cell-groupName="{ row }">
				<UBadge
					v-if="row.atomGroup"
					:color="row.atomGroup === 'cấu_trúc' ? 'blue' : row.atomGroup === 'quy_trình' ? 'purple' : row.atomGroup === 'công_cụ' ? 'green' : row.atomGroup === 'dữ_liệu' ? 'orange' : 'gray'"
					variant="subtle"
					size="xs"
				>
					{{ row.groupName }}
				</UBadge>
				<span v-else class="text-gray-300 dark:text-gray-600">—</span>
			</template>
		</UTable>
	</div>
</template>
