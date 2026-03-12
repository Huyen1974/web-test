<script setup lang="ts">
import { readItems, aggregate } from '@directus/sdk';

definePageMeta({
	title: 'Danh mục hệ thống',
	description: 'Meta-Catalog — Danh mục sống 3 tầng',
});

function getRegistryLink(item: any) {
	if (!item?.entity_type) return '/knowledge/registries';
	if (item.entity_type === 'all') return '/knowledge/registries/all';
	return `/knowledge/registries/${item.entity_type}`;
}

function formatAction(action: string) {
	if (!action) return '';
	if (action.includes('create')) return 'created';
	if (action.includes('update')) return 'updated';
	if (action.includes('delete')) return 'deleted';
	return action;
}

function formatMinuteKey(ts: string) {
	if (!ts) return '';
	return ts.slice(0, 16); // "2026-03-10T08:44" — minute precision
}

function formatMinuteDisplay(minuteKey: string) {
	if (!minuteKey) return '';
	const d = new Date(minuteKey + ':00Z');
	const now = new Date();
	const diffMs = now.getTime() - d.getTime();
	const diffMin = Math.floor(diffMs / 60000);
	if (diffMin < 1) return 'vừa xong';
	if (diffMin < 60) return `${diffMin} phút trước`;
	const diffH = Math.floor(diffMin / 60);
	if (diffH < 24) return `${diffH}h trước`;
	return d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

const { $directus } = useNuxtApp();

// Fetch summary stats from meta_catalog
const { data: summary } = useAsyncData(
	'registry-summary',
	async () => {
		try {
			const items = await $directus.request(
				readItems('meta_catalog' as any, {
					fields: ['code', 'record_count', 'orphan_count', 'status'],
					limit: -1,
				}),
			);
			const entries = items as any[];
			const active = entries.filter((e) => e.status === 'published' || e.status === 'active');
			// Exclude CAT-ALL and CAT-999 from sums to avoid double counting
			const countable = active.filter((e) => e.code !== 'CAT-ALL' && e.code !== 'CAT-999');
			return {
				totalAtoms: countable.reduce((sum, e) => sum + (e.record_count || 0), 0),
				totalCategories: countable.length,
				totalOrphans: countable.reduce((sum, e) => sum + (e.orphan_count || 0), 0),
			};
		} catch {
			return null;
		}
	},
	{ default: () => null },
);

// Fetch recent changelog entries grouped by MINUTE
const { data: recentChanges } = useAsyncData(
	'registry-changelog',
	async () => {
		try {
			const items = await $directus.request(
				readItems('registry_changelog' as any, {
					fields: ['id', 'timestamp', 'entity_type', 'action', 'entity_code', 'entity_name', 'alert_level', 'alert_detail'],
					sort: ['-timestamp'],
					limit: 200,
				}),
			);
			// Group by minute
			const minuteGroups = new Map<
				string,
				{
					minuteKey: string;
					created: number;
					updated: number;
					deleted: number;
					types: Set<string>;
					details: Array<{ type: string; code: string; name: string; action: string }>;
				}
			>();
			for (const e of items as any[]) {
				const mk = formatMinuteKey(e.timestamp);
				if (!minuteGroups.has(mk)) {
					minuteGroups.set(mk, { minuteKey: mk, created: 0, updated: 0, deleted: 0, types: new Set(), details: [] });
				}
				const g = minuteGroups.get(mk)!;
				const action = formatAction(e.action);
				if (action === 'created') g.created++;
				else if (action === 'updated') g.updated++;
				else if (action === 'deleted') g.deleted++;
				g.types.add(e.entity_type || '');
				const rawCode = e.entity_code || '';
				const rawName = e.entity_name || '';
				g.details.push({
					type: e.entity_type || '',
					code: rawCode !== 'undefined' ? rawCode : '',
					name: rawName !== 'undefined' ? rawName : '',
					action,
				});
			}
			return Array.from(minuteGroups.values())
				.sort((a, b) => b.minuteKey.localeCompare(a.minuteKey))
				.slice(0, 10);
		} catch {
			return null;
		}
	},
	{ default: () => null },
);

// Expanded minute rows tracking
const expandedMinutes = ref<Set<string>>(new Set());

function toggleMinute(mk: string) {
	if (expandedMinutes.value.has(mk)) {
		expandedMinutes.value.delete(mk);
	} else {
		expandedMinutes.value.add(mk);
	}
	// Force reactivity
	expandedMinutes.value = new Set(expandedMinutes.value);
}

// UTable config for changelog
const changelogColumns = [
	{ key: 'time', label: 'Thời gian' },
	{ key: 'types', label: 'Loại' },
	{ key: 'created', label: 'Thêm' },
	{ key: 'updated', label: 'Cập nhật' },
	{ key: 'deleted', label: 'Xoá' },
	{ key: 'total', label: 'Tổng' },
];

const changelogRows = computed(() =>
	(recentChanges.value || []).map((g) => ({
		minuteKey: g.minuteKey,
		time: formatMinuteDisplay(g.minuteKey),
		types: Array.from(g.types).join(', '),
		created: g.created || 0,
		updated: g.updated || 0,
		deleted: g.deleted || 0,
		total: g.created + g.updated + g.deleted,
		details: g.details,
		isExpanded: expandedMinutes.value.has(g.minuteKey),
	})),
);

// Crosscheck data: changelog stats per entity_type
const { data: changelogStats } = useAsyncData(
	'registry-crosscheck-stats',
	async () => {
		try {
			const items = await $directus.request(
				readItems('registry_changelog' as any, {
					fields: ['entity_type', 'action'],
					limit: -1,
				}),
			);
			const stats: Record<string, { created: number; deleted: number }> = {};
			for (const e of items as any[]) {
				const et = e.entity_type || '';
				if (!stats[et]) stats[et] = { created: 0, deleted: 0 };
				if ((e.action || '').includes('create')) stats[et].created++;
				else if ((e.action || '').includes('delete')) stats[et].deleted++;
			}
			return stats;
		} catch {
			return {};
		}
	},
	{ default: () => ({}) },
);

function getCrosscheckStatus(item: any): { label: string; color: string } {
	const baseline = item?.baseline_count || 0;
	const record = item?.record_count || 0;
	const actual = item?.actual_count || 0;
	const et = item?.entity_type || '';
	if (baseline <= 0) return { label: '—', color: 'gray' };

	// Check 1: record_count vs actual_count
	if (record !== actual) {
		const d = actual - record;
		return { label: `❌ lệch ${d > 0 ? '+' : ''}${d}`, color: 'red' };
	}

	// Check 2: baseline + changelog vs record_count
	const stats = (changelogStats.value as any)?.[et] || { created: 0, deleted: 0 };
	const expected = baseline + stats.created - stats.deleted;
	if (record !== expected) {
		const delta = record - expected;
		return { label: `❌ lệch ${delta > 0 ? '+' : ''}${delta}`, color: 'red' };
	}

	return { label: '✅ khớp', color: 'green' };
}

// Count unresolved alerts
const { data: alertCount } = useAsyncData(
	'registry-alerts',
	async () => {
		try {
			const result = await $directus.request(
				aggregate('registry_changelog' as any, {
					aggregate: { countDistinct: 'id' },
					query: {
						filter: {
							alert_level: { _in: ['warning', 'critical'] },
							resolved: { _eq: false },
						},
					},
				}),
			);
			const count = (result as any)?.[0]?.countDistinct?.id;
			return count ? parseInt(count) : 0;
		} catch {
			return 0;
		}
	},
	{ default: () => 0 },
);
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
				Meta-Catalog — Danh mục sống 3 tầng. Click vào số lượng hoặc tên để xem chi tiết.
			</p>
		</div>

		<!-- Summary stats -->
		<div v-if="summary" class="mb-6 grid grid-cols-3 gap-4">
			<div class="rounded-lg border border-gray-200 bg-white p-4 text-center dark:border-gray-700 dark:bg-gray-800">
				<div class="text-3xl font-bold text-primary-600 dark:text-primary-400">{{ summary.totalAtoms }}</div>
				<div class="mt-1 text-sm text-gray-500 dark:text-gray-400">Tổng nguyên tử</div>
			</div>
			<div class="rounded-lg border border-gray-200 bg-white p-4 text-center dark:border-gray-700 dark:bg-gray-800">
				<div class="text-3xl font-bold text-gray-900 dark:text-white">{{ summary.totalCategories }}</div>
				<div class="mt-1 text-sm text-gray-500 dark:text-gray-400">loại thực thể</div>
			</div>
			<div class="rounded-lg border border-gray-200 bg-white p-4 text-center dark:border-gray-700 dark:bg-gray-800">
				<div
					class="text-3xl font-bold"
					:class="summary.totalOrphans > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'"
				>
					{{ summary.totalOrphans }}
				</div>
				<div class="mt-1 text-sm text-gray-500 dark:text-gray-400">mồ côi</div>
			</div>
		</div>

		<!-- Alert banner -->
		<div
			v-if="alertCount && alertCount > 0"
			class="mb-6 rounded-lg border border-red-300 bg-red-50 px-4 py-3 dark:border-red-700 dark:bg-red-900/20"
		>
			<div class="flex items-center gap-2">
				<UIcon name="i-heroicons-exclamation-triangle" class="h-5 w-5 text-red-600 dark:text-red-400" />
				<span class="font-medium text-red-800 dark:text-red-200">
					{{ alertCount }} cảnh báo chưa xử lý
				</span>
			</div>
		</div>

		<SharedDirectusTable
			table-id="tbl_meta_catalog"
			:row-link="(item: any) => getRegistryLink(item)"
		>
			<template #cell-record_count="{ value, item }">
				<NuxtLink
					:to="getRegistryLink(item)"
					class="inline-flex items-center gap-1 font-semibold text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-200"
					@click.stop
				>
					{{ value ?? 0 }}
					<UIcon name="i-heroicons-arrow-right-20-solid" class="h-3.5 w-3.5" />
				</NuxtLink>
			</template>
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
			<template #cell-baseline_count="{ value, item }">
				<span v-if="value > 0" class="text-xs" :class="getCrosscheckStatus(item).color === 'green' ? 'text-emerald-600 dark:text-emerald-400' : getCrosscheckStatus(item).color === 'red' ? 'text-red-600 dark:text-red-400' : 'text-gray-400'">
					{{ getCrosscheckStatus(item).label }}
				</span>
				<span v-else class="text-gray-300 dark:text-gray-600">—</span>
			</template>
			<template #cell-atom_group="{ value }">
				<UBadge
					v-if="value"
					:color="value === 'cấu_trúc' ? 'blue' : value === 'quy_trình' ? 'purple' : value === 'công_cụ' ? 'green' : value === 'dữ_liệu' ? 'orange' : 'gray'"
					variant="subtle"
					size="xs"
				>
					{{ value === 'cấu_trúc' ? 'Cấu trúc' : value === 'quy_trình' ? 'Quy trình' : value === 'công_cụ' ? 'Công cụ' : value === 'dữ_liệu' ? 'Dữ liệu' : 'Giám sát' }}
				</UBadge>
				<span v-else class="text-gray-300 dark:text-gray-600">—</span>
			</template>
		</SharedDirectusTable>

		<!-- Nhật ký thay đổi gần đây -->
		<div v-if="recentChanges && recentChanges.length > 0" class="mt-10">
			<h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-white">Nhật ký thay đổi gần đây</h2>
			<div class="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
				<!-- TABLE-EXCEPTION: UTable does not support expandable/collapsible detail rows -->
			<table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
					<thead class="bg-gray-50 dark:bg-gray-800">
						<tr>
							<th v-for="col in changelogColumns" :key="col.key" class="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
								{{ col.label }}
							</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
						<template v-for="row in changelogRows" :key="row.minuteKey">
							<tr
								class="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
								@click="toggleMinute(row.minuteKey)"
							>
								<td class="whitespace-nowrap px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
									<span class="mr-1 inline-block w-4 text-center">{{ row.isExpanded ? '▼' : '▶' }}</span>
									{{ row.time }}
								</td>
								<td class="px-3 py-2 text-sm text-gray-900 dark:text-white">{{ row.types }}</td>
								<td class="px-3 py-2 text-sm">
									<span v-if="row.created > 0" class="font-medium text-emerald-600 dark:text-emerald-400">+{{ row.created }}</span>
									<span v-else class="text-gray-300 dark:text-gray-600">0</span>
								</td>
								<td class="px-3 py-2 text-sm">
									<span v-if="row.updated > 0" class="font-medium text-blue-600 dark:text-blue-400">{{ row.updated }}</span>
									<span v-else class="text-gray-300 dark:text-gray-600">0</span>
								</td>
								<td class="px-3 py-2 text-sm">
									<span v-if="row.deleted > 0" class="font-medium text-red-600 dark:text-red-400">-{{ row.deleted }}</span>
									<span v-else class="text-gray-300 dark:text-gray-600">0</span>
								</td>
								<td class="px-3 py-2 text-sm font-medium text-gray-900 dark:text-white">{{ row.total }}</td>
							</tr>
							<!-- Expanded detail rows -->
							<tr v-if="row.isExpanded">
								<td colspan="6" class="bg-gray-50 px-6 py-2 dark:bg-gray-800/50">
									<div class="space-y-1">
										<div
											v-for="(detail, idx) in row.details"
											:key="idx"
											class="flex items-center gap-3 text-xs"
										>
											<UBadge
												:color="detail.action === 'created' ? 'green' : detail.action === 'deleted' ? 'red' : 'blue'"
												variant="subtle"
												size="xs"
											>
												{{ detail.action === 'created' ? 'Thêm' : detail.action === 'deleted' ? 'Xoá' : 'Sửa' }}
											</UBadge>
											<span class="text-gray-500 dark:text-gray-400">{{ detail.type }}</span>
											<span v-if="detail.code" class="font-mono text-gray-700 dark:text-gray-300">{{ detail.code }}</span>
											<span v-if="detail.name" class="text-gray-600 dark:text-gray-300">{{ detail.name }}</span>
										</div>
									</div>
								</td>
							</tr>
						</template>
					</tbody>
				</table>
			</div>
		</div>
	</div>
</template>
