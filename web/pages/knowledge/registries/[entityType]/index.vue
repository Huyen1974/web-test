<script setup lang="ts">
import { readItems } from '@directus/sdk';

const route = useRoute();
const entityType = computed(() => route.params.entityType as string);

// Detect if this is a virtual entry (CAT-ALL, CAT-MOL, etc.)
const VIRTUAL_CODE_LEVEL: Record<string, string> = {
	'CAT-ALL': 'atom',
	'CAT-MOL': 'molecule',
	'CAT-CMP': 'compound',
	'CAT-MAT': 'material',
	'CAT-PRD': 'product',
	'CAT-BLD': 'building',
};

const LEVEL_CONFIG: Record<string, { label: string; color: string }> = {
	atom: { label: 'Nguyên tử', color: 'green' },
	molecule: { label: 'Phân tử', color: 'blue' },
	compound: { label: 'Hợp chất', color: 'purple' },
	material: { label: 'Vật liệu', color: 'orange' },
	product: { label: 'Sản phẩm', color: 'amber' },
	building: { label: 'Công trình', color: 'indigo' },
};

const LEVEL_LABEL_VI: Record<string, string> = {
	atom: 'Lớp nguyên tử',
	molecule: 'Lớp phân tử',
	compound: 'Lớp hợp chất',
	material: 'Lớp vật liệu',
	product: 'Lớp sản phẩm',
	building: 'Lớp công trình',
};

const isVirtual = computed(() => entityType.value in VIRTUAL_CODE_LEVEL);
const virtualLevel = computed(() => VIRTUAL_CODE_LEVEL[entityType.value] || '');

// Map entity_type -> table_id for DirectusTable (managed entities only)
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

const { $directus } = useNuxtApp();

// === VIRTUAL ENTRY: Fetch managed collections for this composition_level ===
const { data: virtualData } = useAsyncData(
	`virtual-${entityType.value}`,
	async () => {
		if (!isVirtual.value) return null;
		try {
			// Điều 26 v3.5 Mission 1: read counts directly from meta_catalog (pivot replaces v_registry_counts)
			const catalog = await $directus.request(
				readItems('meta_catalog' as any, {
					fields: ['code', 'name', 'entity_type', 'composition_level', 'record_count', 'orphan_count', 'baseline_count'],
					filter: {
						identity_class: { _eq: 'managed' },
						composition_level: { _eq: virtualLevel.value },
						registry_collection: { _nnull: true },
						status: { _eq: 'active' },
					},
					sort: ['code'],
					limit: -1,
				}),
			);

			const items = (catalog as any[]).map((c, idx) => {
				const prevCount = c.baseline_count || 0;
				const delta = (c.record_count || 0) - prevCount;
				return {
					stt: idx + 1,
					code: c.code,
					name: c.name,
					entity_type: c.entity_type,
					record_count: c.record_count || 0,
					orphan_count: c.orphan_count || 0,
					delta_plus: delta > 0 ? delta : 0,
					delta_minus: delta < 0 ? delta : 0,
				};
			});

			const totalRecords = items.reduce((s, i) => s + i.record_count, 0);
			const totalOrphans = items.reduce((s, i) => s + i.orphan_count, 0);

			return { items, totalRecords, totalOrphans, count: items.length };
		} catch {
			return null;
		}
	},
	{ default: () => null },
);

const virtualColumns = [
	{ key: 'stt', label: 'STT' },
	{ key: 'code', label: 'Code' },
	{ key: 'name', label: 'Tên' },
	{ key: 'record_count', label: 'Số lượng' },
	{ key: 'delta_plus', label: '+' },
	{ key: 'delta_minus', label: '-' },
	{ key: 'orphan_count', label: 'Mồ côi' },
];

const router = useRouter();
function onVirtualRowClick(row: any) {
	if (row.entity_type) {
		router.push(`/knowledge/registries/${row.entity_type}`);
	}
}

// === MANAGED ENTITY: Fetch catalog entry ===
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
		if (isVirtual.value) return [];
		try {
			return (await $directus.request(
				readItems('system_issues' as any, {
					fields: ['id', 'code', 'title', 'issue_type', 'severity', 'source', 'detected_at'],
					filter: { entity_type: { _eq: entityType.value }, status: { _eq: 'open' } },
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
	title: computed(() => {
		if (isVirtual.value) return LEVEL_LABEL_VI[virtualLevel.value] || entityType.value;
		return catalogEntry.value?.name || 'Registry';
	}),
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

			<!-- === VIRTUAL ENTRY HEADER === -->
			<template v-if="isVirtual">
				<div class="mb-2">
					<UBadge color="primary" variant="solid" size="sm">LAYER 2</UBadge>
				</div>
				<div class="flex items-center gap-3">
					<h1 class="text-3xl font-bold text-gray-900 dark:text-white">
						{{ LEVEL_LABEL_VI[virtualLevel] }}
					</h1>
					<UBadge
						:color="(LEVEL_CONFIG[virtualLevel]?.color as any) || 'gray'"
						variant="subtle"
					>
						{{ LEVEL_CONFIG[virtualLevel]?.label || virtualLevel }}
					</UBadge>
				</div>
				<p v-if="virtualData" class="mt-1 text-sm text-gray-500 dark:text-gray-400">
					{{ entityType }} — {{ virtualData.count }} loại, {{ virtualData.totalRecords }} thực thể
				</p>
			</template>

			<!-- === MANAGED ENTRY HEADER === -->
			<template v-else>
				<div class="mb-2">
					<UBadge color="primary" variant="solid" size="sm">LAYER 3</UBadge>
				</div>
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
			</template>
		</div>

		<!-- === VIRTUAL: Lớp 2 — danh sách collections thuộc lớp === -->
		<template v-if="isVirtual">
			<template v-if="virtualData && virtualData.items.length > 0">
				<UTable :columns="virtualColumns" :rows="virtualData.items" @select="onVirtualRowClick">
					<template #cell-stt="{ row }">
						<span class="text-xs text-gray-400">{{ row.stt }}</span>
					</template>
					<template #cell-code="{ row }">
						<span class="font-mono text-xs">{{ row.code }}</span>
					</template>
					<template #cell-name="{ row }">
						<NuxtLink
							:to="`/knowledge/registries/${row.entity_type}`"
							class="text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-200"
							@click.stop
						>
							{{ row.name }}
						</NuxtLink>
					</template>
					<template #cell-record_count="{ row }">
						<span class="font-medium">{{ row.record_count }}</span>
					</template>
					<template #cell-delta_plus="{ row }">
						<span v-if="row.delta_plus > 0" class="font-medium text-emerald-600 dark:text-emerald-400">+{{ row.delta_plus }}</span>
					</template>
					<template #cell-delta_minus="{ row }">
						<span v-if="row.delta_minus < 0" class="font-medium text-red-600 dark:text-red-400">{{ row.delta_minus }}</span>
					</template>
					<template #cell-orphan_count="{ row }">
						<span
							v-if="row.orphan_count > 0"
							class="font-medium text-amber-600 dark:text-amber-400"
						>{{ row.orphan_count }}</span>
						<span v-else class="text-gray-400">0</span>
					</template>
				</UTable>
			</template>
			<div
				v-else
				class="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
			>
				Chưa có thực thể nào thuộc lớp này.
			</div>

		</template>

		<!-- === MANAGED: DirectusTable + crosscheck + issues === -->
		<template v-else>
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
		</template>
	</div>
</template>
