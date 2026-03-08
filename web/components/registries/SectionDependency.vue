<script setup lang="ts">
import { readItems } from '@directus/sdk';
import type { DependencySectionConfig } from '~/config/detail-sections';

const props = defineProps<{
	item: Record<string, any>;
	config: DependencySectionConfig;
	entityType: string;
}>();

const { $directus } = useNuxtApp();

const itemCode = computed(() => props.item?.code || props.item?.process_code || props.item?.table_id || '');

const { data: deps } = useAsyncData(
	`section-dep-${props.config.id}-${itemCode.value}`,
	async () => {
		if (!itemCode.value) return [];
		try {
			let filter: any;
			if (props.config.direction === 'forward') {
				filter = { source_code: { _eq: itemCode.value } };
			} else if (props.config.direction === 'reverse') {
				filter = { target_code: { _eq: itemCode.value } };
			} else {
				filter = {
					_or: [{ source_code: { _eq: itemCode.value } }, { target_code: { _eq: itemCode.value } }],
				};
			}
			return await $directus.request(
				readItems('entity_dependencies' as any, {
					filter,
					fields: ['id', 'code', 'source_type', 'source_code', 'target_type', 'target_code', 'relation_type', 'direction', 'confidence'],
					limit: 100,
					sort: ['relation_type'],
				}),
			);
		} catch {
			return [];
		}
	},
	{ default: () => [] },
);

const hasData = computed(() => deps.value && deps.value.length > 0);

function getOtherSide(dep: any): { type: string; code: string; relation: string } {
	const isSource = dep.source_code === itemCode.value;
	if (isSource) {
		return { type: dep.target_type, code: dep.target_code, relation: `→ ${dep.relation_type}` };
	}
	return { type: dep.source_type, code: dep.source_code, relation: `← ${dep.relation_type}` };
}

const columns = [
	{ key: 'relation', label: 'Quan he' },
	{ key: 'type', label: 'Loai' },
	{ key: 'code', label: 'Ma' },
];

const rows = computed(() => {
	if (!deps.value) return [];
	return deps.value.map((dep: any) => {
		const other = getOtherSide(dep);
		return {
			relation: other.relation,
			type: other.type,
			code: other.code,
			_entityType: other.type,
		};
	});
});
</script>

<template>
	<UCard v-if="hasData">
		<template #header>
			<div class="flex items-center gap-2">
				<h3 class="text-base font-semibold text-gray-900 dark:text-white">{{ config.label }}</h3>
				<UBadge color="gray" variant="subtle" size="xs">{{ deps?.length || 0 }}</UBadge>
			</div>
		</template>
		<UTable :columns="columns" :rows="rows" :ui="{ td: { padding: 'py-2 px-3' }, th: { padding: 'py-2 px-3' } }">
			<template #cell-code="{ row }">
				<NuxtLink
					:to="`/knowledge/registries/${row._entityType}/${row.code}`"
					class="font-medium text-primary-600 hover:text-primary-800 dark:text-primary-400 hover:underline"
				>
					{{ row.code }}
				</NuxtLink>
			</template>
		</UTable>
	</UCard>
</template>
