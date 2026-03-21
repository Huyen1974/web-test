<script setup lang="ts">
definePageMeta({
	title: 'Collections không quản trị',
	description: 'Danh sách observed + excluded collections',
});

const { data: unmanagedData, status } = useAsyncData(
	'registry-unmanaged-detail',
	() => $fetch<any>('/api/registry/unmanaged'),
	{ default: () => ({ collections: [], totals: { observed: 0, excluded: 0, total: 0 } }) },
);

const columns = [
	{ key: 'stt', label: 'STT' },
	{ key: 'collection_name', label: 'Collection' },
	{ key: 'governance_role', label: 'Phân loại' },
];

const rows = computed(() =>
	(unmanagedData.value?.collections || []).map((c: any, idx: number) => ({
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
			<h1 class="text-2xl font-bold text-gray-900 dark:text-white">Collections không quản trị</h1>
			<p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
				{{ unmanagedData.totals?.observed || 0 }} observed + {{ unmanagedData.totals?.excluded || 0 }} excluded = {{ unmanagedData.totals?.total || 0 }} collections
			</p>
		</div>

		<div v-if="status === 'pending'" class="py-8 text-center text-gray-500">Đang tải...</div>

		<UTable v-else :columns="columns" :rows="rows">
			<template #cell-stt="{ row }">
				<span class="text-xs text-gray-400">{{ row.stt }}</span>
			</template>
			<template #cell-collection_name="{ row }">
				<span class="font-mono text-xs">{{ row.collection_name }}</span>
			</template>
			<template #cell-governance_role="{ row }">
				<UBadge
					:color="row.governance_role === 'observed' ? 'blue' : 'gray'"
					variant="subtle"
					size="xs"
				>{{ row.governance_role }}</UBadge>
			</template>
		</UTable>
	</div>
</template>
