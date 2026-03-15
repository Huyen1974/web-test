<script setup lang="ts">
import { readItems } from '@directus/sdk';

const route = useRoute();
const facetCode = computed(() => route.params.facetCode as string);
const level = computed(() => route.params.level as string);

const { $directus } = useNuxtApp();

const LEVEL_DISPLAY: Record<string, string> = {
	atom: 'Nguyên tử', molecule: 'Phân tử', compound: 'Hợp chất',
	material: 'Vật liệu', product: 'Sản phẩm', building: 'Công trình',
};

const { data: pageData } = useAsyncData(
	`taxonomy-labels-${facetCode.value}-${level.value}`,
	async () => {
		try {
			const facets = await $directus.request(
				readItems('taxonomy_facets' as any, {
					filter: { code: { _eq: facetCode.value } },
					fields: ['id', 'code', 'name'],
					limit: 1,
				}),
			);
			const facet = (facets as any[])?.[0];
			if (!facet) return { facet: null, labels: [] };

			const allLabels = await $directus.request(
				readItems('taxonomy' as any, {
					filter: { facet_id: { _eq: facet.id }, status: { _eq: 'active' } },
					fields: ['code', 'name', 'name_en', 'depth', 'parent_id', 'scope', 'description'],
					sort: ['sort'],
					limit: -1,
				}),
			);

			// Filter by scope containing this level
			const filtered = (allLabels as any[]).filter((l: any) => {
				const scopes = l.scope || [];
				return scopes.includes(level.value);
			});

			return { facet, labels: filtered };
		} catch {
			return { facet: null, labels: [] };
		}
	},
);

const columns = [
	{ key: 'code', label: 'Mã' },
	{ key: 'name', label: 'Tên' },
	{ key: 'name_en', label: 'Tên EN' },
	{ key: 'depth', label: 'Tầng' },
	{ key: 'description', label: 'Mô tả' },
];

const rows = computed(() =>
	(pageData.value?.labels || []).map((l: any, idx: number) => ({
		stt: idx + 1,
		code: l.code,
		name: l.depth > 0 ? `  └ ${l.name}` : l.name,
		name_en: l.name_en || '',
		depth: l.depth,
		description: l.description || '',
	})),
);

definePageMeta({ title: 'Nhãn theo chiều × lớp' });
useHead({
	title: computed(() => `${pageData.value?.facet?.name || facetCode.value} × ${LEVEL_DISPLAY[level.value] || level.value}`),
});
</script>

<template>
	<div class="container mx-auto px-4 py-8">
		<div class="mb-8">
			<NuxtLink
				to="/knowledge/registries/taxonomy"
				class="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
			>
				&larr; Ma trận 6×6
			</NuxtLink>
			<div class="mb-2">
				<UBadge color="primary" variant="solid" size="sm">LAYER 3</UBadge>
			</div>
			<h1 class="text-2xl font-bold text-gray-900 dark:text-white">
				{{ pageData?.facet?.name || facetCode }} × {{ LEVEL_DISPLAY[level] || level }}
			</h1>
			<p class="mt-1 text-gray-500 dark:text-gray-400">
				{{ rows.length }} nhãn khả dụng cho lớp {{ LEVEL_DISPLAY[level] || level }}
			</p>
		</div>

		<UTable v-if="rows.length > 0" :columns="columns" :rows="rows">
			<template #cell-code="{ row }">
				<span class="font-mono text-xs">{{ row.code }}</span>
			</template>
			<template #cell-depth="{ row }">
				<UBadge :color="row.depth === 0 ? 'green' : 'blue'" variant="subtle" size="xs">{{ row.depth }}</UBadge>
			</template>
		</UTable>
		<p v-else class="text-gray-400">Không có nhãn cho tổ hợp này.</p>
	</div>
</template>
