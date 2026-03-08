<script setup lang="ts">
import { readItem, readItems } from '@directus/sdk';
import { sectionConfig, collectionMap, getCodeField } from '~/config/detail-sections';
import type { SectionConfig } from '~/config/detail-sections';

const route = useRoute();
const entityType = computed(() => route.params.entityType as string);
const itemId = computed(() => route.params.id as string);

const collection = computed(() => collectionMap[entityType.value] || '');
const codeField = computed(() => getCodeField(entityType.value));

const { $directus } = useNuxtApp();

// Fetch the item — support both numeric ID and code-based lookup
const { data: item, error } = useAsyncData(`registry-detail-${entityType.value}-${itemId.value}`, async () => {
	if (!collection.value) return null;

	// If itemId contains letters/dashes, look up by code field
	const isCode = /[A-Za-z-]/.test(itemId.value);
	if (isCode) {
		const items = await $directus.request(
			readItems(collection.value as any, {
				filter: { [codeField.value]: { _eq: itemId.value } },
				fields: ['*'],
				limit: 1,
			}),
		);
		return (items as any[])?.[0] || null;
	}

	// Numeric ID — direct lookup
	return $directus.request(readItem(collection.value as any, itemId.value, { fields: ['*'] }));
});

// Fetch catalog entry for breadcrumb
const { data: catalogEntry } = useAsyncData(
	`catalog-detail-${entityType.value}`,
	() =>
		$directus.request(
			readItems('meta_catalog', {
				filter: { entity_type: { _eq: entityType.value } },
				fields: ['name', 'code'],
				limit: 1,
			}),
		),
	{ transform: (items: any[]) => items?.[0] || null },
);

// Get sections config for this entity type
const sections = computed<SectionConfig[]>(() => sectionConfig[entityType.value] || []);

// Fallback: if no section config, show all fields as key-value
const fallbackFields = computed(() => {
	if (sections.value.length > 0 || !item.value) return [];
	const hidden = new Set(['id', 'sort', 'user_created', 'user_updated']);
	return Object.entries(item.value)
		.filter(([key]) => !hidden.has(key))
		.map(([key, value]) => ({ key, value }));
});

definePageMeta({ title: 'Chi tiet' });

useHead({
	title: computed(() => {
		const name = item.value?.name || item.value?.code || itemId.value;
		return `${name} — ${catalogEntry.value?.name || entityType.value}`;
	}),
});
</script>

<template>
	<div class="container mx-auto px-4 py-8">
		<!-- Breadcrumb + Header -->
		<div class="mb-8">
			<div class="mb-4 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
				<NuxtLink to="/knowledge/registries" class="hover:text-gray-700 dark:hover:text-gray-200"> Danh muc </NuxtLink>
				<span>/</span>
				<NuxtLink :to="`/knowledge/registries/${entityType}`" class="hover:text-gray-700 dark:hover:text-gray-200">
					{{ catalogEntry?.name || entityType }}
				</NuxtLink>
				<span>/</span>
				<span class="text-gray-900 dark:text-white">{{ item?.code || item?.process_code || item?.name || itemId }}</span>
			</div>

			<h1 class="text-3xl font-bold text-gray-900 dark:text-white">
				{{ item?.name || item?.code || `Item #${itemId}` }}
			</h1>
			<p v-if="item?.code && item?.name" class="mt-1 text-sm text-gray-500 dark:text-gray-400">
				{{ item.code }}
			</p>
		</div>

		<!-- Error state -->
		<div v-if="error" class="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
			Khong tim thay item hoac loi truy cap.
		</div>

		<!-- Section-based rendering -->
		<div v-else-if="item && sections.length > 0" class="space-y-6">
			<template v-for="section in sections" :key="section.id">
				<RegistriesSectionFields v-if="section.type === 'fields'" :item="item" :config="section" />
				<RegistriesSectionRelation v-else-if="section.type === 'relation'" :item="item" :config="section" />
				<RegistriesSectionDependency v-else-if="section.type === 'dependency'" :item="item" :config="section" :entity-type="entityType" />
			</template>
		</div>

		<!-- Fallback: generic key-value (for entity types without section config) -->
		<div v-else-if="item" class="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
			<div class="divide-y divide-gray-200 dark:divide-gray-700">
				<div v-for="field in fallbackFields" :key="field.key" class="flex gap-4 px-6 py-3">
					<dt class="w-48 flex-shrink-0 text-sm font-medium text-gray-500 dark:text-gray-400">
						{{ field.key }}
					</dt>
					<dd class="text-sm text-gray-900 dark:text-white">
						<RegistriesAutoLinkedValue :value="field.value" :field-key="field.key" />
					</dd>
				</div>
			</div>
		</div>

		<!-- Back link -->
		<div class="mt-6">
			<NuxtLink
				:to="`/knowledge/registries/${entityType}`"
				class="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-800 dark:text-primary-400"
			>
				&larr; Quay lai {{ catalogEntry?.name || entityType }}
			</NuxtLink>
		</div>
	</div>
</template>
