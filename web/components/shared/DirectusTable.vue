<script setup lang="ts">
/**
 * DirectusTable — UTable-based schema-driven table (ASSEMBLY-STEP3)
 * Thin wrapper around Nuxt UI UTable with: data fetch, pagination, sort,
 * search, filters, insert marks, column descriptions, proposal system.
 *
 * Nuxt UI components used: UTable, UInput, USelect, UPopover, UTooltip,
 * UPagination, UButton, USkeleton (via UTable :loading).
 */
import { useDebounceFn } from '@vueuse/shared';
import { readItems } from '@directus/sdk';
import { useDirectusTable, type FieldConfig } from '~/composables/useDirectusTable';
import type { TableProposal } from '~/types/table-proposals';

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
		showInsertMarks?: boolean;
		showColumnMarks?: boolean;
	}>(),
	{
		defaultSort: () => ['id'],
		pageSize: 25,
		searchable: true,
		stt: true,
		showInsertMarks: true,
		showColumnMarks: true,
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
	hasNextPage,
	totalCount,
	totalPages,
	pageSize,
	setFilter,
	setSearch,
	goToPage,
	activeFilters,
} = useDirectusTable({
	collection: props.collection,
	fields: props.fields,
	defaultSort: props.defaultSort,
	pageSize: props.pageSize,
	searchable: props.searchable,
	filters: props.filters,
	stt: props.stt,
});

// === UTable column mapping ===
const utColumns = computed(() => {
	const cols: any[] = [];
	if (props.stt) {
		cols.push({ key: '_stt', label: 'STT', sortable: false });
	}
	for (const f of props.fields) {
		cols.push({ key: f.key, label: f.label, sortable: f.sortable !== false });
	}
	return cols;
});

// === UTable sort sync ===
const utSort = computed(() => ({
	column: sortField.value,
	direction: sortDir.value as 'asc' | 'desc',
}));

function onSortUpdate(sort: { column: string; direction: 'asc' | 'desc' }) {
	if (sort.column) {
		sortField.value = sort.column;
		sortDir.value = sort.direction;
	}
}

// === UTable rows (add _stt + _idx) ===
const utRows = computed(() =>
	items.value.map((item: any, i: number) => ({
		...item,
		_stt: (currentPage.value - 1) * pageSize + i + 1,
		_idx: i,
	})),
);

// === UTable UI overrides ===
const tableUi = computed(() => ({
	tr: {
		base: 'relative',
		active: props.rowLink
			? 'hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer'
			: 'hover:bg-gray-50 dark:hover:bg-gray-800/50',
	},
	th: { base: 'text-left relative' },
	td: { color: 'text-gray-900 dark:text-white' },
}));

// === Helpers ===
function getNestedValue(item: any, key: string): any {
	return key.split('.').reduce((obj, k) => obj?.[k], item);
}

const filterableFields = computed(() =>
	props.fields.filter((f) => f.filterable && f.filterOptions?.length),
);

const searchDraft = ref('');
watch(
	searchDraft,
	useDebounceFn((value: string) => {
		setSearch(value);
	}, 300),
);

function handleRowClick(row: any) {
	emit('row-click', row);
	if (props.rowLink) {
		router.push(props.rowLink(row));
	}
}

// === Proposal system ===
const showProposal = ref(false);
const proposalPositionType = ref<'row' | 'column'>('row');
const proposalPositionIndex = ref(0);
const proposalPositionContext = ref('');

function openRowProposal(index: number) {
	proposalPositionType.value = 'row';
	proposalPositionIndex.value = index;
	const actualIndex = (currentPage.value - 1) * pageSize + index;
	proposalPositionContext.value = index === 0
		? 'Trước hàng đầu tiên'
		: `Sau hàng ${actualIndex}`;
	showProposal.value = true;
}

function openColumnProposal(index: number) {
	proposalPositionType.value = 'column';
	proposalPositionIndex.value = index;
	proposalPositionContext.value = index === 0
		? 'Trước cột đầu tiên'
		: index >= props.fields.length
			? 'Sau cột cuối cùng'
			: `Giữa cột "${props.fields[index - 1]?.label}" và "${props.fields[index]?.label}"`;
	showProposal.value = true;
}

const { data: pendingProposals, refresh: refreshProposals } = useAsyncData(
	() => `table-proposals:${props.collection}`,
	async () => {
		try {
			return await useDirectus<TableProposal[]>(
				readItems('table_proposals', {
					filter: {
						source_collection: { _eq: props.collection },
						status: { _in: ['draft', 'reviewing', 'approved'] },
					},
					fields: ['id', 'proposal_type', 'position_type', 'position_index', 'position_context', 'description', 'status', 'date_created'],
					sort: ['-date_created'],
					limit: 50,
				}),
			);
		} catch {
			return [];
		}
	},
	{ watch: [() => props.collection] },
);

const rowProposals = computed(() =>
	(pendingProposals.value || []).filter((p: any) => p.position_type === 'row'),
);

function handleProposalCreated() {
	refreshProposals();
}

