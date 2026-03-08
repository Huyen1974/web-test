<script setup lang="ts">
import { getCodeLinkUrl, splitTextWithLinks } from '~/utils/auto-link';

const props = defineProps<{
	value: any;
	fieldKey?: string;
}>();

const isStatus = computed(() => props.fieldKey === 'status');
const isBoolean = computed(() => typeof props.value === 'boolean');
const isObject = computed(() => typeof props.value === 'object' && props.value !== null);
const isNull = computed(() => props.value === null || props.value === undefined);

const directLink = computed(() => {
	if (typeof props.value !== 'string') return null;
	return getCodeLinkUrl(props.value);
});

const textSegments = computed(() => {
	if (typeof props.value !== 'string' || directLink.value) return [];
	return splitTextWithLinks(String(props.value));
});

const hasLinks = computed(() => textSegments.value.some((s) => s.type === 'link'));

function statusClass(val: string) {
	if (val === 'active' || val === 'published') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300';
	if (val === 'planned' || val === 'draft') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
	return 'bg-gray-100 text-gray-700 dark:bg-gray-700/50 dark:text-gray-300';
}
</script>

<template>
	<span v-if="isNull" class="text-gray-400">—</span>
	<span v-else-if="isStatus" class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize" :class="statusClass(String(value))">
		{{ value }}
	</span>
	<span v-else-if="isBoolean" :class="value ? 'text-emerald-600' : 'text-gray-400'">
		{{ value ? 'Yes' : 'No' }}
	</span>
	<pre v-else-if="isObject" class="max-w-lg overflow-auto rounded bg-gray-50 p-2 text-xs dark:bg-gray-900">{{ JSON.stringify(value, null, 2) }}</pre>
	<NuxtLink v-else-if="directLink" :to="directLink" class="font-medium text-primary-600 hover:text-primary-800 dark:text-primary-400 hover:underline">
		{{ value }}
	</NuxtLink>
	<template v-else-if="hasLinks">
		<template v-for="(seg, i) in textSegments" :key="i">
			<NuxtLink v-if="seg.type === 'link'" :to="seg.url" class="font-medium text-primary-600 hover:text-primary-800 dark:text-primary-400 hover:underline">
				{{ seg.value }}
			</NuxtLink>
			<template v-else>{{ seg.value }}</template>
		</template>
	</template>
	<template v-else>{{ value }}</template>
</template>
