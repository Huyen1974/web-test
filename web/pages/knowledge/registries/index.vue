<script setup lang="ts">
import { readItems, aggregate } from '@directus/sdk';

definePageMeta({
	title: 'Danh mục hệ thống',
	description: 'Meta-Catalog — Danh mục sống 3 tầng',
});

function getRegistryLink(item: any) {
	if (!item?.entity_type) return '/knowledge/registries';
	return `/knowledge/registries/${item.entity_type}`;
}

function formatAction(action: string) {
	if (!action) return '';
	if (action.includes('create')) return 'created';
	if (action.includes('update')) return 'updated';
	if (action.includes('delete')) return 'deleted';
	return action;
}

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

const { $directus } = useNuxtApp();

// Fetch summary stats from meta_catalog
const { data: summary } = useAsyncData(
	'registry-summary',
	async () => {
		try {
			const items = await $directus.request(
				readItems('meta_catalog' as any, {
					fields: ['record_count', 'orphan_count', 'status'],
					limit: -1,
				}),
			);
			const entries = items as any[];
			const active = entries.filter((e) => e.status === 'published' || e.status === 'active');
			return {
				totalAtoms: active.reduce((sum, e) => sum + (e.record_count || 0), 0),
				totalCategories: active.length,
				totalOrphans: active.reduce((sum, e) => sum + (e.orphan_count || 0), 0),
			};
		} catch {
			return null;
		}
	},
	{ default: () => null },
);

// Fetch recent changelog entries
const { data: recentChanges } = useAsyncData(
	'registry-changelog',
	async () => {
		try {
			const items = await $directus.request(
				readItems('registry_changelog' as any, {
					fields: ['id', 'timestamp', 'entity_type', 'entity_code', 'entity_name', 'action', 'alert_level'],
					sort: ['-timestamp'],
					limit: 10,
				}),
			);
			return items as any[];
		} catch {
			return null;
		}
	},
	{ default: () => null },
);

// UTable config for changelog
const changelogColumns = [
	{ key: 'time', label: 'Thời gian' },
	{ key: 'type', label: 'Loại' },
	{ key: 'entity', label: 'Thực thể' },
	{ key: 'action', label: 'Hành động' },
	{ key: 'alert', label: 'Cảnh báo' },
];

const changelogRows = computed(() =>
	(recentChanges.value || []).map((e: any) => ({
		time: formatTime(e.timestamp),
		type: e.entity_type,
		code: e.entity_code,
		entityName: e.entity_name,
		entity: e.entity_code || e.entity_name || '—',
		action: formatAction(e.action),
		alert: e.alert_level,
	})),
);

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
				<div class="mt-1 text-sm text-gray-500 dark:text-gray-400">nguyên tử</div>
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
		</SharedDirectusTable>

		<!-- Recent Changes -->
		<div v-if="recentChanges && recentChanges.length > 0" class="mt-10">
			<h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-white">Thay đổi Gần đây</h2>
			<UTable
				:rows="changelogRows"
				:columns="changelogColumns"
			>
				<template #cell-time="{ row }">
					<span class="text-gray-500 dark:text-gray-400">{{ row.time }}</span>
				</template>
				<template #cell-entity="{ row }">
					<span v-if="row.code" class="font-medium text-gray-900 dark:text-white">{{ row.code }}</span>
					<span v-if="row.entityName" class="ml-1 text-gray-500 dark:text-gray-400">{{ row.entityName }}</span>
					<span v-if="!row.code && !row.entityName" class="italic text-gray-400">&mdash;</span>
				</template>
				<template #cell-action="{ row }">
					<span
						class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
						:class="{
							'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300': row.action === 'created',
							'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300': row.action === 'updated',
							'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300': row.action === 'deleted',
						}"
					>
						{{ row.action }}
					</span>
				</template>
				<template #cell-alert="{ row }">
					<UBadge v-if="row.alert === 'warning'" color="yellow" variant="subtle" size="xs">warning</UBadge>
					<UBadge v-else-if="row.alert === 'critical'" color="red" variant="subtle" size="xs">critical</UBadge>
				</template>
			</UTable>
		</div>
	</div>
</template>
