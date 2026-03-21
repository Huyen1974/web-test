<script setup lang="ts">
definePageMeta({
	title: 'Registry Health',
	description: 'So sánh nơi chứa vs nơi sinh — Đếm 2 nơi (§0-J)',
});

const { data: healthData, status } = useAsyncData(
	'registry-health-detail',
	() => $fetch<any>('/api/registry/health'),
	{ default: () => ({ collections: [], totals: { khop: 0, orphan: 0, phantom: 0, totalGap: 0 } }) },
);

const columns = [
	{ key: 'stt', label: 'STT' },
	{ key: 'collection_name', label: 'Collection' },
	{ key: 'noi_chua', label: 'Nơi chứa' },
	{ key: 'noi_sinh', label: 'Nơi sinh' },
	{ key: 'gap', label: 'Gap' },
	{ key: 'status', label: 'Trạng thái' },
];

const rows = computed(() =>
	(healthData.value?.collections || []).map((c: any, idx: number) => ({
		...c,
		stt: idx + 1,
	})),
);
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
			<div class="mb-2">
				<UBadge color="red" variant="solid" size="sm">HEALTH</UBadge>
			</div>
			<h1 class="text-2xl font-bold text-gray-900 dark:text-white">Registry Health — Đếm 2 nơi</h1>
			<p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
				So sánh nơi chứa (source collection) vs nơi sinh (birth_registry) per governed collection. Gap = 0 = tin cậy.
			</p>
		</div>

		<!-- Summary cards -->
		<div class="mb-6 flex flex-wrap gap-4">
			<div class="rounded-lg bg-green-50 px-4 py-3 dark:bg-green-900/20">
				<div class="text-2xl font-bold text-green-700 dark:text-green-400">{{ healthData.totals?.khop || 0 }}</div>
				<div class="text-xs text-green-600 dark:text-green-500">KHỚP</div>
			</div>
			<div class="rounded-lg bg-red-50 px-4 py-3 dark:bg-red-900/20">
				<div class="text-2xl font-bold text-red-700 dark:text-red-400">{{ healthData.totals?.orphan || 0 }}</div>
				<div class="text-xs text-red-600 dark:text-red-500">Orphan</div>
			</div>
			<div class="rounded-lg bg-amber-50 px-4 py-3 dark:bg-amber-900/20">
				<div class="text-2xl font-bold text-amber-700 dark:text-amber-400">{{ healthData.totals?.phantom || 0 }}</div>
				<div class="text-xs text-amber-600 dark:text-amber-500">Phantom</div>
			</div>
		</div>

		<div v-if="status === 'pending'" class="py-8 text-center text-gray-500">Đang tải...</div>

		<UTable v-else :columns="columns" :rows="rows">
			<template #cell-stt="{ row }">
				<span class="text-xs text-gray-400">{{ row.stt }}</span>
			</template>
			<template #cell-collection_name="{ row }">
				<span class="font-mono text-xs">{{ row.collection_name }}</span>
			</template>
			<template #cell-noi_chua="{ row }">
				<span class="font-medium">{{ row.noi_chua }}</span>
			</template>
			<template #cell-noi_sinh="{ row }">
				<span class="font-medium">{{ row.noi_sinh }}</span>
			</template>
			<template #cell-gap="{ row }">
				<span
					class="font-bold"
					:class="row.gap === 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'"
				>{{ row.gap }}</span>
			</template>
			<template #cell-status="{ row }">
				<UBadge
					:color="row.status === 'KHOP' ? 'green' : row.status === 'ORPHAN' ? 'red' : 'amber'"
					variant="subtle"
					size="xs"
				>{{ row.status }}</UBadge>
			</template>
		</UTable>
	</div>
</template>
