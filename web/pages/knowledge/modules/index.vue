<script setup lang="ts">
import type { FieldConfig } from '~/composables/useDirectusTable';
import type { TaskStatus } from '~/types/tasks';
import { TASK_STATUS_META } from '~/types/tasks';

definePageMeta({
	title: 'Modules',
	description: 'Module showcase and testing',
});

const moduleFields: FieldConfig[] = [
	{ key: 'name', label: 'Tên Module', sortable: true },
	{ key: 'description', label: 'Mô tả', sortable: false, render: (v: string) => v ? (v.length > 120 ? `${v.slice(0, 120)}...` : v) : '—' },
	{
		key: 'status',
		label: 'Trạng thái',
		sortable: true,
		filterable: true,
		filterOptions: [
			{ label: 'Active', value: 'active' },
			{ label: 'Draft', value: 'draft' },
			{ label: 'Completed', value: 'completed' },
		],
	},
	{ key: 'lead_ai', label: 'Lead', sortable: false },
];

function statusMeta(status: string) {
	return TASK_STATUS_META[status as TaskStatus] || { label: status, color: 'gray', icon: '' };
}
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
			<h1 class="text-3xl font-bold text-gray-900 dark:text-white">Modules</h1>
			<p class="mt-2 text-gray-600 dark:text-gray-400">
				Reusable components built for the AI collaboration platform. Click a module to test it live.
			</p>
		</div>

		<SharedDirectusTable
			collection="tasks"
			:fields="moduleFields"
			:filters="{ task_type: { _eq: 'module' } }"
			:default-sort="['sort', '-date_updated']"
			:page-size="25"
			:row-link="(item: any) => `/knowledge/modules/${item.id}`"
			:show-insert-marks="false"
			:show-column-marks="false"
		>
			<template #cell-status="{ value }">
				<UBadge
					:label="statusMeta(value).label"
					:color="statusMeta(value).color"
					variant="subtle"
					size="xs"
				/>
			</template>
		</SharedDirectusTable>
	</div>
</template>
