<script setup lang="ts">
import { readItems } from '@directus/sdk';

const route = useRoute();
const entityType = computed(() => route.params.entityType as string);

// Map entity_type -> table_id for DirectusTable
const tableIdMap: Record<string, string> = {
	catalog: 'tbl_meta_catalog',
	table: 'tbl_table_registry',
	module: 'tbl_registry_modules',
	workflow: 'tbl_workflow_list',
	workflow_step: 'tbl_workflow_steps',
	wcr: 'tbl_wcr_list',
	dot_tool: 'tbl_registry_dot_tools',
	page: 'tbl_registry_ui_pages',
	collection: 'tbl_registry_collections',
	task: 'tbl_tasks_list',
	agent: 'tbl_registry_agents',
	checkpoint_type: 'tbl_registry_checkpoint_types',
	checkpoint_set: 'tbl_registry_checkpoint_sets',
	entity_dependency: 'tbl_registry_entity_dependencies',
	table_proposal: 'tbl_proposals_list',
	checkpoint_instance: 'tbl_checkpoint_instances',
	changelog: 'tbl_registry_changelog',
	system_issue: 'tbl_system_issues',
};

const tableId = computed(() => tableIdMap[entityType.value] || '');

// Fetch catalog entry for this entity type
const { $directus } = useNuxtApp();
const { data: catalogEntry } = useAsyncData(
	`catalog-${entityType.value}`,
	() =>
		$directus.request(
			readItems('meta_catalog', {
				filter: { entity_type: { _eq: entityType.value } },
				fields: ['id', 'code', 'name', 'entity_type', 'registry_collection', 'record_count', 'actual_count', 'baseline_count', 'source_model', 'status'],
				limit: 1,
			}),
		),
	{ transform: (items: any[]) => items?.[0] || null },
);

// Crosscheck for THIS entity type
const { data: crosscheck } = useAsyncData(
	`crosscheck-${entityType.value}`,
	async () => {
		try {
			const clItems = await $directus.request(
				readItems('registry_changelog' as any, {
					fields: ['action'],
					filter: { entity_type: { _eq: entityType.value } },
					limit: -1,
				}),
			);
			let created = 0;
			let deleted = 0;
			for (const e of clItems as any[]) {
				if ((e.action || '').includes('create')) created++;
				else if ((e.action || '').includes('delete')) deleted++;
			}
			return { created, deleted };
		} catch {
			return null;
		}
	},
	{ default: () => null },
);

const crosscheckResult = computed(() => {
	if (!catalogEntry.value || !crosscheck.value) return null;
	const baseline = catalogEntry.value.baseline_count || 0;
	const xuoi = catalogEntry.value.actual_count || 0;
	if (baseline <= 0) return { xuoi, baseline: 0, created: crosscheck.value.created, deleted: crosscheck.value.deleted, nguoc: null, status: 'no_baseline' as const };
	const nguoc = baseline + crosscheck.value.created - crosscheck.value.deleted;
	return {
		xuoi,
		baseline,
		created: crosscheck.value.created,
		deleted: crosscheck.value.deleted,
		nguoc,
		status: (xuoi === nguoc ? 'match' : 'mismatch') as 'match' | 'mismatch',
	};
});

// Issues for THIS entity type
function formatTime(ts: string) {
	if (!ts) return '';
	const d = new Date(ts);
	const now = new Date();
	const diffMs = now.getTime() - d.getTime();
	const diffMin = Math.floor(diffMs / 60000);
	if (diffMin < 1) return 'vừa xong';
	if (diffMin < 60) return `${diffMin} phút trước`;
	const diffH = Math.floor(diffMin / 60);
	if (diffH < 24) return `${diffH}h trước`;
	return d.toLocaleDateString('vi-VN');
}

const { data: entityIssues } = useAsyncData(
	`issues-${entityType.value}`,
	async () => {
		try {
			return (await $directus.request(
				readItems('system_issues' as any, {
					fields: ['id', 'code', 'title', 'issue_type', 'severity', 'source', 'detected_at'],
					filter: { entity_type: { _eq: entityType.value }, status: { _in: ['mở', 'đang_xử_lý'] } },
					sort: ['-detected_at'],
					limit: 20,
				}),
			)) as any[];
		} catch {
			return [];
		}
	},
	{ default: () => [] },
);

const issueColumns = [
	{ key: 'code', label: 'Mã' },
	{ key: 'title', label: 'Tiêu đề' },
	{ key: 'severity', label: 'Mức độ' },
	{ key: 'source', label: 'Phát hiện bởi' },
	{ key: 'time', label: 'Thời gian' },
];

const issueRows = computed(() =>
	(entityIssues.value || []).map((i: any) => ({
		code: i.code || '—',
		title: i.title,
		severity: i.severity,
		source: i.source,
		time: formatTime(i.detected_at),
	})),
);

definePageMeta({
	title: 'Registry',
});

