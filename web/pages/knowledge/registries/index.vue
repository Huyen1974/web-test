<script setup lang="ts">
import { readItems } from '@directus/sdk';

definePageMeta({
	title: 'Danh mục hệ thống',
	description: 'Meta-Catalog — Danh mục sống 3 lớp',
});

// Virtual code → composition_level mapping
const VIRTUAL_CODE_LEVEL: Record<string, string> = {
	'CAT-ALL': 'atom',
	'CAT-MOL': 'molecule',
	'CAT-CMP': 'compound',
	'CAT-MAT': 'material',
	'CAT-PRD': 'product',
	'CAT-BLD': 'building',
};

function getRowLink(row: any): string {
	if (row._link) return row._link;
	if (row._type === 'summary' && row._virtualCode) {
		return `/knowledge/registries/${row._virtualCode}`;
	}
	if (row._type === 'detail' && row.entity_type === 'taxonomy_label') {
		return '/knowledge/registries/taxonomy';
	}
	if (row._type === 'detail' && row.entity_type) {
		return `/knowledge/registries/${row.entity_type}`;
	}
	return '/knowledge/registries';
}

function formatAction(action: string): 'created' | 'updated' | 'deleted' | '' {
	if (!action) return '';
	if (action.includes('create')) return 'created';
	if (action.includes('update')) return 'updated';
	if (action.includes('delete')) return 'deleted';
	return '';
}

function formatChangelogTime(ts: string) {
	if (!ts) return '';
	const d = new Date(ts);
	const dd = String(d.getDate()).padStart(2, '0');
	const mm = String(d.getMonth() + 1).padStart(2, '0');
	const hh = String(d.getHours()).padStart(2, '0');
	const min = String(d.getMinutes()).padStart(2, '0');
	return `${dd}/${mm} ${hh}:${min}`;
}

const COMPOSITION_LEVEL_DISPLAY: Record<string, { emoji: string; label: string }> = {
	atom: { emoji: '\uD83D\uDFE2', label: 'nguyên tử' },
	molecule: { emoji: '\uD83D\uDD35', label: 'phân tử' },
	compound: { emoji: '\uD83D\uDFE3', label: 'hợp chất' },
	material: { emoji: '\uD83D\uDFE0', label: 'vật liệu' },
	product: { emoji: '\uD83D\uDFE1', label: 'sản phẩm' },
	building: { emoji: '\uD83D\uDFE4', label: 'công trình' },
	meta: { emoji: '\uD83D\uDFE3', label: 'phân loại' },
};

const { $directus } = useNuxtApp();

// Helper: get species display for a detail row's registry collection
function getCollectionSpecies(row: any): string {
	const comp = compositionData.value;
	if (!comp?.byCollection) return '—';
	// Look up by the Directus collection name from meta_catalog entity_type → registry_collection
	// For now, try the entity_type as collection hint
	const entry = comp.byCollection[row.entity_type] || comp.byCollection[row.code];
	return entry ? entry.speciesName : '—';
}

// Điều 26 v3.5: counts now from meta_catalog directly (pivot_count() populates via refresh-counts)

// Composition level labels + colors
const LEVEL_CONFIG: Record<string, { label: string; color: string }> = {
	atom: { label: 'Nguyên tử', color: 'green' },
	molecule: { label: 'Phân tử', color: 'blue' },
	compound: { label: 'Hợp chất', color: 'purple' },
	material: { label: 'Vật liệu', color: 'orange' },
	product: { label: 'Sản phẩm', color: 'amber' },
	building: { label: 'Công trình', color: 'indigo' },
	meta: { label: 'Phân loại', color: 'pink' },
	health: { label: 'Sức khỏe', color: 'red' },
	info: { label: 'Tham khảo', color: 'gray' },
};

