<script setup lang="ts">
import { readItems } from '@directus/sdk';
import type { DependencySectionConfig } from '~/config/detail-sections';
import { prefixMap } from '~/config/detail-sections';

const props = defineProps<{
	item: Record<string, any>;
	config: DependencySectionConfig;
	entityType: string;
}>();

const { $directus } = useNuxtApp();

// Get the code for this item (could be code, process_code, etc.)
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
				// both
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

function getEntityLink(type: string, code: string): string | null {
	// Try to find entity type from the type field
	if (!type || !code) return null;
	// type is already in entity_type format (e.g., "checkpoint_type", "workflow_step")
	return `/knowledge/registries/${type}/${code}`;
}

function getOtherSide(dep: any): { type: string; code: string; relation: string } {
	const isSource = dep.source_code === itemCode.value;
	if (isSource) {
		return { type: dep.target_type, code: dep.target_code, relation: `→ ${dep.relation_type}` };
	}
	return { type: dep.source_type, code: dep.source_code, relation: `← ${dep.relation_type}` };
}
</script>

<template>
	<UCard v-if="hasData" :ui="{ body: { padding: 'p-0 sm:p-0' } }">
		<template #header>
			<div class="flex items-center gap-2">
				<h3 class="text-base font-semibold text-gray-900 dark:text-white">{{ config.label }}</h3>
				<UBadge color="gray" variant="subtle" size="xs">{{ deps?.length || 0 }}</UBadge>
			</div>
		</template>
		<div class="overflow-x-auto">
			<table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
				<thead class="bg-gray-50 dark:bg-gray-800/50">
					<tr>
						<th class="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Quan he</th>
						<th class="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Loai</th>
						<th class="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Ma</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-200 dark:divide-gray-700">
					<tr v-for="dep in deps" :key="dep.id" class="hover:bg-gray-50 dark:hover:bg-gray-800/30">
						<td class="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">
							{{ getOtherSide(dep).relation }}
						</td>
						<td class="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">
							{{ getOtherSide(dep).type }}
						</td>
						<td class="px-4 py-2 text-sm">
							<NuxtLink
								v-if="getEntityLink(getOtherSide(dep).type, getOtherSide(dep).code)"
								:to="getEntityLink(getOtherSide(dep).type, getOtherSide(dep).code)!"
								class="font-medium text-primary-600 hover:text-primary-800 dark:text-primary-400 hover:underline"
							>
								{{ getOtherSide(dep).code }}
							</NuxtLink>
							<span v-else class="text-gray-900 dark:text-white">{{ getOtherSide(dep).code }}</span>
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	</UCard>
</template>
