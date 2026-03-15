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
};

const { $directus } = useNuxtApp();

// taxonomy count now comes from v_registry_counts (CAT-018) — same as other collections

// Composition level labels + colors
const LEVEL_CONFIG: Record<string, { label: string; color: string }> = {
	atom: { label: 'Nguyên tử', color: 'green' },
	molecule: { label: 'Phân tử', color: 'blue' },
	compound: { label: 'Hợp chất', color: 'purple' },
	material: { label: 'Vật liệu', color: 'orange' },
	product: { label: 'Sản phẩm', color: 'amber' },
	building: { label: 'Công trình', color: 'indigo' },
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

// Fetch v_registry_counts + meta_catalog to build unified table
const { data: registryData } = useAsyncData(
	'registry-unified',
	async () => {
		try {
			const [counts, catalog] = await Promise.all([
				$directus.request(
					readItems('v_registry_counts' as any, {
						fields: ['cat_code', 'entity_type', 'record_count', 'orphan_count', 'prev_count', 'composition_level'],
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
				const delta = (r.record_count || 0) - (r.prev_count || 0);
				details.push({
					_type: 'detail',
					code: r.cat_code,
					name: cat?.name || r.entity_type,
					entity_type: r.entity_type,
					composition_level: r.composition_level || 'atom',
					record_count: r.record_count || 0,
					orphan_count: r.orphan_count || 0,
					delta_plus: delta > 0 ? delta : 0,
					delta_minus: delta < 0 ? delta : 0,
					verified: true,
				});
			}

			// Build summary rows per composition_level
			const levels = ['atom', 'molecule', 'compound', 'material', 'product', 'building'];
			const summaries: any[] = [];
			for (const level of levels) {
				const levelDetails = details.filter((d) => d.composition_level === level);
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

// UTable columns — STT first, "Lớp" instead of "Tầng"
const columns = [
	{ key: 'stt', label: 'STT' },
	{ key: 'code', label: 'Code' },
	{ key: 'name', label: 'Tên' },
	{ key: 'composition_level', label: 'Lớp' },
	{ key: 'record_count', label: 'Số lượng' },
	{ key: 'delta_plus', label: '+' },
	{ key: 'delta_minus', label: '-' },
	{ key: 'orphan_count', label: 'Mồ côi' },
	{ key: 'verified', label: 'Xác minh' },
];

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
	return [...data.summaries, ...data.details, coverageRow].map((row, idx) => ({
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

		<!-- Unified registry table: summaries + details -->
		<UTable :columns="columns" :rows="tableRows" @select="onRowClick">
			<template #cell-stt="{ row }">
				<span class="text-xs text-gray-400">{{ row.stt }}</span>
			</template>
			<template #cell-code="{ row }">
				<NuxtLink
					v-if="row._type === 'summary' && row._virtualCode"
					:to="`/knowledge/registries/${row._virtualCode}`"
					class="font-mono text-xs font-medium text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-200"
					@click.stop
				>{{ row.code }}</NuxtLink>
				<span v-else class="font-mono text-xs">{{ row.code }}</span>
			</template>
			<template #cell-name="{ row }">
				<NuxtLink
					v-if="row._type === 'summary' && row._virtualCode"
					:to="`/knowledge/registries/${row._virtualCode}`"
					class="font-semibold text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-200"
					@click.stop
				>{{ row.name }}</NuxtLink>
				<NuxtLink
					v-else-if="row._type === 'detail' && row.entity_type"
					:to="getRowLink(row)"
					class="text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-200"
					@click.stop
				>{{ row.name }}</NuxtLink>
				<span v-else>{{ row.name }}</span>
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
			<template #cell-verified="{ row }">
				<span v-if="row.verified">✅</span>
				<span v-else>❌</span>
			</template>
		</UTable>

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
				<template #cell-stt="{ row }">
					<span class="text-xs text-gray-400">{{ row.stt }}</span>
				</template>
				<template #cell-code="{ row }">
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
				<template #cell-name="{ row }">
					<template v-if="row.action === 'deleted'">
						<span class="text-sm line-through text-gray-400">{{ row.name }}</span>
					</template>
					<span v-else class="text-sm">{{ row.name || '—' }}</span>
				</template>
				<template #cell-level="{ row }">
					<span class="text-xs">{{ COMPOSITION_LEVEL_DISPLAY[row.level]?.emoji || '' }} {{ COMPOSITION_LEVEL_DISPLAY[row.level]?.label || row.level }}</span>
				</template>
				<template #cell-action="{ row }">
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
