<script setup lang="ts">
import type { FieldConfig } from '~/composables/useDirectusTable';

definePageMeta({
	title: 'Quy trình',
	description: 'Danh sách quy trình cho quản lý viên',
});

const workflowFields: FieldConfig[] = [
	{ key: 'process_code', label: 'Mã QT', sortable: true },
	{ key: 'title', label: 'Tên', sortable: true },
	{ key: 'description', label: 'Mô tả', sortable: false, render: (v: string) => v ? (v.length > 80 ? `${v.slice(0, 80)}...` : v) : '—' },
	{ key: 'category_id.parent_id.parent_id.name', label: 'Cấp 1', sortable: false },
	{ key: 'category_id.parent_id.name', label: 'Cấp 2', sortable: false },
	{ key: 'category_id.name', label: 'Cấp 3', sortable: false },
	{
		key: 'status',
		label: 'Trạng thái',
		sortable: true,
		filterable: true,
		filterOptions: [
			{ label: 'Hoạt động', value: 'active' },
			{ label: 'Nháp', value: 'draft' },
			{ label: 'Lưu trữ', value: 'archived' },
		],
	},
];
</script>

<template>
	<div class="container mx-auto px-4 py-8">
		<div class="mb-8">
			<NuxtLink
				to="/knowledge"
				class="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
			>
				&larr; Trung tâm tri thức
			</NuxtLink>
			<h1 class="text-3xl font-bold text-gray-900 dark:text-white">Quy trình</h1>
			<p class="mt-2 text-gray-600 dark:text-gray-400">
				Danh sách quy trình được quản trị bằng DSL + đề xuất thay đổi.
			</p>
		</div>

		<SharedDirectusTable
			collection="workflows"
			:fields="workflowFields"
			:default-sort="['sort', 'title']"
			:page-size="25"
			:row-link="(item: any) => `/knowledge/workflows/${item.id}`"
		>
			<template #cell-status="{ value }">
				<span
					class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize"
					:class="{
						'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300': value === 'active',
						'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300': value === 'draft',
						'bg-gray-100 text-gray-700 dark:bg-gray-700/50 dark:text-gray-300': value === 'archived',
					}"
				>
					{{ value }}
				</span>
			</template>
		</SharedDirectusTable>
	</div>
</template>
