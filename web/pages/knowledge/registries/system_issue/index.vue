<script setup lang="ts">
definePageMeta({
	title: 'Vấn đề Hệ thống',
	description: 'Phân loại vấn đề hệ thống — Điều 31 System Issues',
});

const { data: groupData, status } = useAsyncData(
	'system-issues-groups',
	() => $fetch<any>('/api/registry/system-issues-groups'),
	{ default: () => ({ groups: [], totals: { all: 0, critical: 0, warning: 0, info: 0, group_count: 0 } }) },
);

const columns = [
	{ key: 'stt', label: 'STT' },
	{ key: 'label', label: 'Nhóm vấn đề' },
	{ key: 'count', label: 'Số lượng' },
	{ key: 'severity_max', label: 'Nghiêm trọng' },
	{ key: 'status', label: 'Trạng thái' },
];

const rows = computed(() =>
	(groupData.value?.groups || []).map((g: any, idx: number) => ({
		...g,
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
				<UBadge color="red" variant="solid" size="sm">LAYER 2</UBadge>
			</div>
			<h1 class="text-2xl font-bold text-gray-900 dark:text-white">Vấn đề Hệ thống — Phân loại</h1>
			<p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
				Gom nhóm theo loại vấn đề (issue_type × issue_class). Tổng: {{ groupData.totals?.all || 0 }} issues trong {{ groupData.totals?.group_count || 0 }} nhóm.
			</p>
		</div>

		<!-- Summary cards -->
		<div class="mb-6 flex flex-wrap gap-4">
			<div class="rounded-lg bg-gray-50 px-4 py-3 dark:bg-gray-800">
				<div class="text-2xl font-bold text-gray-700 dark:text-gray-300">{{ groupData.totals?.all || 0 }}</div>
				<div class="text-xs text-gray-500">Tổng issues</div>
			</div>
			<div class="rounded-lg bg-red-50 px-4 py-3 dark:bg-red-900/20">
				<div class="text-2xl font-bold text-red-700 dark:text-red-400">{{ groupData.totals?.critical || 0 }}</div>
				<div class="text-xs text-red-600 dark:text-red-500">CRITICAL</div>
			</div>
			<div class="rounded-lg bg-amber-50 px-4 py-3 dark:bg-amber-900/20">
				<div class="text-2xl font-bold text-amber-700 dark:text-amber-400">{{ groupData.totals?.warning || 0 }}</div>
				<div class="text-xs text-amber-600 dark:text-amber-500">WARNING</div>
			</div>
			<div class="rounded-lg bg-blue-50 px-4 py-3 dark:bg-blue-900/20">
				<div class="text-2xl font-bold text-blue-700 dark:text-blue-400">{{ groupData.totals?.group_count || 0 }}</div>
				<div class="text-xs text-blue-600 dark:text-blue-500">Nhóm</div>
			</div>
		</div>

		<div v-if="status === 'pending'" class="py-8 text-center text-gray-500">Đang tải...</div>

		<div v-else>
			<UTable :columns="columns" :rows="rows">
				<template #stt-data="{ row }">
					<span class="text-xs text-gray-400">{{ row.stt }}</span>
				</template>
				<template #label-data="{ row }">
					<span class="font-medium text-gray-900 dark:text-white">{{ row.label }}</span>
					<div v-if="row.top_issues?.length" class="mt-1">
						<div v-for="issue in row.top_issues" :key="issue.id" class="text-xs text-gray-400 truncate max-w-xs">
							#{{ issue.id }} {{ issue.title }}
						</div>
					</div>
				</template>
				<template #count-data="{ row }">
					<span class="font-bold text-gray-900 dark:text-white">{{ row.count }}</span>
				</template>
				<template #severity_max-data="{ row }">
					<UBadge
						:color="row.severity_max === 'critical' ? 'red' : row.severity_max === 'warning' ? 'amber' : 'gray'"
						variant="subtle"
						size="xs"
					>{{ row.severity_max?.toUpperCase() }}</UBadge>
				</template>
				<template #status-data="{ row }">
					<UBadge
						:color="row.severity_max === 'critical' ? 'red' : row.severity_max === 'warning' ? 'amber' : 'green'"
						:variant="row.severity_max === 'info' ? 'solid' : 'subtle'"
						size="xs"
					>{{ row.count === 0 ? 'OK' : 'Open' }}</UBadge>
				</template>
			</UTable>
		</div>
	</div>
</template>
