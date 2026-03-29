<script setup lang="ts">
import { readItems } from '@directus/sdk';

definePageMeta({ title: 'Pivot — Thống kê theo Lớp' });
useHead({ title: 'Pivot — Thống kê theo Lớp' });

const { $directus } = useNuxtApp();

const { data: items, status } = useAsyncData('pivot-virtual-rows', () =>
	$directus.request(
		readItems('meta_catalog' as any, {
			filter: { identity_class: { _eq: 'virtual' }, code: { _starts_with: 'CAT-' }, name: { _starts_with: 'Tổng' } },
			fields: ['code', 'name', 'composition_level', 'record_count', 'species_count', 'orphan_count', 'display_order'],
			sort: ['display_order'],
			limit: 10,
		}),
	), { default: () => [] },
);

const columns = [
	{ key: 'name', label: 'Lớp' },
	{ key: 'composition_level', label: 'Phân loại' },
	{ key: 'record_count', label: 'Tổng cá thể' },
	{ key: 'species_count', label: 'Số loài' },
	{ key: 'orphan_count', label: 'Mồ côi' },
];
</script>

<template>
	<div class="container mx-auto px-4 py-8">
		<NuxtLink to="/knowledge" class="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">&larr; Knowledge Hub</NuxtLink>
		<h1 class="mb-6 text-2xl font-bold">Pivot — Thống kê theo Lớp cấu tạo</h1>
		<p class="mb-4 text-sm text-gray-500">Điều 0-B: 6 lớp cấu tạo + Điều 29: Species meta-layer. PG tính, Directus serve, đây chỉ hiện.</p>
		<UTable v-if="status !== 'pending'" :rows="(items as any[])" :columns="columns" />
		<div v-else class="py-8 text-center text-gray-400">Đang tải...</div>
	</div>
</template>
