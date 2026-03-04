<script setup lang="ts">
/**
 * DirectusDataTable — Schema-driven reusable table component (S101 Rule)
 *
 * Usage: declare collection + fields config → get a full table with
 * pagination, sort, search, filters, loading/error/empty states.
 * Each new table = ~15-20 lines of config in the consuming page.
 */
import { useDebounceFn } from '@vueuse/shared';
import { useDirectusTable, type FieldConfig } from '~/composables/useDirectusTable';

const props = withDefaults(
	defineProps<{
		collection: string;
		fields: FieldConfig[];
		defaultSort?: string[];
		pageSize?: number;
		searchable?: boolean;
		filters?: Record<string, any>;
		rowLink?: (item: any) => string;
		stt?: boolean;
		title?: string;
	}>(),
	{
		defaultSort: () => ['id'],
		pageSize: 25,
		searchable: true,
		stt: true,
	},
);

const emit = defineEmits<{
	'row-click': [item: any];
}>();

const router = useRouter();

const {
	items,
	loading,
	error,
	refresh,
	currentPage,
	sortField,
	sortDir,
	searchQuery,
	hasNextPage,
	totalCount,
	totalPages,
	pageSize,
	toggleSort,
	setFilter,
	setSearch,
	goToPage,
} = useDirectusTable({
	collection: props.collection,
	fields: props.fields,
	defaultSort: props.defaultSort,
	pageSize: props.pageSize,
	searchable: props.searchable,
	filters: props.filters,
	stt: props.stt,
});

// Debounced search
const searchDraft = ref('');
watch(
	searchDraft,
	useDebounceFn((value: string) => {
		setSearch(value);
	}, 300),
);

// Get nested value by dot-notation key (e.g. "category.name")
function getNestedValue(item: any, key: string): any {
	return key.split('.').reduce((obj, k) => obj?.[k], item);
}

// Filterable fields for dropdown rendering
const filterableFields = computed(() =>
	props.fields.filter((f) => f.filterable && f.filterOptions?.length),
);

function handleRowClick(item: any) {
	emit('row-click', item);
	if (props.rowLink) {
		router.push(props.rowLink(item));
	}
}

function sortIcon(fieldKey: string) {
	if (sortField.value !== fieldKey) return '';
	return sortDir.value === 'asc' ? ' ↑' : ' ↓';
}
</script>

<template>
	<div class="space-y-4">
		<!-- Search + Filters bar -->
		<div
			v-if="searchable || filterableFields.length"
			class="rounded-lg bg-white p-4 shadow dark:bg-gray-800"
		>
			<div
				class="grid gap-3"
				:class="filterableFields.length ? `md:grid-cols-[minmax(0,1fr)_${filterableFields.map(() => '180px').join('_')}]` : ''"
			>
				<div v-if="searchable">
					<label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Tìm kiếm</label>
					<input
						v-model="searchDraft"
						type="text"
						placeholder="Tìm kiếm..."
						class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:focus:border-primary-400 dark:focus:ring-primary-900"
					>
				</div>

				<div v-for="ff in filterableFields" :key="ff.key">
					<label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{{ ff.label }}</label>
					<select
						class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:focus:border-primary-400 dark:focus:ring-primary-900"
						@change="setFilter(ff.key, ($event.target as HTMLSelectElement).value)"
					>
						<option value="">Tất cả</option>
						<option
							v-for="opt in ff.filterOptions"
							:key="String(opt.value)"
							:value="opt.value"
						>
							{{ opt.label }}
						</option>
					</select>
				</div>
			</div>
		</div>

		<!-- Table -->
		<div class="overflow-hidden rounded-lg bg-white shadow dark:bg-gray-800">
			<!-- Title bar -->
			<div v-if="title" class="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
				<div class="flex items-center justify-between gap-3">
					<h3 class="text-base font-semibold text-gray-900 dark:text-white">{{ title }}</h3>
					<button
						class="inline-flex items-center rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
						@click="refresh"
					>
						Làm mới
					</button>
				</div>
			</div>

			<div class="overflow-x-auto">
				<table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
					<thead class="bg-gray-50 dark:bg-gray-900/40">
						<tr>
							<th
								v-if="stt"
								class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
							>
								STT
							</th>
							<th
								v-for="field in fields"
								:key="field.key"
								class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
								:class="field.sortable !== false ? 'cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200' : ''"
								:style="field.width ? { width: field.width } : {}"
								@click="field.sortable !== false && toggleSort(field.key)"
							>
								{{ field.label }}{{ sortIcon(field.key) }}
							</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200 dark:divide-gray-700">
						<!-- Loading -->
						<tr v-if="loading">
							<td :colspan="fields.length + (stt ? 1 : 0)" class="px-4 py-12 text-center">
								<div class="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
								<p class="mt-2 text-sm text-gray-500 dark:text-gray-400">Đang tải...</p>
							</td>
						</tr>

						<!-- Error -->
						<tr v-else-if="error">
							<td :colspan="fields.length + (stt ? 1 : 0)" class="px-4 py-8 text-center">
								<p class="text-sm text-red-600 dark:text-red-400">
									Không tải được dữ liệu: {{ error.message }}
								</p>
								<button
									class="mt-3 inline-flex items-center rounded-md bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700"
									@click="refresh"
								>
									Thử lại
								</button>
							</td>
						</tr>

						<!-- Empty -->
						<tr v-else-if="!items.length">
							<td
								:colspan="fields.length + (stt ? 1 : 0)"
								class="px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400"
							>
								Không có dữ liệu
							</td>
						</tr>

						<!-- Data rows -->
						<tr
							v-for="(item, index) in items"
							v-else
							:key="item.id ?? index"
							class="transition hover:bg-gray-50 dark:hover:bg-gray-700/40"
							:class="rowLink ? 'cursor-pointer' : ''"
							@click="handleRowClick(item)"
						>
							<td
								v-if="stt"
								class="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-300"
							>
								{{ (currentPage - 1) * pageSize + index + 1 }}
							</td>
							<td
								v-for="field in fields"
								:key="field.key"
								class="px-4 py-3 text-sm text-gray-900 dark:text-white"
							>
								<slot :name="`cell-${field.key}`" :item="item" :value="getNestedValue(item, field.key)">
									{{ field.render ? field.render(getNestedValue(item, field.key), item) : (getNestedValue(item, field.key) ?? '—') }}
								</slot>
							</td>
						</tr>
					</tbody>
				</table>
			</div>

			<!-- Pagination -->
			<div class="flex items-center justify-between border-t border-gray-200 px-4 py-3 dark:border-gray-700">
				<p class="text-sm text-gray-500 dark:text-gray-400">
					Trang {{ currentPage }}
					<template v-if="totalPages"> / {{ totalPages }}</template>
					<template v-if="totalCount !== null"> — {{ totalCount }} bản ghi</template>
				</p>
				<div class="flex items-center gap-2">
					<button
						class="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
						:disabled="currentPage <= 1 || loading"
						@click="goToPage(currentPage - 1)"
					>
						Trước
					</button>
					<button
						class="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
						:disabled="!hasNextPage || loading"
						@click="goToPage(currentPage + 1)"
					>
						Tiếp
					</button>
				</div>
			</div>
		</div>
	</div>
</template>
