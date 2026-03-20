<script setup lang="ts">
import { readItems } from '@directus/sdk';

definePageMeta({
	title: 'Laws & Governance',
	description: 'Cong thong tin Luat & SSOT',
});

useHead({
	title: 'Laws & Governance',
});

const { $directus } = useNuxtApp();

const showAll = ref(false);

const { data: docs, status } = useAsyncData(
	'governance-docs',
	() =>
		$directus.request(
			readItems('governance_docs' as any, {
				fields: ['id', 'sort', 'name', 'category', 'url_path', 'visible', 'date_updated'],
				filter: { status: { _eq: 'published' } },
				sort: ['category', 'sort'],
				limit: -1,
			}),
		),
	{ default: () => [] },
);

const constitutions = computed(() => {
	const items = (docs.value as any[]).filter((d: any) => d.category === 'constitution');
	return showAll.value ? items : items.filter((d: any) => d.visible);
});

const laws = computed(() => {
	const items = (docs.value as any[]).filter((d: any) => d.category === 'law');
	return showAll.value ? items : items.filter((d: any) => d.visible);
});

const ssotTables = computed(() => {
	const items = (docs.value as any[]).filter((d: any) => d.category === 'ssot_table');
	return showAll.value ? items : items.filter((d: any) => d.visible);
});

function formatDate(ts: string | null) {
	if (!ts) return '';
	const d = new Date(ts);
	const dd = String(d.getDate()).padStart(2, '0');
	const mm = String(d.getMonth() + 1).padStart(2, '0');
	const yy = String(d.getFullYear()).slice(2);
	return `${dd}/${mm}/${yy}`;
}

function isExternal(url: string) {
	return url.startsWith('http://') || url.startsWith('https://');
}

const lawColumns = [
	{ key: 'sort', label: '#' },
	{ key: 'name', label: 'Name' },
	{ key: 'date_updated', label: 'Updated' },
];

const ssotColumns = [
	{ key: 'sort', label: '#' },
	{ key: 'name', label: 'Name' },
	{ key: 'date_updated', label: 'Updated' },
];
</script>

<template>
	<div class="container mx-auto px-4 py-8">
		<div class="mb-8">
			<NuxtLink
				to="/knowledge"
				class="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
			>
				&larr; Knowledge Hub
			</NuxtLink>
			<div class="mb-2 flex items-center justify-between">
				<UBadge color="primary" variant="solid" size="sm">GOVERNANCE</UBadge>
				<button
					class="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
					@click="showAll = !showAll"
				>
					{{ showAll ? 'Only active' : 'Show all' }}
				</button>
			</div>
			<h1 class="text-3xl font-bold text-gray-900 dark:text-white">Laws & Governance</h1>
			<p class="mt-2 text-gray-600 dark:text-gray-400">
				Central portal for all governance documents, laws, and SSOT tables.
			</p>
		</div>

		<div v-if="status === 'pending'" class="py-8 text-center text-gray-500 dark:text-gray-400">
			Loading...
		</div>

		<template v-else>
			<!-- Section 1: Constitutions -->
			<div class="mb-10">
				<h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-white">Constitutions</h2>
				<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
					<div
						v-for="doc in constitutions"
						:key="doc.id"
						class="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
						:class="{ 'opacity-40 italic': !doc.visible }"
					>
						<a
							v-if="doc.url_path && isExternal(doc.url_path)"
							:href="doc.url_path"
							target="_blank"
							rel="noopener"
							class="font-medium text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-200"
						>{{ doc.name }}</a>
						<NuxtLink
							v-else-if="doc.url_path"
							:to="doc.url_path"
							class="font-medium text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-200"
						>{{ doc.name }}</NuxtLink>
						<span v-else class="font-medium text-gray-900 dark:text-white">{{ doc.name }}</span>
						<div v-if="doc.date_updated" class="mt-1 text-xs text-gray-400">{{ formatDate(doc.date_updated) }}</div>
					</div>
				</div>
			</div>

			<!-- Section 2: Laws -->
			<div class="mb-10">
				<h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-white">Laws</h2>
				<UTable :columns="lawColumns" :rows="laws">
					<template #cell-sort="{ row }">
						<span class="text-xs text-gray-400">{{ row.sort }}</span>
					</template>
					<template #cell-name="{ row }">
						<a
							v-if="row.url_path && isExternal(row.url_path)"
							:href="row.url_path"
							target="_blank"
							rel="noopener"
							class="text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-200"
							:class="{ 'opacity-40 italic': !row.visible }"
						>{{ row.name }}</a>
						<NuxtLink
							v-else-if="row.url_path"
							:to="row.url_path"
							class="text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-200"
							:class="{ 'opacity-40 italic': !row.visible }"
						>{{ row.name }}</NuxtLink>
						<span v-else :class="{ 'opacity-40 italic': !row.visible }">{{ row.name }}</span>
						<UBadge v-if="!row.visible" color="gray" variant="subtle" size="xs" class="ml-2">draft</UBadge>
					</template>
					<template #cell-date_updated="{ row }">
						<span class="text-xs text-gray-400">{{ formatDate(row.date_updated) }}</span>
					</template>
				</UTable>
			</div>

			<!-- Section 3: SSOT Tables -->
			<div class="mb-10">
				<h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-white">SSOT Tables</h2>
				<UTable :columns="ssotColumns" :rows="ssotTables">
					<template #cell-sort="{ row }">
						<span class="text-xs text-gray-400">{{ row.sort }}</span>
					</template>
					<template #cell-name="{ row }">
						<a
							v-if="row.url_path && isExternal(row.url_path)"
							:href="row.url_path"
							target="_blank"
							rel="noopener"
							class="text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-200"
							:class="{ 'opacity-40 italic': !row.visible }"
						>{{ row.name }}</a>
						<NuxtLink
							v-else-if="row.url_path"
							:to="row.url_path"
							class="text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-200"
							:class="{ 'opacity-40 italic': !row.visible }"
						>{{ row.name }}</NuxtLink>
						<span v-else :class="{ 'opacity-40 italic': !row.visible }">{{ row.name }}</span>
					</template>
					<template #cell-date_updated="{ row }">
						<span class="text-xs text-gray-400">{{ formatDate(row.date_updated) }}</span>
					</template>
				</UTable>
			</div>
		</template>
	</div>
</template>