const proposalStatusClass: Record<string, string> = {
	draft: 'bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300',
	reviewing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
	approved: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
};

const MARK_TOOLTIP_ROW = 'Đề xuất thêm hàng tại vị trí này';
const MARK_TOOLTIP_COL = 'Đề xuất thêm cột tại vị trí này';
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
					<UInput v-model="searchDraft" placeholder="Tìm kiếm..." icon="i-heroicons-magnifying-glass" />
				</div>
				<div v-for="ff in filterableFields" :key="ff.key">
					<label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{{ ff.label }}</label>
					<USelect
						:model-value="activeFilters[ff.key] ?? ''"
						:options="[{ label: 'Tất cả', value: '' }, ...(ff.filterOptions || [])]"
						@change="setFilter(ff.key, $event)"
					/>
				</div>
			</div>
		</div>

		<!-- Table container -->
		<div class="relative rounded-lg bg-white shadow dark:bg-gray-800">
			<!-- Title bar -->
			<div v-if="title" class="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
				<div class="flex items-center justify-between gap-3">
					<h3 class="text-base font-semibold text-gray-900 dark:text-white">{{ title }}</h3>
					<UButton variant="outline" size="sm" @click="refresh">Làm mới</UButton>
				</div>
			</div>

			<!-- Error state -->
			<div v-if="error" class="px-4 py-8 text-center">
				<p class="text-sm text-red-600 dark:text-red-400">
					Không tải được dữ liệu: {{ error.message }}
				</p>
				<UButton class="mt-3" @click="refresh">Thử lại</UButton>
			</div>

			<!-- UTable -->
			<UTable
				v-else
				:rows="utRows"
				:columns="utColumns"
				:sort="utSort"
				sort-mode="manual"
				:loading="loading"
				:empty-state="{ icon: 'material-symbols:database-outline', label: 'Không có dữ liệu' }"
				:ui="tableUi"
				@update:sort="onSortUpdate"
				@select="handleRowClick"
			>
				<!-- STT column data: numbering + row insert marks with UTooltip -->
				<template #_stt-data="{ row }">
					<span class="text-gray-700 dark:text-gray-300">{{ row._stt }}</span>
					<UTooltip v-if="showInsertMarks" :text="MARK_TOOLTIP_ROW" class="dt-row-mark">
						<button type="button" class="dt-mark-icon" @click.stop="openRowProposal(row._idx + 1)">
							<svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
						</button>
					</UTooltip>
					<UTooltip v-if="showInsertMarks && row._idx === 0" :text="MARK_TOOLTIP_ROW" class="dt-row-mark dt-row-mark-top">
						<button type="button" class="dt-mark-icon" @click.stop="openRowProposal(0)">
							<svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
						</button>
					</UTooltip>
				</template>

				<!-- Dynamic header slots: label + sort + UPopover description + column marks -->
				<template v-for="(field, fi) in fields" :key="`h-${field.key}`" #[`${field.key}-header`]="{ column, sort, onSort }">
					<span
						class="inline-flex items-center gap-1"
						:class="field.sortable !== false ? 'cursor-pointer select-none' : ''"
						@click="field.sortable !== false ? onSort(column) : undefined"
					>
						{{ field.label }}
						<template v-if="sort?.column === column.key">
							{{ sort.direction === 'asc' ? ' ↑' : ' ↓' }}
						</template>
						<UPopover v-if="field.description" @click.stop>
							<button
								type="button"
								class="inline-flex h-4 w-4 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
							>
								<svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
							</button>
							<template #panel>
								<div class="w-64 p-3 text-xs font-normal normal-case tracking-normal text-gray-700 dark:text-gray-300">
									{{ field.description }}
								</div>
							</template>
						</UPopover>
					</span>
					<!-- Column mark at left edge -->
					<UTooltip v-if="showColumnMarks" :text="MARK_TOOLTIP_COL" class="dt-col-mark">
						<button type="button" class="dt-mark-icon" @click.stop="openColumnProposal(fi)">
							<svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
						</button>
					</UTooltip>
					<!-- Mark after last column -->
					<UTooltip v-if="showColumnMarks && fi === fields.length - 1" :text="MARK_TOOLTIP_COL" class="dt-col-mark dt-col-mark-end">
						<button type="button" class="dt-mark-icon" @click.stop="openColumnProposal(fi + 1)">
							<svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
						</button>
					</UTooltip>
				</template>

				<!-- Dynamic data slots: forward parent's #cell-{key} slots -->
				<template v-for="field in fields" :key="`d-${field.key}`" #[`${field.key}-data`]="{ row }">
					<slot :name="`cell-${field.key}`" :item="row" :value="getNestedValue(row, field.key)">
						{{ field.render ? field.render(getNestedValue(row, field.key), row) : (getNestedValue(row, field.key) ?? '—') }}
					</slot>
				</template>

				<!-- Empty state -->
				<template #empty-state>
					<div class="flex flex-col items-center py-8">
						<UTooltip v-if="showInsertMarks" :text="MARK_TOOLTIP_ROW">
							<button
								type="button"
								class="dt-mark-btn mb-4"
								@click.stop="openRowProposal(0)"
							>
								<svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
							</button>
						</UTooltip>
						<p class="text-sm text-gray-500 dark:text-gray-400">Không có dữ liệu</p>
					</div>
				</template>
			</UTable>

			<!-- Pending proposals section -->
			<div v-if="rowProposals.length" class="border-t border-amber-200 bg-amber-50/30 px-4 py-2 dark:border-amber-800 dark:bg-amber-900/5">
				<p class="mb-1 text-xs font-medium text-amber-700 dark:text-amber-400">Đề xuất đang chờ</p>
				<div
					v-for="proposal in rowProposals"
					:key="`p-${proposal.id}`"
					class="mb-1 flex items-center gap-2 rounded border-l-4 border-l-amber-400 bg-white px-3 py-1.5 text-sm dark:border-l-amber-600 dark:bg-gray-800"
				>
					<UBadge
						:label="proposal.proposal_type"
						:class="proposalStatusClass[proposal.status] || ''"
						size="xs"
					/>
					<span class="shrink-0 text-xs text-amber-600 dark:text-amber-400">
						{{ proposal.position_context }}
					</span>
					<span class="truncate text-amber-800 dark:text-amber-200">
						{{ proposal.description.slice(0, 100) }}{{ proposal.description.length > 100 ? '...' : '' }}
					</span>
				</div>
			</div>

			<!-- Pagination -->
			<div class="flex items-center justify-between border-t border-gray-200 px-4 py-3 dark:border-gray-700">
				<p class="text-sm text-gray-500 dark:text-gray-400">
					<template v-if="totalCount !== null">{{ totalCount }} bản ghi</template>
				</p>
				<UPagination
					v-if="totalCount"
					:model-value="currentPage"
					:page-count="pageSize"
					:total="totalCount"
					@update:model-value="goToPage"
				/>
				<div v-else class="flex items-center gap-2">
					<UButton variant="outline" size="sm" :disabled="currentPage <= 1 || loading" @click="goToPage(currentPage - 1)">Trước</UButton>
					<UButton variant="outline" size="sm" :disabled="!hasNextPage || loading" @click="goToPage(currentPage + 1)">Tiếp</UButton>
				</div>
			</div>

			<!-- Proposal popup (UModal-based) -->
			<SharedProposalPopup
				:source-collection="collection"
				:position-type="proposalPositionType"
				:position-index="proposalPositionIndex"
				:position-context="proposalPositionContext"
				:visible="showProposal"
				@close="showProposal = false"
				@proposal-created="handleProposalCreated"
			/>
		</div>
	</div>
