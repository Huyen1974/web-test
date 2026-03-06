<script setup lang="ts">
import { readItem, readItems } from '@directus/sdk';

const route = useRoute();
const entityType = computed(() => route.params.entityType as string);
const itemId = computed(() => route.params.id as string);

// Map entity_type -> collection name
const collectionMap: Record<string, string> = {
	catalog: 'meta_catalog',
	table: 'table_registry',
	module: 'modules',
	workflow: 'workflows',
	workflow_step: 'workflow_steps',
	wcr: 'workflow_change_requests',
	dot_tool: 'dot_tools',
	page: 'ui_pages',
	collection: 'collection_registry',
	task: 'tasks',
	agent: 'agents',
};

const collection = computed(() => collectionMap[entityType.value] || '');

const { $directus } = useNuxtApp();

// Fetch the item
const { data: item, error } = useAsyncData(
	`registry-detail-${entityType.value}-${itemId.value}`,
	() => {
		if (!collection.value) return Promise.resolve(null);
		return $directus.request(readItem(collection.value as any, itemId.value, { fields: ['*'] }));
	},
);

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

// Fields to hide in detail view
const hiddenFields = new Set(['id', 'sort', 'user_created', 'user_updated', 'date_created', 'date_updated']);

const visibleFields = computed(() => {
	if (!item.value) return [];
	return Object.entries(item.value)
		.filter(([key]) => !hiddenFields.has(key))
		.map(([key, value]) => ({ key, value }));
});

definePageMeta({
	title: 'Chi tiết',
});

useHead({
	title: computed(() => {
		const name = item.value?.name || item.value?.code || itemId.value;
		return `${name} — ${catalogEntry.value?.name || entityType.value}`;
	}),
});

function formatValue(value: any): string {
	if (value === null || value === undefined) return '—';
	if (typeof value === 'boolean') return value ? 'Yes' : 'No';
	if (typeof value === 'object') return JSON.stringify(value, null, 2);
	return String(value);
}
</script>

<template>
	<div class="container mx-auto px-4 py-8">
		<div class="mb-8">
			<div class="mb-4 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
				<NuxtLink to="/knowledge/registries" class="hover:text-gray-700 dark:hover:text-gray-200">
					Danh mục
				</NuxtLink>
				<span>/</span>
				<NuxtLink
					:to="`/knowledge/registries/${entityType}`"
					class="hover:text-gray-700 dark:hover:text-gray-200"
				>
					{{ catalogEntry?.name || entityType }}
				</NuxtLink>
				<span>/</span>
				<span class="text-gray-900 dark:text-white">{{ item?.code || item?.name || itemId }}</span>
			</div>

			<h1 class="text-3xl font-bold text-gray-900 dark:text-white">
				{{ item?.name || item?.code || `Item #${itemId}` }}
			</h1>
			<p v-if="item?.code && item?.name" class="mt-1 text-sm text-gray-500 dark:text-gray-400">
				{{ item.code }}
			</p>
		</div>

		<div v-if="error" class="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
			Không tìm thấy item hoặc lỗi truy cập.
		</div>

		<div v-else-if="item" class="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
			<div class="divide-y divide-gray-200 dark:divide-gray-700">
				<div
					v-for="field in visibleFields"
					:key="field.key"
					class="flex gap-4 px-6 py-3"
				>
					<dt class="w-48 flex-shrink-0 text-sm font-medium text-gray-500 dark:text-gray-400">
						{{ field.key }}
					</dt>
					<dd class="text-sm text-gray-900 dark:text-white">
						<span
							v-if="field.key === 'status'"
							class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize"
							:class="{
								'bg-emerald-100 text-emerald-700': field.value === 'active' || field.value === 'published',
								'bg-amber-100 text-amber-700': field.value === 'planned' || field.value === 'draft',
								'bg-gray-100 text-gray-700': field.value === 'deprecated' || field.value === 'retired',
							}"
						>
							{{ field.value }}
						</span>
						<pre
							v-else-if="typeof field.value === 'object' && field.value !== null"
							class="max-w-lg overflow-auto rounded bg-gray-50 p-2 text-xs dark:bg-gray-900"
						>{{ formatValue(field.value) }}</pre>
						<template v-else>{{ formatValue(field.value) }}</template>
					</dd>
				</div>
			</div>
		</div>

		<div class="mt-6">
			<NuxtLink
				:to="`/knowledge/registries/${entityType}`"
				class="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-800 dark:text-primary-400"
			>
				&larr; Quay lại {{ catalogEntry?.name || entityType }}
			</NuxtLink>
		</div>
	</div>
</template>
