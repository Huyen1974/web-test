<script setup lang="ts">
definePageMeta({
	title: 'Quy trình',
	description: 'Danh sách quy trình cho quản lý viên',
});
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
			table-id="tbl_workflow_list"
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
			<template #cell-description="{ value }">
				{{ value ? (value.length > 80 ? `${value.slice(0, 80)}...` : value) : '—' }}
			</template>
		</SharedDirectusTable>
	</div>
</template>
