<script setup lang="ts">
const route = useRoute();
const issueClass = String(route.params.issue_class || '');

definePageMeta({
	title: 'Vấn đề Hệ thống — Layer 3',
});

const CLASS_LABELS: Record<string, string> = {
	render_fault: 'Lỗi hiển thị',
	data_fault: 'Lỗi dữ liệu',
	sync_fault: 'Lỗi đồng bộ',
	contract_fault: 'Lỗi hợp đồng',
	infra_fault: 'Lỗi hạ tầng',
	watchdog_fault: 'Watchdog',
};

const { data, status } = useAsyncData(
	`system-issues-subgroups-${issueClass}`,
	() => $fetch<any>('/api/registry/system-issues-subgroups', { params: { issue_class: issueClass } }),
	{ default: () => ({ issue_class: issueClass, sub_groups: [], totals: { all: 0, critical: 0, warning: 0 } }) },
);

const columns = [
	{ key: 'stt', label: 'STT' },
	{ key: 'label', label: 'Nhóm con' },
	{ key: 'count', label: 'Số lượng' },
	{ key: 'severity_max', label: 'Nghiêm trọng' },
];

const rows = computed(() =>
	(data.value?.sub_groups || []).map((g: any, idx: number) => ({
		...g,
		stt: idx + 1,
		_link: `/knowledge/registries/system_issue/${issueClass}/${g.sub_class}`,
	})),
);

const router = useRouter();
function onRowClick(row: any) {
	if (row._link) router.push(row._link);
}
</script>

<template>
	<div class="container mx-auto px-4 py-8">
		<div class="mb-8">
			<NuxtLink
				to="/knowledge/registries/system_issue"
				class="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
			>
				&larr; Vấn đề Hệ thống
			</NuxtLink>
			<div class="mb-2">
				<UBadge color="orange" variant="solid" size="sm">LAYER 3</UBadge>
			</div>
			<h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ CLASS_LABELS[issueClass] || issueClass }} — Phân loại chi tiết</h1>
			<p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
				Nhóm con theo nguyên nhân gốc (sub_class — Điều 31 §IV.6-B). Tổng: {{ data.totals?.all || 0 }} issues.
			</p>
		</div>

		<div class="mb-6 flex flex-wrap gap-4">
			<div class="rounded-lg bg-gray-50 px-4 py-3 dark:bg-gray-800">
				<div class="text-2xl font-bold text-gray-700 dark:text-gray-300">{{ data.totals?.all || 0 }}</div>
				<div class="text-xs text-gray-500">Tổng</div>
			</div>
			<div class="rounded-lg bg-red-50 px-4 py-3 dark:bg-red-900/20">
				<div class="text-2xl font-bold text-red-700 dark:text-red-400">{{ data.totals?.critical || 0 }}</div>
				<div class="text-xs text-red-600">CRITICAL</div>
			</div>
			<div class="rounded-lg bg-amber-50 px-4 py-3 dark:bg-amber-900/20">
				<div class="text-2xl font-bold text-amber-700 dark:text-amber-400">{{ data.totals?.warning || 0 }}</div>
				<div class="text-xs text-amber-600">WARNING</div>
			</div>
		</div>

		<div v-if="status === 'pending'" class="py-8 text-center text-gray-500">Đang tải...</div>
		<div v-else>
			<UTable :columns="columns" :rows="rows" @select="onRowClick">
				<template #stt-data="{ row }">
					<span class="text-xs text-gray-400">{{ row.stt }}</span>
				</template>
				<template #label-data="{ row }">
					<NuxtLink :to="row._link" class="font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400">{{ row.label }}</NuxtLink>
				</template>
				<template #count-data="{ row }">
					<span class="font-bold">{{ row.count }}</span>
				</template>
				<template #severity_max-data="{ row }">
					<UBadge
						:color="row.severity_max === 'critical' ? 'red' : row.severity_max === 'warning' ? 'amber' : 'gray'"
						variant="subtle" size="xs"
					>{{ row.severity_max?.toUpperCase() }}</UBadge>
				</template>
			</UTable>
		</div>
	</div>
</template>
