<script setup lang="ts">
import { readItems } from '@directus/sdk';

definePageMeta({ title: 'Nhật ký thay đổi Registry' });

const { $directus } = useNuxtApp();

const LEVEL_CONFIG: Record<string, { label: string; color: string }> = {
	atom: { label: 'Nguyên tử', color: 'green' },
	molecule: { label: 'Phân tử', color: 'blue' },
	compound: { label: 'Hợp chất', color: 'purple' },
	material: { label: 'Vật liệu', color: 'orange' },
	product: { label: 'Sản phẩm', color: 'amber' },
	building: { label: 'Công trình', color: 'indigo' },
};

const page = ref(1);
const PAGE_SIZE = 50;

function formatAction(action: string): 'create' | 'update' | 'delete' {
	if (!action) return 'update';
	if (action.includes('create')) return 'create';
	if (action.includes('delete')) return 'delete';
	return 'update';
}

function formatTimestamp(ts: string) {
	if (!ts) return '';
	const d = new Date(ts);
	const day = String(d.getDate()).padStart(2, '0');
	const month = String(d.getMonth() + 1).padStart(2, '0');
	const hour = String(d.getHours()).padStart(2, '0');
	const min = String(d.getMinutes()).padStart(2, '0');
	return `${day}/${month} ${hour}:${min}`;
}

const { data: changelogData } = useAsyncData(
	'changelog-full',
	async () => {
		try {
			const [entries, catalog] = await Promise.all([
				$directus.request(
					readItems('registry_changelog' as any, {
						fields: ['id', 'timestamp', 'entity_type', 'entity_code', 'entity_name', 'action'],
						sort: ['-timestamp'],
						limit: 1000,
					}),
				),
				$directus.request(
					readItems('meta_catalog' as any, {
						fields: ['entity_type', 'composition_level'],
						filter: { identity_class: { _eq: 'managed' } },
						limit: -1,
					}),
				),
			]);

			const levelMap = new Map<string, string>();
			for (const c of catalog as any[]) {
				levelMap.set(c.entity_type, c.composition_level || 'atom');
			}

			return (entries as any[]).map((e) => ({
				id: e.id,
				timestamp: e.timestamp,
				entity_type: e.entity_type || '',
				entity_code: e.entity_code || '',
				entity_name: e.entity_name || '',
				action: formatAction(e.action),
				composition_level: levelMap.get(e.entity_type) || 'atom',
			}));
		} catch {
			return [];
		}
	},
	{ default: () => [] },
);

const columns = [
	{ key: 'stt', label: 'STT' },
	{ key: 'time', label: 'Thời gian' },
	{ key: 'code', label: 'Mã' },
	{ key: 'name', label: 'Tên' },
	{ key: 'level', label: 'Lớp' },
	{ key: 'change', label: '+/-' },
];

const pagedRows = computed(() => {
	const start = (page.value - 1) * PAGE_SIZE;
	const slice = changelogData.value.slice(start, start + PAGE_SIZE);
	return slice.map((e, idx) => ({
		...e,
		stt: start + idx + 1,
		time: formatTimestamp(e.timestamp),
		code: e.entity_code && e.entity_code !== 'undefined' ? e.entity_code : '—',
		name: e.entity_name && e.entity_name !== 'undefined' ? e.entity_name : '—',
		level: e.composition_level,
		change: e.action,
		isDeleted: e.action === 'delete',
		link: e.action !== 'delete' && e.entity_type && e.entity_code && e.entity_code !== 'undefined'
			? `/knowledge/registries/${e.entity_type}/${e.entity_code}`
			: e.entity_type
				? `/knowledge/registries/${e.entity_type}`
				: null,
	}));
});

const totalPages = computed(() => Math.ceil(changelogData.value.length / PAGE_SIZE));
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
			<h1 class="text-3xl font-bold text-gray-900 dark:text-white">Nhật ký thay đổi Registry</h1>
			<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
				{{ changelogData.length }} thay đổi — Trang {{ page }}/{{ totalPages }}
			</p>
		</div>

		<UTable :columns="columns" :rows="pagedRows">
			<template #cell-stt="{ row }">
				<span class="text-xs text-gray-400">{{ row.stt }}</span>
			</template>
			<template #cell-code="{ row }">
				<NuxtLink
					v-if="!row.isDeleted && row.link"
					:to="row.link"
					class="font-mono text-xs text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-200"
				>{{ row.code }}</NuxtLink>
				<span
					v-else-if="row.isDeleted"
					class="font-mono text-xs text-gray-400 line-through"
					:title="`Đã xóa ngày ${row.time}`"
				>{{ row.code }}</span>
				<span v-else class="font-mono text-xs">{{ row.code }}</span>
			</template>
			<template #cell-name="{ row }">
				<NuxtLink
					v-if="!row.isDeleted && row.link"
					:to="row.link"
					class="text-sm text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-200"
				>{{ row.name }}</NuxtLink>
				<span
					v-else-if="row.isDeleted"
					class="text-sm text-gray-400 line-through"
					:title="`Đã xóa ngày ${row.time}`"
				>{{ row.name }}</span>
				<span v-else class="text-sm">{{ row.name }}</span>
			</template>
			<template #cell-level="{ row }">
				<UBadge
					:color="(LEVEL_CONFIG[row.level]?.color as any) || 'gray'"
					variant="subtle"
					size="xs"
				>
					{{ LEVEL_CONFIG[row.level]?.label || row.level }}
				</UBadge>
			</template>
			<template #cell-change="{ row }">
				<UBadge
					v-if="row.change === 'create'"
					color="green"
					variant="subtle"
					size="xs"
				>+</UBadge>
				<UBadge
					v-else-if="row.change === 'update'"
					color="yellow"
					variant="subtle"
					size="xs"
				>~</UBadge>
				<UBadge
					v-else-if="row.change === 'delete'"
					color="red"
					variant="subtle"
					size="xs"
				>-</UBadge>
			</template>
		</UTable>

		<!-- Pagination -->
		<div v-if="totalPages > 1" class="mt-6 flex justify-center">
			<UPagination v-model="page" :total="changelogData.length" :page-count="PAGE_SIZE" />
		</div>
	</div>
</template>