useHead({
	title: computed(() => catalogEntry.value?.name || 'Registry'),
});
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

			<div class="flex items-center gap-3">
				<h1 class="text-3xl font-bold text-gray-900 dark:text-white">
					{{ catalogEntry?.name || entityType }}
				</h1>
				<span
					v-if="catalogEntry?.status"
					class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize"
					:class="{
						'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300': catalogEntry.status === 'active',
						'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300': catalogEntry.status === 'planned',
					}"
				>
					{{ catalogEntry.status }}
				</span>
				<span
					v-if="catalogEntry?.record_count != null"
					class="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300"
				>
					{{ catalogEntry.record_count }} items
				</span>
			</div>

			<p v-if="catalogEntry?.code" class="mt-1 text-sm text-gray-500 dark:text-gray-400">
				{{ catalogEntry.code }}
				<template v-if="catalogEntry?.source_model">
					&middot;
					{{ catalogEntry.source_model === 'A' ? 'Model A — Directus SSOT' : 'Model B — File scan' }}
				</template>
			</p>
		</div>

		<SharedDirectusTable
			v-if="tableId"
			:table-id="tableId"
			:row-link="(item: any) => `/knowledge/registries/${entityType}/${item.code || item.process_code || item.table_id || item.id}`"
		>
			<template #cell-status="{ value }">
				<span
					class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize"
					:class="{
						'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300': value === 'active' || value === 'published',
						'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300': value === 'planned' || value === 'draft',
						'bg-gray-100 text-gray-700 dark:bg-gray-700/50 dark:text-gray-300': value === 'deprecated' || value === 'retired',
					}"
				>
					{{ value }}
				</span>
			</template>
			<template #cell-has_note="{ value }">
				<span :class="value ? 'text-emerald-600' : 'text-red-500'">
					{{ value ? 'Yes' : 'No' }}
				</span>
			</template>
		</SharedDirectusTable>

		<div
			v-else
			class="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300"
		>
			Chưa có bảng registry cho loại "{{ entityType }}". Vui lòng liên hệ admin.
		</div>

		<!-- Kiểm chứng ngược cho entity type này -->
		<div v-if="crosscheckResult" class="mt-8">
			<h2 class="mb-3 text-lg font-semibold text-gray-800 dark:text-gray-200">Kiểm chứng ngược</h2>
			<UCard>
				<div class="flex items-center gap-6">
					<div class="text-sm">
						<span class="text-gray-500 dark:text-gray-400">Xuôi (live):</span>
						<span class="ml-1 font-semibold">{{ crosscheckResult.xuoi }}</span>
					</div>
					<div class="text-sm">
						<span class="text-gray-500 dark:text-gray-400">Baseline:</span>
						<span v-if="crosscheckResult.baseline > 0" class="ml-1 font-semibold">{{ crosscheckResult.baseline }}</span>
						<span v-else class="ml-1 text-gray-300 dark:text-gray-600">—</span>
					</div>
					<div class="text-sm">
						<span class="text-gray-500 dark:text-gray-400">+Tạo:</span>
						<span class="ml-1 font-semibold text-emerald-600 dark:text-emerald-400">{{ crosscheckResult.created }}</span>
					</div>
					<div class="text-sm">
						<span class="text-gray-500 dark:text-gray-400">-Xoá:</span>
						<span class="ml-1 font-semibold text-red-600 dark:text-red-400">{{ crosscheckResult.deleted }}</span>
					</div>
					<div class="text-sm">
						<span class="text-gray-500 dark:text-gray-400">Ngược:</span>
						<span v-if="crosscheckResult.nguoc !== null" class="ml-1 font-semibold">{{ crosscheckResult.nguoc }}</span>
						<span v-else class="ml-1 text-gray-300 dark:text-gray-600">—</span>
					</div>
					<div>
						<UBadge v-if="crosscheckResult.status === 'match'" color="green" variant="subtle" size="sm">KHỚP</UBadge>
						<UBadge v-else-if="crosscheckResult.status === 'mismatch'" color="red" variant="subtle" size="sm">
							LỆCH {{ (crosscheckResult.xuoi - (crosscheckResult.nguoc ?? 0)) > 0 ? '+' : '' }}{{ crosscheckResult.xuoi - (crosscheckResult.nguoc ?? 0) }}
						</UBadge>
						<UBadge v-else color="gray" variant="subtle" size="sm">Chưa baseline</UBadge>
					</div>
				</div>
			</UCard>
		</div>

		<!-- Vấn đề hệ thống cho entity type này -->
		<div v-if="entityIssues && entityIssues.length > 0" class="mt-8">
			<h2 class="mb-3 text-lg font-semibold text-gray-800 dark:text-gray-200">
				Vấn đề
				<UBadge color="red" variant="subtle" size="xs" class="ml-2">{{ entityIssues.length }}</UBadge>
			</h2>
			<UTable :rows="issueRows" :columns="issueColumns">
				<template #cell-severity="{ row }">
					<UBadge
						:color="row.severity === 'nghiêm_trọng' ? 'red' : row.severity === 'cảnh_báo' ? 'yellow' : 'blue'"
						variant="subtle"
						size="xs"
					>
						{{ row.severity === 'nghiêm_trọng' ? 'Nghiêm trọng' : row.severity === 'cảnh_báo' ? 'Cảnh báo' : 'Thông tin' }}
					</UBadge>
				</template>
				<template #cell-time="{ row }">
					<span class="text-gray-500 dark:text-gray-400">{{ row.time }}</span>
				</template>
			</UTable>
		</div>
	</div>
</template>
