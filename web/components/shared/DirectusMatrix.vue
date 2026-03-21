<script setup lang="ts">
/**
 * DirectusMatrix — Config-driven matrix component (TPL-002, Điều 28)
 *
 * Thin wrapper on UTable. Fetches data from Directus API based on config.
 * New matrix = new config object. Zero code.
 *
 * Usage:
 *   <SharedDirectusMatrix :config="speciesMatrixConfig" />
 */
import { readItems } from '@directus/sdk';

export interface MatrixColumn {
	key: string;
	label: string;
	type?: 'number' | 'text' | 'badge';
	badgeColor?: string;
	sortable?: boolean;
}

export interface MatrixConfig {
	title: string;
	description?: string;
	/** Directus collection name — used when fetching via Directus SDK */
	collection?: string;
	/** Server API URL — used instead of Directus SDK (e.g., '/api/registry/species-matrix') */
	dataUrl?: string;
	/** Response key for dataUrl mode (default: 'data') */
	dataKey?: string;
	fields?: string[];
	filter?: Record<string, any>;
	sort?: string[];
	columns: MatrixColumn[];
	rowKey: string;
	rowLabel: string;
	features?: {
		sortable?: boolean;
		searchable?: boolean;
		totalsRow?: boolean;
	};
}

const props = defineProps<{
	config: MatrixConfig;
}>();

const { $directus } = useNuxtApp();

const searchQuery = ref('');

const { data: rawData, status } = useAsyncData(
	`matrix-${props.config.collection || props.config.dataUrl}`,
	async () => {
		try {
			if (props.config.dataUrl) {
				// Server API mode
				const resp = await $fetch<any>(props.config.dataUrl);
				const key = props.config.dataKey || 'data';
				return (resp?.[key] || resp || []) as any[];
			}
			// Directus SDK mode
			const items = await $directus.request(
				readItems(props.config.collection as any, {
					fields: props.config.fields || [],
					filter: props.config.filter || {},
					sort: props.config.sort || [],
					limit: -1,
				}),
			);
			return items as any[];
		} catch {
			return [];
		}
	},
	{ default: () => [] },
);

// UTable columns: STT + configured columns
const tableColumns = computed(() => {
	const cols: any[] = [{ key: 'stt', label: 'STT', sortable: false }];
	for (const col of props.config.columns) {
		cols.push({
			key: col.key,
			label: col.label,
			sortable: col.sortable !== false,
		});
	}
	return cols;
});

// Sort state
const sortField = ref('');
const sortDir = ref<'asc' | 'desc'>('desc');

// Filtered + sorted rows
const tableRows = computed(() => {
	let items = rawData.value || [];

	// Search filter
	if (searchQuery.value) {
		const q = searchQuery.value.toLowerCase();
		items = items.filter((item: any) => {
			const key = String(item[props.config.rowKey] || '').toLowerCase();
			const label = String(item[props.config.rowLabel] || '').toLowerCase();
			return key.includes(q) || label.includes(q);
		});
	}

	// Sort
	if (sortField.value) {
		const dir = sortDir.value === 'asc' ? 1 : -1;
		const key = sortField.value;
		items = [...items].sort((a, b) => {
			const va = a[key];
			const vb = b[key];
			if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
			return String(va).localeCompare(String(vb)) * dir;
		});
	}

	return items.map((item: any, idx: number) => ({
		...item,
		stt: idx + 1,
	}));
});

// Totals row
const totalsRow = computed(() => {
	if (!props.config.features?.totalsRow) return null;
	const items = rawData.value || [];
	const totals: Record<string, any> = { stt: '', [props.config.rowKey]: 'TOTAL' };
	for (const col of props.config.columns) {
		if (col.type === 'number') {
			totals[col.key] = items.reduce((sum: number, item: any) => sum + (Number(item[col.key]) || 0), 0);
		} else {
			totals[col.key] = '';
		}
	}
	return totals;
});

function onSort(col: { key: string }) {
	if (sortField.value === col.key) {
		sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
	} else {
		sortField.value = col.key;
		sortDir.value = 'desc';
	}
}
</script>

<template>
	<div>
		<div v-if="config.title" class="mb-4">
			<h2 class="text-xl font-semibold text-gray-900 dark:text-white">{{ config.title }}</h2>
			<p v-if="config.description" class="mt-1 text-sm text-gray-600 dark:text-gray-400">
				{{ config.description }}
			</p>
		</div>

		<!-- Search -->
		<div v-if="config.features?.searchable" class="mb-4">
			<UInput
				v-model="searchQuery"
				placeholder="Tìm kiếm..."
				size="sm"
				class="max-w-xs"
			/>
		</div>

		<!-- Loading state -->
		<div v-if="status === 'pending'" class="py-8 text-center text-gray-500">
			Đang tải...
		</div>

		<!-- Matrix table -->
		<UTable
			v-else
			:columns="tableColumns"
			:rows="tableRows"
			:sort="sortField ? { column: sortField, direction: sortDir } : undefined"
			@update:sort="onSort"
		>
			<template #cell-stt="{ row }">
				<span class="text-xs text-gray-400">{{ row.stt }}</span>
			</template>

			<!-- Dynamic cell rendering based on column config -->
			<template v-for="col in config.columns" :key="col.key" #[`cell-${col.key}`]="{ row }">
				<UBadge
					v-if="col.type === 'badge'"
					:color="(col.badgeColor as any) || 'gray'"
					variant="subtle"
					size="xs"
				>{{ row[col.key] }}</UBadge>
				<span
					v-else-if="col.type === 'number'"
					class="font-medium"
					:class="row[col.key] > 0 ? '' : 'text-gray-400'"
				>{{ row[col.key] }}</span>
				<span v-else>{{ row[col.key] }}</span>
			</template>
		</UTable>

		<!-- Totals row -->
		<div
			v-if="totalsRow"
			class="mt-2 flex items-center gap-6 rounded-md bg-gray-50 px-4 py-2 text-sm font-semibold dark:bg-gray-800"
		>
			<span class="text-gray-600 dark:text-gray-300">TOTAL</span>
			<template v-for="col in config.columns" :key="col.key">
				<span v-if="col.type === 'number'" class="text-gray-900 dark:text-white">
					{{ col.label }}: {{ totalsRow[col.key] }}
				</span>
			</template>
		</div>
	</div>
</template>