const LEVEL_LABEL_VI: Record<string, string> = {
	atom: 'Tổng nguyên tử',
	molecule: 'Tổng phân tử',
	compound: 'Tổng hợp chất',
	material: 'Tổng vật liệu',
	product: 'Tổng sản phẩm',
	building: 'Tổng công trình',
};

// Reverse lookup: level → virtual code
const LEVEL_TO_VIRTUAL: Record<string, string> = {};
for (const [code, level] of Object.entries(VIRTUAL_CODE_LEVEL)) {
	LEVEL_TO_VIRTUAL[level] = code;
}

// Điều 26 v3.5 Mission 1: pivot_count() replaces v_registry_counts
// Now reads directly from meta_catalog (SSOT) — triggers disabled
const { data: registryData } = useAsyncData(
	'registry-unified',
	async () => {
		try {
			const catalog = await $directus.request(
				readItems('meta_catalog' as any, {
					fields: ['code', 'name', 'entity_type', 'composition_level', 'identity_class', 'record_count', 'active_count', 'orphan_count', 'baseline_count'],
					filter: {
						identity_class: { _in: ['managed', 'log'] },
						registry_collection: { _nnull: true },
						status: { _eq: 'active' },
					},
					limit: -1,
				}),
			);

			// Build detail rows — separate managed vs log
			const managedDetails: any[] = [];
			const logDetails: any[] = [];
			for (const r of catalog as any[]) {
				const prevCount = r.baseline_count || 0;
				const delta = (r.record_count || 0) - prevCount;
				const identityClass = r.identity_class || 'managed';
				const row = {
					_type: 'detail',
					code: r.code,
					name: r.name || r.entity_type,
					entity_type: r.entity_type,
					composition_level: r.composition_level || 'atom',
					record_count: r.record_count || 0,
					orphan_count: r.orphan_count || 0,
					delta_plus: delta > 0 ? delta : 0,
					delta_minus: delta < 0 ? delta : 0,
					verified: true,
				};
				if (identityClass === 'log') {
					logDetails.push(row);
				} else {
					managedDetails.push(row);
				}
			}

			// Build summary rows per composition_level — ONLY from managed details
			const levels = ['atom', 'molecule', 'compound', 'material', 'product', 'building'];
			const summaries: any[] = [];
			for (const level of levels) {
				const levelDetails = managedDetails.filter((d) => d.composition_level === level);
				const sumPlus = levelDetails.reduce((s: number, d: any) => s + d.delta_plus, 0);
				const sumMinus = levelDetails.reduce((s: number, d: any) => s + d.delta_minus, 0);
				summaries.push({
					_type: 'summary',
					_virtualCode: LEVEL_TO_VIRTUAL[level] || '',
					code: LEVEL_TO_VIRTUAL[level] || '—',
					name: LEVEL_LABEL_VI[level] || level,
					entity_type: '',
					composition_level: level,
					record_count: levelDetails.reduce((s: number, d: any) => s + d.record_count, 0),
					orphan_count: levelDetails.reduce((s: number, d: any) => s + d.orphan_count, 0),
					delta_plus: sumPlus,
					delta_minus: sumMinus,
					verified: levelDetails.every((d: any) => d.verified),
				});
			}

			// Sort managed details by composition_level then code
			managedDetails.sort((a, b) => {
				const li = levels.indexOf(a.composition_level);
				const ri = levels.indexOf(b.composition_level);
				if (li !== ri) return li - ri;
				return a.code.localeCompare(b.code);
			});

			return { summaries, details: managedDetails, logs: logDetails };
		} catch {
			return { summaries: [], details: [], logs: [] };
		}
	},
	{ default: () => ({ summaries: [], details: [], logs: [] }) },
);

// Fetch composition data for "Thành phần" column
const { data: compositionData } = useAsyncData(
	'registry-composition',
	async () => {
		try {
			return await $fetch<any>('/api/registry/composition');
		} catch {
			return { byLevel: {}, byCollection: {}, totalSpecies: 0 };
		}
	},
	{ default: () => ({ byLevel: {}, byCollection: {}, totalSpecies: 0 }) },
);

