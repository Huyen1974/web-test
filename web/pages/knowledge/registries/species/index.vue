<script setup lang="ts">
import type { MatrixConfig } from '~/components/shared/DirectusMatrix.vue';

definePageMeta({
	title: 'Ma trận Loài',
	description: 'Species Matrix — tất cả loài × metrics từ Birth Registry',
});

const speciesMatrixConfig: MatrixConfig = {
	title: 'Ma trận Loài (Species Matrix)',
	description: 'Phân loại loài — data từ birth_registry + entity_species. Thêm loài mới = row tự xuất hiện.',
	dataUrl: '/api/registry/species-matrix',
	dataKey: 'data',
	columns: [
		{ key: 'species_code', label: 'Mã loài', type: 'text' },
		{ key: 'display_name', label: 'Tên loài', type: 'text' },
		{ key: 'composition_level', label: 'Lớp', type: 'badge', badgeColor: 'gray' },
		{ key: 'total', label: 'Tổng', type: 'number' },
		{ key: 'certified', label: 'Certified', type: 'number' },
		{ key: 'uncertified', label: 'Chưa', type: 'number' },
	],
	rowKey: 'species_code',
	rowLabel: 'display_name',
	features: {
		sortable: true,
		searchable: true,
		totalsRow: true,
	},
};
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
				<UBadge color="pink" variant="solid" size="sm">SPECIES</UBadge>
			</div>
		</div>

		<SharedDirectusMatrix :config="speciesMatrixConfig" />
	</div>
</template>
