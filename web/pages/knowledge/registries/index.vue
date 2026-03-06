<script setup lang="ts">
definePageMeta({
	title: 'Danh mục hệ thống',
	description: 'Meta-Catalog — Danh mục sống 3 tầng',
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
			<h1 class="text-3xl font-bold text-gray-900 dark:text-white">Danh mục hệ thống</h1>
			<p class="mt-2 text-gray-600 dark:text-gray-400">
				Meta-Catalog — Danh mục sống 3 tầng. Mô hình A: Directus là SSOT. Mô hình B: tự động scan từ filesystem.
			</p>
		</div>

		<SharedDirectusTable
			table-id="tbl_meta_catalog"
			:row-link="(item: any) => item.ui_page || '/knowledge/registries'"
		>
			<template #cell-source_model="{ value }">
				<span
					class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium"
					:class="{
						'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300': value === 'A',
						'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300': value === 'B',
					}"
				>
					{{ value === 'A' ? 'A — Directus' : 'B — File scan' }}
				</span>
			</template>
			<template #cell-status="{ value }">
				<span
					class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize"
					:class="{
						'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300': value === 'active',
						'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300': value === 'planned',
						'bg-gray-100 text-gray-700 dark:bg-gray-700/50 dark:text-gray-300': value === 'deprecated',
					}"
				>
					{{ value }}
				</span>
			</template>
		</SharedDirectusTable>
	</div>
</template>