</template>

<style scoped>
/* Row insert marks — UTooltip wrapper with positioning */
.dt-row-mark {
	position: absolute;
	bottom: -8px;
	left: 4px;
	z-index: 10;
	opacity: 0.3;
	transition: opacity 0.2s;
}

tr:hover .dt-row-mark {
	opacity: 0.6;
}

.dt-row-mark:hover {
	opacity: 1 !important;
}

.dt-row-mark-top {
	bottom: auto;
	top: -8px;
}

/* Column insert marks — UTooltip wrapper with positioning */
.dt-col-mark {
	position: absolute;
	left: -0.5rem;
	top: 50%;
	transform: translateY(-50%);
	z-index: 15;
	opacity: 0.3;
	transition: opacity 0.2s;
}

th:hover .dt-col-mark {
	opacity: 0.6;
}

.dt-col-mark:hover {
	opacity: 1 !important;
}

.dt-col-mark-end {
	left: auto;
	right: -0.5rem;
}

/* Mark icon button (inside UTooltip) */
.dt-mark-icon {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 1rem;
	height: 1rem;
	border-radius: 9999px;
	border: 1px dashed #9ca3af;
	background: white;
	color: #9ca3af;
	cursor: pointer;
	transition: all 0.2s;
}

.dt-mark-icon:hover {
	border-color: #f59e0b;
	background: #fffbeb;
	color: #d97706;
}

:root.dark .dt-mark-icon {
	background: #1f2937;
	border-color: #4b5563;
	color: #6b7280;
}

:root.dark .dt-mark-icon:hover {
	border-color: #f59e0b;
	background: rgba(120, 53, 15, 0.3);
	color: #fbbf24;
}

/* Mark button for empty state */
.dt-mark-btn {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 1.5rem;
	height: 1.5rem;
	border-radius: 9999px;
	border: 1px dashed #9ca3af;
	background: white;
	color: #9ca3af;
	opacity: 0.5;
	transition: all 0.2s;
	cursor: pointer;
}

.dt-mark-btn:hover {
	opacity: 1;
	border-color: #f59e0b;
	background: #fffbeb;
	color: #d97706;
}

:root.dark .dt-mark-btn {
	background: #1f2937;
	border-color: #4b5563;
	color: #6b7280;
}

:root.dark .dt-mark-btn:hover {
	border-color: #f59e0b;
	background: rgba(120, 53, 15, 0.3);
	color: #fbbf24;
}
</style>
