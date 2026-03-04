<script setup lang="ts">
import type { FieldConfig } from '~/composables/useDirectusTable';

definePageMeta({
	title: 'Workflows',
	description: 'Workflow registry for supervisors',
});

const workflowFields: FieldConfig[] = [
	{ key: 'process_code', label: 'Ma QT', sortable: true },
	{ key: 'title', label: 'Ten', sortable: true },
	{ key: 'description', label: 'Mo ta', sortable: false, render: (v: string) => v ? (v.length > 80 ? `${v.slice(0, 80)}...` : v) : '—' },
	{ key: 'category_id.parent_id.parent_id.name', label: 'Cap 1', sortable: false },
	{ key: 'category_id.parent_id.name', label: 'Cap 2', sortable: false },
	{ key: 'category_id.name', label: 'Cap 3', sortable: false },
	{
		key: 'status',
		label: 'Trang thai',
		sortable: true,
		filterable: true,
		filterOptions: [
			{ label: 'Active', value: 'active' },
			{ label: 'Draft', value: 'draft' },
			{ label: 'Archived', value: 'archived' },
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
				&larr; Knowledge Hub
			</NuxtLink>
			<h1 class="text-3xl font-bold text-gray-900 dark:text-white">Workflows</h1>
			<p class="mt-2 text-gray-600 dark:text-gray-400">
				Danh sach quy trinh duoc quan tri bang DSL + workflow change request.
			</p>
		</div>

		<SharedDirectusDataTable
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
		</SharedDirectusDataTable>
	</div>
</template>
