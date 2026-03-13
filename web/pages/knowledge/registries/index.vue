<script setup lang="ts">
import { readItems } from '@directus/sdk';

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
	return ts.slice(0, 16);
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

// Composition level labels + colors
const LEVEL_CONFIG: Record<string, { label: string; color: string }> = {
	atom: { label: 'Atom', color: 'green' },
	molecule: { label: 'Molecule', color: 'blue' },
	compound: { label: 'Compound', color: 'purple' },
	material: { label: 'Material', color: 'orange' },
	product: { label: 'Product', color: 'amber' },
	building: { label: 'Building', color: 'indigo' },
};

const LEVEL_LABEL_VI: Record<string, string> = {
	atom: 'Tổng nguyên tử',
	molecule: 'Tổng phân tử',
	compound: 'Tổng hợp chất',
	material: 'Tổng vật liệu',
	product: 'Tổng sản phẩm',
	building: 'Tổng công trình',
};

// Fetch v_registry_counts + meta_catalog to build unified table
const { data: registryData } = useAsyncData(
	'registry-unified',
	async () => {
		try {
			const [counts, catalog] = await Promise.all([
				$directus.request(
					readItems('v_registry_counts' as any, {
						fields: ['cat_code', 'entity_type', 'record_count', 'orphan_count', 'composition_level'],
						limit: -1,
					}),
				),
				$directus.request(
					readItems('meta_catalog' as any, {
						fields: ['code', 'name', 'entity_type', 'composition_level', 'identity_class'],
						filter: { identity_class: { _eq: 'managed' } },
						limit: -1,
					}),
				),
			]);

			const catalogMap = new Map<string, any>();
			for (const c of catalog as any[]) {
				catalogMap.set(c.code, c);
			}

			// Build detail rows
			const details: any[] = [];
			for (const r of counts as any[]) {
				const cat = catalogMap.get(r.cat_code);
				details.push({
					_type: 'detail',
					code: r.cat_code,
					name: cat?.name || r.entity_type,
					entity_type: r.entity_type,
					composition_level: r.composition_level || 'atom',
					record_count: r.record_count || 0,
					orphan_count: r.orphan_count || 0,
					verified: true, // Trigger-maintained = always in sync
				});
			}

			// Build summary rows per composition_level
			const levels = ['atom', 'molecule', 'compound', 'material', 'product', 'building'];
			const summaries: any[] = [];
			for (const level of levels) {
				const levelDetails = details.filter((d) => d.composition_level === level);
				summaries.push({
					_type: 'summary',
					code: '—',
					name: LEVEL_LABEL_VI[level] || level,
					entity_type: '',
					composition_level: level,
					record_count: levelDetails.reduce((s: number, d: any) => s + d.record_count, 0),
					orphan_count: levelDetails.reduce((s: number, d: any) => s + d.orphan_count, 0),
					verified: levelDetails.every((d: any) => d.verified),
				});
			}

			// Sort details by composition_level then code
			details.sort((a, b) => {
				const li = levels.indexOf(a.composition_level);
				const ri = levels.indexOf(b.composition_level);
				if (li !== ri) return li - ri;
				return a.code.localeCompare(b.code);
			});

			return { summaries, details };
		} catch {
			return { summaries: [], details: [] };
		}
	},
	{ default: () => ({ summaries: [], details: [] }) },
);

// UTable columns
const columns = [
	{ key: 'code', label: 'Code' },
	{ key: 'name', label: 'Tên' },
	{ key: 'composition_level', label: 'Tầng' },
	{ key: 'record_count', label: 'Số lượng' },
	{ key: 'orphan_count', label: 'Mồ côi' },
	{ key: 'verified', label: 'Xác minh' },
];

// Combined rows: summaries first, then details
const tableRows = computed(() => {
	const data = registryData.value;
	if (!data) return [];
	return [...data.summaries, ...data.details];
});

// Row click → navigate to detail page
const router = useRouter();
function onRowClick(row: any) {
	if (row._type === 'detail' && row.entity_type) {
		router.push(getRegistryLink(row));
	}
}

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

const expandedMinutes = ref<Set<string>>(new Set());

function toggleMinute(mk: string) {
	if (expandedMinutes.value.has(mk)) {
		expandedMinutes.value.delete(mk);
	} else {
		expandedMinutes.value.add(mk);
	}
	expandedMinutes.value = new Set(expandedMinutes.value);
}

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
				Meta-Catalog — Danh mục sống, đếm realtime bằng PG trigger. Click vào tên để xem chi tiết.
			</p>
		</div>

		<!-- Unified registry table: summaries + details -->
		<UTable :columns="columns" :rows="tableRows" @select="onRowClick">
			<template #cell-code="{ row }">
				<span
					v-if="row._type === 'summary'"
					class="font-medium text-gray-400"
				>—</span>
				<span v-else class="font-mono text-xs">{{ row.code }}</span>
			</template>
			<template #cell-name="{ row }">
				<span
					v-if="row._type === 'summary'"
					class="font-semibold text-gray-900 dark:text-white"
				>{{ row.name }}</span>
				<NuxtLink
					v-else
					:to="getRegistryLink(row)"
					class="text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-200"
					@click.stop
				>
					{{ row.name }}
				</NuxtLink>
			</template>
			<template #cell-composition_level="{ row }">
				<UBadge
					:color="(LEVEL_CONFIG[row.composition_level]?.color as any) || 'gray'"
					variant="subtle"
					size="xs"
				>
					{{ LEVEL_CONFIG[row.composition_level]?.label || row.composition_level }}
				</UBadge>
			</template>
			<template #cell-record_count="{ row }">
				<span
					:class="row._type === 'summary' ? 'font-bold text-gray-900 dark:text-white' : 'font-medium'"
				>{{ row.record_count }}</span>
			</template>
			<template #cell-orphan_count="{ row }">
				<span
					v-if="row.orphan_count > 0"
					class="font-medium text-amber-600 dark:text-amber-400"
				>{{ row.orphan_count }}</span>
				<span v-else class="text-gray-400">0</span>
			</template>
			<template #cell-verified="{ row }">
				<span v-if="row.verified">✅</span>
				<span v-else>❌</span>
			</template>
		</UTable>

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
