<script setup lang="ts">
import type { FieldsSectionConfig } from '~/config/detail-sections';

const props = defineProps<{
	item: Record<string, any>;
	config: FieldsSectionConfig;
}>();

const visibleFields = computed(() => {
	if (!props.item) return [];
	return props.config.fields
		.filter((key) => props.item[key] !== undefined)
		.map((key) => ({ key, value: props.item[key] }));
});

const hasData = computed(() => visibleFields.value.length > 0);
</script>

<template>
	<UCard :ui="{ body: { padding: 'p-0 sm:p-0' } }">
		<template #header>
			<h3 class="text-base font-semibold text-gray-900 dark:text-white">{{ config.label }}</h3>
		</template>
		<div v-if="hasData" class="divide-y divide-gray-200 dark:divide-gray-700">
			<div v-for="field in visibleFields" :key="field.key" class="flex gap-4 px-4 py-2.5 sm:px-6">
				<dt class="w-40 flex-shrink-0 text-sm font-medium text-gray-500 dark:text-gray-400">
					{{ field.key }}
				</dt>
				<dd class="text-sm text-gray-900 dark:text-white">
					<RegistriesAutoLinkedValue :value="field.value" :field-key="field.key" />
				</dd>
			</div>
		</div>
		<p v-else class="px-4 py-4 text-sm text-gray-400 dark:text-gray-500 sm:px-6">Chưa có dữ liệu</p>
	</UCard>
</template>
