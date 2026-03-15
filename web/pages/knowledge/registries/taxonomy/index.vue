<script setup lang="ts">
import { readItems } from '@directus/sdk';

definePageMeta({
	title: 'Nhãn hệ thống — Ma trận 6×6',
	description: 'Taxonomy matrix — 6 chiều × 6 lớp cấu tạo',
});

const { $directus } = useNuxtApp();

const LEVELS = ['atom', 'molecule', 'compound', 'material', 'product', 'building'];
const LEVEL_DISPLAY: Record<string, string> = {
	atom: 'Nguyên tử',
	molecule: 'Phân tử',
	compound: 'Hợp chất',
	material: 'Vật liệu',
	product: 'Sản phẩm',
	building: 'Công trình',
};
const REQ_DISPLAY: Record<string, string> = {
	mandatory: '★',
	optional: '○',
	not_applicable: '—',
};

const { data: matrixData } = useAsyncData('taxonomy-matrix', async () => {
	try {
		const [facets, matrix, labelCounts] = await Promise.all([
			$directus.request(
				readItems('taxonomy_facets' as any, {
					fields: ['id', 'code', 'name', 'cardinality'],
					sort: ['sort'],
					limit: -1,
				}),
			),
			$directus.request(
				readItems('taxonomy_matrix' as any, {
					fields: ['facet_id', 'composition_level', 'requirement'],
					limit: -1,
				}),
			),
			$directus.request(
				readItems('taxonomy' as any, {
					fields: ['facet_id', 'scope'],
					filter: { status: { _eq: 'active' } },
					limit: -1,
				}),
			),
		]);

		// Build matrix lookup: facet_id → level → requirement
		const matrixMap = new Map<string, string>();
		for (const m of matrix as any[]) {
			matrixMap.set(`${m.facet_id}-${m.composition_level}`, m.requirement);
		}

		// Count labels per facet×level (using scope array)
		const countMap = new Map<string, number>();
		for (const label of labelCounts as any[]) {
			const scopes = label.scope || [];
			for (const level of scopes) {
				const key = `${label.facet_id}-${level}`;
				countMap.set(key, (countMap.get(key) || 0) + 1);
			}
		}

		return {
			facets: facets as any[],
			matrixMap,
			countMap,
		};
	} catch {
		return { facets: [], matrixMap: new Map(), countMap: new Map() };
	}
});

const columns = computed(() => [
	{ key: 'facet', label: 'Chiều' },
	...LEVELS.map((l) => ({ key: l, label: LEVEL_DISPLAY[l] })),
]);

const rows = computed(() => {
	if (!matrixData.value) return [];
	return matrixData.value.facets.map((f: any) => {
		const row: any = {
			facet: `${f.code} ${f.name}`,
			facet_code: f.code,
			cardinality: f.cardinality,
		};
		for (const level of LEVELS) {
			const req = matrixData.value!.matrixMap.get(`${f.id}-${level}`) || 'not_applicable';
			const count = matrixData.value!.countMap.get(`${f.id}-${level}`) || 0;
			row[level] = { req, count };
		}
		return row;
	});
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
			<div class="mb-2">
				<UBadge color="primary" variant="solid" size="sm">LAYER 2</UBadge>
			</div>
			<h1 class="text-3xl font-bold text-gray-900 dark:text-white">Nhãn hệ thống — Ma trận 6×6</h1>
			<p class="mt-2 text-gray-600 dark:text-gray-400">
				6 chiều phân loại × 6 lớp cấu tạo. ★ = bắt buộc, ○ = tuỳ chọn, — = không áp dụng. Số trong ngoặc = nhãn khả dụng.
			</p>
		</div>

		<UTable :columns="columns" :rows="rows">
			<template #cell-facet="{ row }">
				<div>
					<span class="font-medium text-gray-900 dark:text-white">{{ row.facet }}</span>
					<UBadge
						:color="row.cardinality === 'multiple' ? 'blue' : 'gray'"
						variant="subtle"
						size="xs"
						class="ml-2"
					>{{ row.cardinality === 'multiple' ? 'nhiều' : '1' }}</UBadge>
				</div>
			</template>
			<template v-for="level in LEVELS" :key="level" #[`cell-${level}`]="{ row }">
				<NuxtLink
					v-if="row[level].count > 0"
					:to="`/knowledge/registries/taxonomy/${row.facet_code}/${level}`"
					class="inline-flex items-center gap-1 hover:text-primary-600 dark:hover:text-primary-400"
				>
					<span
						:class="{
							'text-lg font-bold text-amber-600 dark:text-amber-400': row[level].req === 'mandatory',
							'text-gray-500 dark:text-gray-400': row[level].req === 'optional',
							'text-gray-300 dark:text-gray-600': row[level].req === 'not_applicable',
						}"
					>{{ REQ_DISPLAY[row[level].req] }}</span>
					<span class="text-xs text-gray-400">({{ row[level].count }})</span>
				</NuxtLink>
				<span v-else
					:class="{
						'text-lg font-bold text-amber-600 dark:text-amber-400': row[level].req === 'mandatory',
						'text-gray-500 dark:text-gray-400': row[level].req === 'optional',
						'text-gray-300 dark:text-gray-600': row[level].req === 'not_applicable',
					}"
				>{{ REQ_DISPLAY[row[level].req] }}</span>
			</template>
		</UTable>
	</div>
</template>
