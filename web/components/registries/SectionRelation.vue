<script setup lang="ts">
import { readItems } from '@directus/sdk';
import type { RelationSectionConfig } from '~/config/detail-sections';

const props = defineProps<{
	item: Record<string, any>;
	config: RelationSectionConfig;
}>();

const { $directus } = useNuxtApp();

const queryFields = computed(() => {
	const fields = new Set<string>(['id']);
	for (const f of props.config.displayFields) {
		fields.add(f);
	}
	if (props.config.linkCodeField) {
		fields.add(props.config.linkCodeField);
	}
	return Array.from(fields);
});

// For many-to-one (localKey set): filter related collection by id = item[localKey]
// For one-to-many (default): filter related collection by foreignKey = item.id
const filterValue = computed(() => {
	if (props.config.localKey) {
		return props.item?.[props.config.localKey];
	}
	return props.item?.id;
});

const { data: relatedItems } = useAsyncData(
	`section-relation-${props.config.id}-${filterValue.value}`,
	async () => {
		if (!filterValue.value) return [];
		try {
			const filterField = props.config.localKey ? 'id' : props.config.foreignKey;
			const options: any = {
				filter: { [filterField]: { _eq: filterValue.value } },
				fields: queryFields.value,
				limit: 100,
			};
			if (props.config.sort) {
				options.sort = [props.config.sort];
			}
			return await $directus.request(readItems(props.config.collection as any, options));
		} catch {
			return [];
		}
	},
	{ default: () => [] },
);

const hasData = computed(() => relatedItems.value && relatedItems.value.length > 0);

// Resolve nested field values (e.g., "checkpoint_set_id.code")
function resolveField(item: any, field: string): any {
	const parts = field.split('.');
	let val = item;
	for (const p of parts) {
		if (val == null) return null;
		val = val[p];
	}
	return val;
}

// Build UTable columns from displayFields
const columns = computed(() => {
	return props.config.displayFields.map((f) => {
		const label = f.includes('.') ? f.split('.').pop()! : f;
		return { key: f.replace(/\./g, '_'), label };
	});
});

// Transform rows for UTable (flatten nested fields)
const rows = computed(() => {
	if (!relatedItems.value) return [];
	return relatedItems.value.map((item: any) => {
		const row: Record<string, any> = { _raw: item };
		for (const f of props.config.displayFields) {
			row[f.replace(/\./g, '_')] = resolveField(item, f);
		}
		return row;
	});
});

function getItemLink(row: any): string | null {
	if (!props.config.linkEntityType || !props.config.linkCodeField) return null;
	const code = resolveField(row._raw, props.config.linkCodeField);
	if (!code) return null;
	return `/knowledge/registries/${props.config.linkEntityType}/${code}`;
}
</script>

<template>
	<UCard>
		<template #header>
			<div class="flex items-center gap-2">
				<h3 class="text-base font-semibold text-gray-900 dark:text-white">{{ config.label }}</h3>
				<UBadge v-if="hasData" color="gray" variant="subtle" size="xs">{{ relatedItems?.length || 0 }}</UBadge>
			</div>
		</template>
		<UTable v-if="hasData" :columns="columns" :rows="rows" :ui="{ td: { padding: 'py-2 px-3' }, th: { padding: 'py-2 px-3' } }">
			<template v-for="col in columns" :key="col.key" #[`cell-${col.key}`]="{ row }">
				<NuxtLink
					v-if="config.linkCodeField && col.key === config.linkCodeField.replace(/\./g, '_') && getItemLink(row)"
					:to="getItemLink(row)!"
					class="font-medium text-primary-600 hover:text-primary-800 dark:text-primary-400 hover:underline"
				>
					{{ row[col.key] ?? '—' }}
				</NuxtLink>
				<RegistriesAutoLinkedValue v-else :value="row[col.key]" :field-key="col.key" />
			</template>
		</UTable>
		<p v-else class="px-4 py-4 text-sm text-gray-400 dark:text-gray-500">Chưa có dữ liệu</p>
	</UCard>
</template>
