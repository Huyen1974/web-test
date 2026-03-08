<script setup lang="ts">
import { readItems } from '@directus/sdk';
import type { RelationSectionConfig } from '~/config/detail-sections';

const props = defineProps<{
	item: Record<string, any>;
	config: RelationSectionConfig;
}>();

const { $directus } = useNuxtApp();

// Build the fields list from displayFields (need top-level + nested)
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

const { data: relatedItems } = useAsyncData(
	`section-relation-${props.config.id}-${props.item?.id}`,
	async () => {
		if (!props.item?.id) return [];
		try {
			const options: any = {
				filter: { [props.config.foreignKey]: { _eq: props.item.id } },
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

// Build table columns from displayFields
const columns = computed(() => {
	return props.config.displayFields.map((f) => {
		const label = f.includes('.') ? f.split('.').pop()! : f;
		return { key: f, label };
	});
});

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

// Build link URL for a related item
function getItemLink(relItem: any): string | null {
	if (!props.config.linkEntityType || !props.config.linkCodeField) return null;
	const code = resolveField(relItem, props.config.linkCodeField);
	if (!code) return null;
	return `/knowledge/registries/${props.config.linkEntityType}/${code}`;
}
</script>

<template>
	<UCard v-if="hasData" :ui="{ body: { padding: 'p-0 sm:p-0' } }">
		<template #header>
			<div class="flex items-center gap-2">
				<h3 class="text-base font-semibold text-gray-900 dark:text-white">{{ config.label }}</h3>
				<UBadge color="gray" variant="subtle" size="xs">{{ relatedItems?.length || 0 }}</UBadge>
			</div>
		</template>
		<div class="overflow-x-auto">
			<table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
				<thead class="bg-gray-50 dark:bg-gray-800/50">
					<tr>
						<th v-for="col in columns" :key="col.key" class="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
							{{ col.label }}
						</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-200 dark:divide-gray-700">
					<tr v-for="(relItem, idx) in relatedItems" :key="idx" class="hover:bg-gray-50 dark:hover:bg-gray-800/30">
						<td v-for="col in columns" :key="col.key" class="px-4 py-2 text-sm text-gray-900 dark:text-white">
							<NuxtLink
								v-if="col.key === config.linkCodeField && getItemLink(relItem)"
								:to="getItemLink(relItem)!"
								class="font-medium text-primary-600 hover:text-primary-800 dark:text-primary-400 hover:underline"
							>
								{{ resolveField(relItem, col.key) ?? '—' }}
							</NuxtLink>
							<RegistriesAutoLinkedValue v-else :value="resolveField(relItem, col.key)" :field-key="col.key" />
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	</UCard>
</template>