// UTable columns — STT first, "Lớp" instead of "Tầng", + "Thành phần" (S160)
const columns = [
	{ key: 'stt', label: 'STT' },
	{ key: 'code', label: 'Code' },
	{ key: 'name', label: 'Tên' },
	{ key: 'composition_level', label: 'Lớp' },
	{ key: 'record_count', label: 'Số lượng' },
	{ key: 'thanh_phan', label: 'Thành phần' },
	{ key: 'delta_plus', label: '+' },
	{ key: 'delta_minus', label: '-' },
	{ key: 'orphan_count', label: 'Mồ côi' },
	{ key: 'verified', label: 'Xác minh' },
];

const registriesTableRoot = ref<HTMLElement | null>(null);
const registriesHeaderTestIds: Record<string, string> = {
	stt: 'col-stt',
	code: 'col-code',
	name: 'col-ten',
	composition_level: 'col-lop',
	record_count: 'col-so-luong',
	thanh_phan: 'col-thanh-phan',
	delta_plus: 'col-delta-plus',
	delta_minus: 'col-delta-minus',
	orphan_count: 'col-mo-coi',
	verified: 'col-xac-minh',
};

// Combined rows: summaries + details + DOT coverage row, with STT
const tableRows = computed(() => {
	const data = registryData.value;
	if (!data) return [];
	const coverageRow = {
		_type: 'detail',
		code: 'SYS-CVG',
		name: 'Phạm vi Kiểm tra',
		entity_type: 'dot_tool',
		composition_level: 'material',
		record_count: dotToolsCount.value || 0,
		orphan_count: 0,
		delta_plus: 0,
		delta_minus: 0,
		verified: true,
	};
	// Row 7: Species classification (Phân loại loài)
	const sd = speciesData.value;
	const speciesRow = {
		_type: 'summary',
		_virtualCode: null,
		_link: '/knowledge/registries/species',
		code: 'CAT-SPE',
		name: 'Phân loại loài',
		entity_type: '',
		composition_level: 'meta',
		record_count: sd.birthGovCount,
		orphan_count: 0,
		delta_plus: 0,
		delta_minus: 0,
		verified: true,
		_speciesCount: sd.speciesCount,
	};
	// Rows 8-10: Health system
	const hd = healthData.value;
	const ud = unmanagedData.value;
	const orphanRow = {
		_type: 'summary',
		_virtualCode: null,
		_link: '/knowledge/registries/health',
		code: 'CAT-ORP',
		name: 'Mồ côi (Orphan)',
		entity_type: '',
		composition_level: hd.orphan > 0 ? 'health' : 'info',
		record_count: hd.orphan,
		orphan_count: hd.totalGap,
		delta_plus: 0,
		delta_minus: 0,
		verified: hd.orphan === 0,
	};
	const phantomRow = {
		_type: 'summary',
		_virtualCode: null,
		_link: '/knowledge/registries/health',
		code: 'CAT-PHA',
		name: 'Phantom',
		entity_type: '',
		composition_level: hd.phantom > 0 ? 'health' : 'info',
		record_count: hd.phantom,
		orphan_count: 0,
		delta_plus: 0,
		delta_minus: 0,
		verified: hd.phantom === 0,
	};
	const unmanagedRow = {
		_type: 'summary',
		_virtualCode: null,
		_link: '/knowledge/registries/unmanaged',
		code: 'CAT-UNM',
		name: 'Không quản trị',
		entity_type: '',
		composition_level: 'info',
		record_count: ud.total,
		orphan_count: 0,
		delta_plus: 0,
		delta_minus: 0,
		verified: true,
		_unmanagedDetail: `${ud.observed} observed, ${ud.excluded} excluded`,
	};
	// Row 11: System Issues (Vấn đề Hệ thống)
	const sid = systemIssuesData.value;
	const issLevel = sid.critical > 0 ? 'health' : sid.warning > 0 ? 'health' : 'info';
	const systemIssuesRow = {
		_type: 'summary',
		_virtualCode: null,
		_link: '/knowledge/registries/system_issue',
		code: 'CAT-017',
		name: 'Vấn đề Hệ thống',
		entity_type: 'system_issue',
		composition_level: issLevel,
		record_count: sid.all,
		orphan_count: sid.critical,
		delta_plus: 0,
		delta_minus: 0,
		verified: sid.critical === 0,
		_issueDetail: { critical: sid.critical, warning: sid.warning, info: sid.info, group_count: sid.group_count || 0 },
	};
	return [...data.summaries, speciesRow, orphanRow, phantomRow, unmanagedRow, systemIssuesRow, ...data.details, coverageRow].map((row, idx) => ({
		...row,
		stt: idx + 1,
	}));
});

