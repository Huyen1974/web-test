<script setup lang="ts">
/**
 * MatrixView — TPL-002 DirectusMatrix (Dieu 28 v2.0)
 *
 * Reads pivot_results JSONB via Directus API -> renders 2D matrix table.
 * Config-driven: row_axis x col_axis from matrix_spec.
 * New matrix = INSERT config into pivot_definitions. Zero code.
 *
 * Usage:
 *   <TemplatesMatrixView :code="'MTX-L1-OVERVIEW'" :config="matrixSpec" :name="matrixName" />
 */
import { readItems } from '@directus/sdk';

interface MatrixSpec {
	row_axis: string;
	col_axis?: string | null;
	source_table?: string;
	agg?: string;
	filter?: Record<string, any>;
	display_at_layers?: string[];
}

const props = defineProps<{
	code: string;
	config: MatrixSpec;
	name?: string;
}>();

const { $directus } = useNuxtApp();

// Fetch pivot_results for this matrix code
const { data: rawRows, status, error } = useAsyncData(
	`matrix-${props.code}`,
	async () => {
		const items = await $directus.request(
			readItems('pivot_results' as any, {
				filter: { pivot_code: { _eq: props.code } },
				fields: ['id', 'pivot_code', 'group_values', 'metric_values'],
				limit: -1,
			}),
		);
		return items as any[];
	},
	{ default: () => [] },
);

// Transform pivot_results into matrix rows
// Format: { row: "atom", columns: { excluded: 5584, governed: 1814 }, total: 24858 }
const matrixData = computed(() => {
	const rows = rawRows.value || [];
	// Filter out summary rows (empty group_values)
	const dataRows = rows.filter((r: any) => r.group_values && Object.keys(r.group_values).length > 0 && r.group_values.row);
	return dataRows.map((r: any) => ({
		row: r.group_values.row,
		columns: r.metric_values?.columns || {},
		total: r.metric_values?.total ?? 0,
	}));
});

// Extract unique column keys from all rows
const columnKeys = computed(() => {
	const keys = new Set<string>();
	for (const row of matrixData.value) {
		for (const k of Object.keys(row.columns)) {
			keys.add(k);
		}
	}
	return Array.from(keys).sort();
});

// Is this a 2D matrix (has col_axis) or 1D (single count column)?
const is2D = computed(() => props.config.col_axis && columnKeys.value.length > 0);

// Column totals
const columnTotals = computed(() => {
	const totals: Record<string, number> = {};
	for (const key of columnKeys.value) {
		totals[key] = matrixData.value.reduce((sum: number, row: any) => sum + (Number(row.columns[key]) || 0), 0);
	}
	return totals;
});

// Grand total
const grandTotal = computed(() =>
	matrixData.value.reduce((sum: number, row: any) => sum + (Number(row.total) || 0), 0),
);

// Sort state
const sortField = ref<string>('');
const sortDir = ref<'asc' | 'desc'>('desc');

const sortedData = computed(() => {
	const data = [...matrixData.value];
	if (!sortField.value) return data;
	const dir = sortDir.value === 'asc' ? 1 : -1;
	const key = sortField.value;
	return data.sort((a, b) => {
		const va = key === 'row' ? a.row : key === 'total' ? a.total : (a.columns[key] || 0);
		const vb = key === 'row' ? b.row : key === 'total' ? b.total : (b.columns[key] || 0);
		if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
		return String(va).localeCompare(String(vb)) * dir;
	});
});

function toggleSort(field: string) {
	if (sortField.value === field) {
		sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
	} else {
		sortField.value = field;
		sortDir.value = 'desc';
	}
}

function formatNumber(n: number | undefined): string {
	if (n === undefined || n === null) return '—';
	return n.toLocaleString('vi-VN');
}
</script>

<template>
	<div class="mb-8">
		<!-- Header -->
		<div v-if="name" class="mb-3">
			<h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ name }}</h3>
			<p class="text-xs text-gray-500 dark:text-gray-400">
				{{ config.row_axis }}<span v-if="is2D"> &times; {{ config.col_axis }}</span>
				&mdash; {{ code }}
			</p>
		</div>

		<!-- Error state -->
		<div
			v-if="error"
			class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
		>
			Loi tai du lieu ma tran: {{ code }}
		</div>

		<!-- Loading state -->
		<div v-else-if="status === 'pending'" class="py-6 text-center text-gray-400">
			Dang tai ma tran...
		</div>

		<!-- Empty state -->
		<div
			v-else-if="matrixData.length === 0"
			class="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800"
		>
			Chua co du lieu ma tran cho {{ code }}
		</div>

		<!-- TABLE-EXCEPTION: TPL-002 requires native HTML table for 2D matrix (row × col) layout. UTable cannot render dynamic columns from JSONB. -->
		<div v-else class="overflow-x-auto">
			<table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
				<thead class="bg-gray-50 dark:bg-gray-800">
					<tr>
						<th
							class="cursor-pointer px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
							@click="toggleSort('row')"
						>
							{{ config.row_axis }}
							<span v-if="sortField === 'row'" class="ml-1">{{ sortDir === 'asc' ? '↑' : '↓' }}</span>
						</th>
						<template v-if="is2D">
							<th
								v-for="col in columnKeys"
								:key="col"
								class="cursor-pointer px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
								@click="toggleSort(col)"
							>
								{{ col }}
								<span v-if="sortField === col" class="ml-1">{{ sortDir === 'asc' ? '↑' : '↓' }}</span>
							</th>
						</template>
						<th
							class="cursor-pointer px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
							@click="toggleSort('total')"
						>
							Total
							<span v-if="sortField === 'total'" class="ml-1">{{ sortDir === 'asc' ? '↑' : '↓' }}</span>
						</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
					<tr v-for="row in sortedData" :key="row.row" class="hover:bg-gray-50 dark:hover:bg-gray-800/50">
						<td class="whitespace-nowrap px-3 py-2 text-sm font-medium text-gray-900 dark:text-white">
							{{ row.row }}
						</td>
						<template v-if="is2D">
							<td
								v-for="col in columnKeys"
								:key="col"
								class="whitespace-nowrap px-3 py-2 text-right text-sm"
								:class="row.columns[col] ? 'text-gray-900 dark:text-gray-100' : 'text-gray-300 dark:text-gray-600'"
							>
								{{ formatNumber(row.columns[col]) }}
							</td>
						</template>
						<td class="whitespace-nowrap px-3 py-2 text-right text-sm font-semibold text-gray-900 dark:text-white">
							{{ formatNumber(row.total) }}
						</td>
					</tr>
				</tbody>
				<!-- Totals footer -->
				<tfoot class="bg-gray-100 dark:bg-gray-800">
					<tr class="font-semibold">
						<td class="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">TOTAL</td>
						<template v-if="is2D">
							<td
								v-for="col in columnKeys"
								:key="col"
								class="px-3 py-2 text-right text-sm text-gray-700 dark:text-gray-300"
							>
								{{ formatNumber(columnTotals[col]) }}
							</td>
						</template>
						<td class="px-3 py-2 text-right text-sm font-bold text-gray-900 dark:text-white">
							{{ formatNumber(grandTotal) }}
						</td>
					</tr>
				</tfoot>
			</table>
		</div>
	</div>
</template>
