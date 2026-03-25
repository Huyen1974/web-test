<script setup lang="ts">
const route = useRoute();
const issueClass = String(route.params.issue_class || '');
const subClass = String(route.params.sub_class || '');

definePageMeta({
	title: 'Vấn đề Hệ thống — Layer 4',
});

const CLASS_LABELS: Record<string, string> = {
	render_fault: 'Lỗi hiển thị',
	data_fault: 'Lỗi dữ liệu',
	sync_fault: 'Lỗi đồng bộ',
	contract_fault: 'Lỗi hợp đồng',
	watchdog_fault: 'Watchdog',
};

const { data, status } = useAsyncData(
	`system-issues-detail-${subClass}`,
	() => $fetch<any>('/api/registry/system-issues-detail', { params: { sub_class: subClass } }),
	{ default: () => ({ sub_class: subClass, issues: [], total: 0 }) },
);

const columns = [
	{ key: 'stt', label: '#' },
	{ key: 'entity_code', label: 'Entity' },
	{ key: 'title', label: 'Vấn đề' },
	{ key: 'severity', label: 'Mức độ' },
	{ key: 'status', label: 'Trạng thái' },
	{ key: 'occurrence_count', label: 'Lần' },
];

const rows = computed(() =>
	(data.value?.issues || []).map((issue: any, idx: number) => ({
		...issue,
		stt: idx + 1,
	})),
);
</script>

<template>
	<div class="container mx-auto px-4 py-8">
		<div class="mb-8">
			<NuxtLink
				:to="`/knowledge/registries/system_issue/${issueClass}`"
				class="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
			>
				&larr; {{ CLASS_LABELS[issueClass] || issueClass }}
			</NuxtLink>
			<div class="mb-2">
				<UBadge color="violet" variant="solid" size="sm">LAYER 4</UBadge>
			</div>
			<h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ subClass.replace(/_/g, ' ') }}</h1>
			<p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
				{{ data.total }} issues — Điều 31 §IV.6-C Layer 4 chi tiết
			</p>
		</div>

		<div v-if="status === 'pending'" class="py-8 text-center text-gray-500">Đang tải...</div>
		<div v-else>
			<UTable :columns="columns" :rows="rows">
				<template #stt-data="{ row }">
					<span class="text-xs text-gray-400">{{ row.stt }}</span>
				</template>
				<template #entity_code-data="{ row }">
					<NuxtLink v-if="row.entity_url" :to="row.entity_url" class="font-mono text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400">
						{{ row.entity_code || row.entity_type }}
					</NuxtLink>
					<span v-else class="font-mono text-sm">{{ row.entity_code || '—' }}</span>
				</template>
				<template #title-data="{ row }">
					<div class="max-w-md">
						<span class="text-sm text-gray-900 dark:text-white">{{ row.title }}</span>
						<div v-if="row.description" class="mt-1 text-xs text-gray-400 truncate">{{ row.description?.slice(0, 80) }}</div>
					</div>
				</template>
				<template #severity-data="{ row }">
					<UBadge
						:color="row.severity === 'CRITICAL' ? 'red' : row.severity === 'WARNING' ? 'amber' : 'gray'"
						variant="subtle" size="xs"
					>{{ row.severity }}</UBadge>
				</template>
				<template #status-data="{ row }">
					<UBadge :color="row.status === 'open' ? 'red' : 'gray'" variant="subtle" size="xs">
						{{ row.status }}
					</UBadge>
				</template>
				<template #occurrence_count-data="{ row }">
					<span class="text-xs">{{ row.occurrence_count }}</span>
				</template>
			</UTable>
		</div>
	</div>
</template>