// Row click → navigate to detail page
const router = useRouter();
function onRowClick(row: any) {
	const link = getRowLink(row);
	if (link !== '/knowledge/registries') {
		router.push(link);
	}
}

// Fetch recent changelog — 10 most recent individual entries
const { data: recentChangelog } = useAsyncData(
	'registry-changelog-v2',
	async () => {
		try {
			const [items, catalog] = await Promise.all([
				$directus.request(
					readItems('registry_changelog' as any, {
						fields: ['id', 'timestamp', 'entity_type', 'action', 'entity_code', 'entity_name'],
						sort: ['-id'],
						limit: 10,
					}),
				),
				$directus.request(
					readItems('meta_catalog' as any, {
						fields: ['entity_type', 'composition_level'],
						limit: -1,
					}),
				),
			]);
			const levelMap = new Map<string, string>();
			for (const c of catalog as any[]) {
				if (c.entity_type) levelMap.set(c.entity_type, c.composition_level || 'atom');
			}
			return (items as any[]).map((e: any) => {
				const action = formatAction(e.action);
				const code = e.entity_code && e.entity_code !== 'undefined' ? e.entity_code : '';
				const name = e.entity_name && e.entity_name !== 'undefined' ? e.entity_name : '';
				const level = levelMap.get(e.entity_type || '') || 'atom';
				return {
					id: e.id,
					time: formatChangelogTime(e.timestamp),
					code,
					name,
					entityType: e.entity_type || '',
					level,
					action,
				};
			});
		} catch {
			return [];
		}
	},
	{ default: () => [] },
);

const logColumns = [
	{ key: 'code', label: 'Code' },
	{ key: 'name', label: 'Tên' },
	{ key: 'record_count', label: 'Số lượng' },
	{ key: 'orphan_count', label: 'Mồ côi' },
];

const logRows = computed(() =>
	(registryData.value?.logs || []).map((row: any) => ({
		...row,
	})),
);

const changelogColumns = [
	{ key: 'stt', label: 'STT' },
	{ key: 'time', label: 'Thời gian' },
	{ key: 'code', label: 'Mã' },
	{ key: 'name', label: 'Tên' },
	{ key: 'level', label: 'Lớp' },
	{ key: 'action', label: 'Thay đổi' },
];

const changelogRows = computed(() =>
	(recentChangelog.value || []).map((e: any, idx: number) => ({
		...e,
		stt: idx + 1,
	})),
);

// Fetch registry health (orphan/phantom) for rows 8-9
const { data: healthData } = useAsyncData(
	'registry-health',
	async () => {
		try {
			const resp = await $fetch<any>('/api/registry/health');
			return resp?.totals || { khop: 0, orphan: 0, phantom: 0, totalGap: 0 };
		} catch {
			return { khop: 0, orphan: 0, phantom: 0, totalGap: 0 };
		}
	},
	{ default: () => ({ khop: 0, orphan: 0, phantom: 0, totalGap: 0 }) },
);

