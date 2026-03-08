<script setup lang="ts">
import { readItems } from '@directus/sdk';

const route = useRoute();
const entityType = computed(() => route.params.entityType as string);

// Map entity_type -> table_id for DirectusTable
const tableIdMap: Record<string, string> = {
	catalog: 'tbl_meta_catalog',
	table: 'tbl_proposals_list',
	module: 'tbl_registry_modules',
	workflow: 'tbl_workflow_list',
	workflow_step: 'tbl_workflow_steps',
	wcr: 'tbl_wcr_list',
	dot_tool: 'tbl_registry_dot_tools',
	page: 'tbl_registry_ui_pages',
	collection: 'tbl_registry_collections',
	task: 'tbl_tasks_list',
	agent: 'tbl_registry_agents',
	checkpoint_type: 'tbl_registry_checkpoint_types',
	checkpoint_set: 'tbl_registry_checkpoint_sets',
	entity_dependency: 'tbl_registry_entity_dependencies',
};

const tableId = computed(() => tableIdMap[entityType.value] || '');

// Fetch catalog entry for this entity type
const { $directus } = useNuxtApp();
const { data: catalogEntry } = useAsyncData(
	`catalog-${entityType.value}`,
	() =>
		$directus.request(
			readItems('meta_catalog', {
				filter: { entity_type: { _eq: entityType.value } },
				fields: ['id', 'code', 'name', 'entity_type', 'registry_collection', 'record_count', 'source_model', 'status'],
				limit: 1,
			}),
		),
	{ transform: (items: any[]) => items?.[0] || null },
);

definePageMeta({
	title: 'Registry',
});

useHead({
	title: computed(() => catalogEntry.value?.name || 'Registry'),
});
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
				<h1 class="text-3xl font-bold text-gray-900 dark:text-white">
					{{ catalogEntry?.name || entityType }}
				</h1>
				<span
					v-if="catalogEntry?.status"
					class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize"
					:class="{
						'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300': catalogEntry.status === 'active',
						'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300': catalogEntry.status === 'planned',
					}"
				>
					{{ catalogEntry.status }}
				</span>
				<span
					v-if="catalogEntry?.record_count != null"
					class="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300"
				>
					{{ catalogEntry.record_count }} items
				</span>
			</div>

			<p v-if="catalogEntry?.code" class="mt-1 text-sm text-gray-500 dark:text-gray-400">
				{{ catalogEntry.code }}
				<template v-if="catalogEntry?.source_model">
					&middot;
					{{ catalogEntry.source_model === 'A' ? 'Model A — Directus SSOT' : 'Model B — File scan' }}
				</template>
			</p>
		</div>

		<SharedDirectusTable
			v-if="tableId"
			:table-id="tableId"
			:row-link="(item: any) => `/knowledge/registries/${entityType}/${item.id}`"
		>
			<template #cell-status="{ value }">
				<span
					class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize"
					:class="{
						'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300': value === 'active' || value === 'published',
						'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300': value === 'planned' || value === 'draft',
						'bg-gray-100 text-gray-700 dark:bg-gray-700/50 dark:text-gray-300': value === 'deprecated' || value === 'retired',
					}"
				>
					{{ value }}
				</span>
			</template>
			<template #cell-has_note="{ value }">
				<span :class="value ? 'text-emerald-600' : 'text-red-500'">
					{{ value ? 'Yes' : 'No' }}
				</span>
			</template>
		</SharedDirectusTable>

		<div
			v-else
			class="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300"
		>
			Chưa có bảng registry cho loại "{{ entityType }}". Vui lòng liên hệ admin.
		</div>
	</div>
</template>