// Fetch unmanaged count for row 10
const { data: unmanagedData } = useAsyncData(
	'registry-unmanaged',
	async () => {
		try {
			const resp = await $fetch<any>('/api/registry/unmanaged');
			return resp?.totals || { observed: 0, excluded: 0, total: 0 };
		} catch {
			return { observed: 0, excluded: 0, total: 0 };
		}
	},
	{ default: () => ({ observed: 0, excluded: 0, total: 0 }) },
);

// Fetch system issues count for Row 11 (Vấn đề Hệ thống)
const { data: systemIssuesData } = useAsyncData(
	'registry-system-issues',
	async () => {
		try {
			const resp = await $fetch<any>('/api/registry/system-issues');
			return resp?.totals || { all: 0, critical: 0, warning: 0, info: 0, group_count: 0 };
		} catch {
			return { all: 0, critical: 0, warning: 0, info: 0, group_count: 0 };
		}
	},
	{ default: () => ({ all: 0, critical: 0, warning: 0, info: 0, group_count: 0 }) },
);

// Fetch DOT tools count for coverage row
const { data: dotToolsCount } = useAsyncData(
	'dot-tools-count',
	async () => {
		try {
			const items = await $directus.request(
				readItems('dot_tools' as any, { fields: ['id'], limit: -1 }),
			);
			return (items as any[]).length;
		} catch {
			return 0;
		}
	},
	{ default: () => 0 },
);

// Fetch species count + birth_registry governed count for Row 7
const { data: speciesData } = useAsyncData(
	'species-row7',
	async () => {
		try {
			const [species, births] = await Promise.all([
				$directus.request(
					readItems('entity_species' as any, {
						fields: ['id'],
						limit: -1,
					}),
				),
				$directus.request(
					readItems('birth_registry' as any, {
						fields: ['id'],
						filter: { governance_role: { _eq: 'governed' } },
						limit: -1,
					}),
				),
			]);
			return {
				speciesCount: (species as any[]).length,
				birthGovCount: (births as any[]).length,
			};
		} catch {
			return { speciesCount: 0, birthGovCount: 0 };
		}
	},
	{ default: () => ({ speciesCount: 0, birthGovCount: 0 }) },
);

useTableTestIds({
	rootRef: registriesTableRoot,
	tableTestId: 'registries-table',
	columnKeys: computed(() => columns.map((column) => column.key)),
	headerTestIds: registriesHeaderTestIds,
	rowTestIds: computed(() =>
		tableRows.value.map((row: any) => (row.code ? `row-${row.code}` : undefined)),
	),
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
			<div class="mb-2">
				<UBadge color="primary" variant="solid" size="sm">LAYER 1</UBadge>
			</div>
			<h1 class="text-3xl font-bold text-gray-900 dark:text-white">Danh mục hệ thống</h1>
			<p class="mt-2 text-gray-600 dark:text-gray-400">
				Meta-Catalog — Danh mục sống, đếm realtime bằng PG trigger. Click vào tên để xem chi tiết.
			</p>
		</div>

		<!-- Quick links -->
		<div class="mb-6 flex flex-wrap gap-3">
			<NuxtLink to="/knowledge/registries/all">
				<UBadge color="blue" variant="subtle" size="sm" class="cursor-pointer hover:opacity-80">All Entities</UBadge>
			</NuxtLink>
			<NuxtLink to="/knowledge/registries/taxonomy">
				<UBadge color="orange" variant="subtle" size="sm" class="cursor-pointer hover:opacity-80">Taxonomy 6x6</UBadge>
			</NuxtLink>
			<NuxtLink to="/knowledge/registries/matrix">
				<UBadge color="purple" variant="subtle" size="sm" class="cursor-pointer hover:opacity-80">Entity Matrix</UBadge>
			</NuxtLink>
			<NuxtLink to="/knowledge/registries/species" data-testid="link-species-matrix">
				<UBadge color="pink" variant="subtle" size="sm" class="cursor-pointer hover:opacity-80">Species Matrix</UBadge>
			</NuxtLink>
			<NuxtLink to="/knowledge/registries/changelog">
				<UBadge color="gray" variant="subtle" size="sm" class="cursor-pointer hover:opacity-80">Changelog</UBadge>
			</NuxtLink>
		</div>

		<!-- Unified registry table: summaries + details -->
		<div ref="registriesTableRoot">
			<UTable :columns="columns" :rows="tableRows" @select="onRowClick">
				<template #stt-data="{ row }">
					<span class="text-xs text-gray-400">{{ row.stt }}</span>
				</template>
				<template #code-data="{ row }">
					<NuxtLink
						v-if="row._type === 'summary' && (row._virtualCode || row._link)"
						:to="row._link || `/knowledge/registries/${row._virtualCode}`"
						class="font-mono text-xs font-medium text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-200"
						@click.stop
					>{{ row.code }}</NuxtLink>
					<span v-else class="font-mono text-xs">{{ row.code }}</span>
				</template>
				<template #name-data="{ row }">
					<NuxtLink
						v-if="row._type === 'summary' && (row._virtualCode || row._link)"
						:to="row._link || `/knowledge/registries/${row._virtualCode}`"
						class="font-semibold text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-200"
						@click.stop
					>{{ row.name }}<span v-if="row._speciesCount" class="ml-2 text-xs font-normal text-gray-500">({{ row._speciesCount }} loài)</span></NuxtLink>
					<NuxtLink
						v-else-if="row._type === 'detail' && row.entity_type"
						:to="getRowLink(row)"
						class="text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-200"
						@click.stop
					>{{ row.name }}</NuxtLink>
					<span v-else>{{ row.name }}</span>
				</template>
				<template #composition_level-data="{ row }">
					<UBadge
						:color="(LEVEL_CONFIG[row.composition_level]?.color as any) || 'gray'"
						variant="subtle"
						size="xs"
					>
						{{ LEVEL_CONFIG[row.composition_level]?.label || row.composition_level }}
					</UBadge>
				</template>
				<template #record_count-data="{ row }">
					<span
						:class="row._type === 'summary' ? 'font-bold text-gray-900 dark:text-white' : 'font-medium'"
					>{{ row.record_count }}</span>
				</template>
				<template #thanh_phan-data="{ row }">
					<template v-if="row.code === 'CAT-017' && row._issueDetail">
						<span class="font-medium" :class="row._issueDetail.critical > 0 ? 'text-red-600 dark:text-red-400' : row._issueDetail.warning > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'">{{ row._issueDetail.group_count || 0 }} nhóm</span>
					</template>
					<template v-else-if="row.code === 'CAT-SPE'">
						<span class="font-medium text-pink-600 dark:text-pink-400">{{ compositionData.totalSpecies }} loài</span>
					</template>
					<template v-else-if="row._type === 'summary' && row._virtualCode && compositionData.byLevel?.[row.composition_level]">
						<span class="text-sm text-gray-600 dark:text-gray-400">
							{{ compositionData.byLevel[row.composition_level]?.speciesCount || 0 }} loài
						</span>
					</template>
					<template v-else-if="row._type === 'detail' && row.entity_type && compositionData.byCollection">
						<span class="text-xs text-gray-500">
							{{ getCollectionSpecies(row) }}
						</span>
					</template>
					<template v-else>
						<span class="text-gray-300 dark:text-gray-600">&mdash;</span>
					</template>
				</template>
				<template #delta_plus-data="{ row }">
					<span v-if="row.delta_plus > 0" class="font-medium text-emerald-600 dark:text-emerald-400">+{{ row.delta_plus }}</span>
				</template>
				<template #delta_minus-data="{ row }">
					<span v-if="row.delta_minus < 0" class="font-medium text-red-600 dark:text-red-400">{{ row.delta_minus }}</span>
				</template>
				<template #orphan_count-data="{ row }">
					<span
						v-if="row.orphan_count > 0"
						class="font-medium text-amber-600 dark:text-amber-400"
					>{{ row.orphan_count }}</span>
					<span v-else class="text-gray-400">0</span>
				</template>
				<template #verified-data="{ row }">
					<span v-if="row.verified">✅</span>
					<span v-else>❌</span>
				</template>
			</UTable>
		</div>

		<!-- Nhật ký hệ thống — Log entries tách riêng -->
		<div v-if="registryData.logs && registryData.logs.length > 0" class="mt-10">
			<h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-white">Nhật ký hệ thống</h2>
			<UTable :columns="logColumns" :rows="logRows">
				<template #name-data="{ row }">
					<NuxtLink
						v-if="row.entity_type"
						:to="`/knowledge/registries/${row.entity_type}`"
						class="text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-200"
						@click.stop
					>{{ row.name }}</NuxtLink>
					<span v-else>{{ row.name }}</span>
				</template>
				<template #record_count-data="{ row }">
					<span class="font-medium">{{ row.record_count }}</span>
				</template>
				<template #orphan_count-data="{ row }">
					<span v-if="row.orphan_count > 0" class="font-medium text-amber-600 dark:text-amber-400">{{ row.orphan_count }}</span>
					<span v-else class="text-gray-400">0</span>
				</template>
			</UTable>
		</div>

		<!-- Nhật ký thay đổi gần đây -->
		<div v-if="recentChangelog && recentChangelog.length > 0" class="mt-10">
			<div class="mb-4 flex items-center justify-between">
				<h2 class="text-xl font-semibold text-gray-900 dark:text-white">Nhật ký thay đổi gần đây</h2>
				<NuxtLink
					to="/knowledge/registries/changelog"
					class="text-sm text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-200"
				>
					Xem toàn bộ &rarr;
				</NuxtLink>
			</div>
			<UTable :columns="changelogColumns" :rows="changelogRows">
				<template #stt-data="{ row }">
					<span class="text-xs text-gray-400">{{ row.stt }}</span>
				</template>
				<template #code-data="{ row }">
					<template v-if="row.action === 'deleted'">
						<span class="font-mono text-xs line-through text-gray-400">{{ row.code }}</span>
					</template>
					<NuxtLink
						v-else-if="row.code && row.entityType"
						:to="`/knowledge/registries/${row.entityType}/${row.code}`"
						class="font-mono text-xs text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-200"
					>{{ row.code }}</NuxtLink>
					<span v-else class="font-mono text-xs text-gray-400">—</span>
				</template>
				<template #name-data="{ row }">
					<template v-if="row.action === 'deleted'">
						<span class="text-sm line-through text-gray-400">{{ row.name }}</span>
					</template>
					<span v-else class="text-sm">{{ row.name || '—' }}</span>
				</template>
				<template #level-data="{ row }">
					<span class="text-xs">{{ COMPOSITION_LEVEL_DISPLAY[row.level]?.emoji || '' }} {{ COMPOSITION_LEVEL_DISPLAY[row.level]?.label || row.level }}</span>
				</template>
				<template #action-data="{ row }">
					<UBadge
						v-if="row.action === 'created'"
						color="green"
						variant="subtle"
						size="xs"
					>🟢 +</UBadge>
					<UBadge
						v-else-if="row.action === 'updated'"
						color="yellow"
						variant="subtle"
						size="xs"
					>🟡 ~</UBadge>
					<UBadge
						v-else-if="row.action === 'deleted'"
						color="red"
						variant="subtle"
						size="xs"
					>🔴 -</UBadge>
					<span v-else class="text-xs text-gray-400">—</span>
				</template>
			</UTable>
		</div>
	</div>
</template>
