<script setup lang="ts">
/**
 * DirectusDataTable — Schema-driven reusable table component (S101 Rule)
 * TABLE-MODULE-V2: Insert marks (row + column), column descriptions, proposal system
 *
 * Usage: declare collection + fields config → get a full table with
 * pagination, sort, search, filters, insert marks, column descriptions.
 * Each new table = ~15-20 lines of config in the consuming page.
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

// Total column count (for colspan)
const colSpan = computed(() => props.fields.length + (props.stt ? 1 : 0));

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

// === Column description popover ===
const activeDescField = ref<string | null>(null);

function toggleDescription(fieldKey: string) {
	activeDescField.value = activeDescField.value === fieldKey ? null : fieldKey;
}

// === Proposal popup state ===
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

// === Pending proposals ===
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
	(pendingProposals.value || []).filter((p) => p.position_type === 'row'),
);

function getProposalsAtRow(index: number) {
	return rowProposals.value.filter((p) => p.position_index === index);
}

function handleProposalCreated() {
	refreshProposals();
}

const proposalStatusClass: Record<string, string> = {
	draft: 'bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300',
	reviewing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
	approved: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
};

const MARK_TOOLTIP_ROW = 'Đề xuất thêm hàng tại vị trí này với mô tả yêu cầu bằng ngôn ngữ tự nhiên';
const MARK_TOOLTIP_COL = 'Đề xuất thêm cột tại vị trí này với mô tả yêu cầu bằng ngôn ngữ tự nhiên';
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
		<div class="relative overflow-hidden rounded-lg bg-white shadow dark:bg-gray-800">
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
				<!-- TABLE-EXCEPTION: Legacy file superseded by DirectusTable.vue — pending deletion -->
			<table class="ddt-table min-w-full">
					<thead class="bg-gray-50 dark:bg-gray-900/40">
						<!-- Column marks above header -->
						<tr v-if="showColumnMarks" class="ddt-mark-row">
							<td v-if="stt" class="ddt-mark-cell"></td>
							<td
								v-for="(field, ci) in fields"
								:key="`col-top-${ci}`"
								class="ddt-mark-cell"
							>
								<!-- Mark before this column (shown on first col) + mark between prev and this col -->
								<button
									type="button"
									class="ddt-col-mark"
									:title="MARK_TOOLTIP_COL"
									@click.stop="openColumnProposal(ci)"
								>
									<svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
								</button>
								<!-- Mark after last column -->
								<button
									v-if="ci === fields.length - 1"
									type="button"
									class="ddt-col-mark ddt-col-mark-end"
									:title="MARK_TOOLTIP_COL"
									@click.stop="openColumnProposal(ci + 1)"
								>
									<svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
								</button>
							</td>
						</tr>

						<!-- Header row -->
						<tr class="border-b border-gray-200 dark:border-gray-700">
							<th
								v-if="stt"
								class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
							>
								STT
							</th>
							<th
								v-for="field in fields"
								:key="field.key"
								class="relative px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
								:class="field.sortable !== false ? 'cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200' : ''"
								:style="field.width ? { width: field.width } : {}"
								@click="field.sortable !== false && toggleSort(field.key)"
							>
								<span class="inline-flex items-center gap-1">
									{{ field.label }}{{ sortIcon(field.key) }}
									<!-- Column description icon -->
									<button
										v-if="field.description"
										type="button"
										class="inline-flex h-4 w-4 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
										:title="field.description"
										@click.stop="toggleDescription(field.key)"
									>
										<svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
									</button>
								</span>
								<!-- Description popover -->
								<div
									v-if="field.description && activeDescField === field.key"
									class="absolute left-0 top-full z-30 mt-1 w-64 rounded-lg border border-gray-200 bg-white p-3 text-xs font-normal normal-case tracking-normal text-gray-700 shadow-lg dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
									@click.stop
								>
									{{ field.description }}
								</div>
							</th>
						</tr>

						<!-- Column marks below header -->
						<tr v-if="showColumnMarks" class="ddt-mark-row">
							<td v-if="stt" class="ddt-mark-cell"></td>
							<td
								v-for="(field, ci) in fields"
								:key="`col-bot-${ci}`"
								class="ddt-mark-cell"
							>
								<button
									type="button"
									class="ddt-col-mark"
									:title="MARK_TOOLTIP_COL"
									@click.stop="openColumnProposal(ci)"
								>
									<svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
								</button>
								<button
									v-if="ci === fields.length - 1"
									type="button"
									class="ddt-col-mark ddt-col-mark-end"
									:title="MARK_TOOLTIP_COL"
									@click.stop="openColumnProposal(ci + 1)"
								>
									<svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
								</button>
							</td>
						</tr>
					</thead>

					<tbody>
						<!-- Loading -->
						<tr v-if="loading">
							<td :colspan="colSpan" class="border-t border-gray-200 px-4 py-12 text-center dark:border-gray-700">
								<div class="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
								<p class="mt-2 text-sm text-gray-500 dark:text-gray-400">Đang tải...</p>
							</td>
						</tr>

						<!-- Error -->
						<tr v-else-if="error">
							<td :colspan="colSpan" class="border-t border-gray-200 px-4 py-8 text-center dark:border-gray-700">
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

						<!-- Empty state with insert mark -->
						<template v-else-if="!items.length">
							<tr v-if="showInsertMarks" class="ddt-mark-row">
								<td :colspan="colSpan" class="ddt-mark-cell">
									<div class="flex items-center justify-between px-1">
										<button type="button" class="ddt-row-mark" :title="MARK_TOOLTIP_ROW" @click.stop="openRowProposal(0)">
											<svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
										</button>
										<button type="button" class="ddt-row-mark" :title="MARK_TOOLTIP_ROW" @click.stop="openRowProposal(0)">
											<svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
										</button>
									</div>
								</td>
							</tr>
							<!-- Inline proposals at position 0 -->
							<tr
								v-for="proposal in getProposalsAtRow(0)"
								:key="`p-${proposal.id}`"
								class="border-l-4 border-l-amber-400 bg-amber-50/60 dark:border-l-amber-600 dark:bg-amber-900/10"
							>
								<td :colspan="colSpan" class="px-4 py-2">
									<div class="flex items-center gap-3 text-sm">
										<span class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium" :class="proposalStatusClass[proposal.status] || ''">
											{{ proposal.proposal_type }}
										</span>
										<span class="text-amber-800 dark:text-amber-200">{{ proposal.description.slice(0, 120) }}{{ proposal.description.length > 120 ? '...' : '' }}</span>
									</div>
								</td>
							</tr>
							<tr>
								<td
									:colspan="colSpan"
									class="border-t border-gray-200 px-4 py-12 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400"
								>
									Không có dữ liệu
								</td>
							</tr>
						</template>

						<!-- Data rows with insert marks -->
						<template v-else>
							<template v-for="(item, index) in items" :key="item.id ?? index">
								<!-- Insert mark before row (before first OR between rows) -->
								<tr v-if="showInsertMarks" class="ddt-mark-row">
									<td :colspan="colSpan" class="ddt-mark-cell">
										<div class="flex items-center justify-between px-1">
											<button type="button" class="ddt-row-mark" :title="MARK_TOOLTIP_ROW" @click.stop="openRowProposal(index)">
												<svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
											</button>
											<button type="button" class="ddt-row-mark" :title="MARK_TOOLTIP_ROW" @click.stop="openRowProposal(index)">
												<svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
											</button>
										</div>
									</td>
								</tr>

								<!-- Inline proposals at this position -->
								<tr
									v-for="proposal in getProposalsAtRow(index)"
									:key="`p-${proposal.id}`"
									class="border-l-4 border-l-amber-400 bg-amber-50/60 dark:border-l-amber-600 dark:bg-amber-900/10"
								>
									<td :colspan="colSpan" class="px-4 py-2">
										<div class="flex items-center gap-3 text-sm">
											<span class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium" :class="proposalStatusClass[proposal.status] || ''">
												{{ proposal.proposal_type }}
											</span>
											<span class="text-amber-800 dark:text-amber-200">{{ proposal.description.slice(0, 120) }}{{ proposal.description.length > 120 ? '...' : '' }}</span>
										</div>
									</td>
								</tr>

								<!-- Data row -->
								<tr
									class="border-t border-gray-200 transition hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/40"
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

								<!-- Insert mark after last row -->
								<template v-if="showInsertMarks && index === items.length - 1">
									<tr class="ddt-mark-row">
										<td :colspan="colSpan" class="ddt-mark-cell">
											<div class="flex items-center justify-between px-1">
												<button type="button" class="ddt-row-mark" :title="MARK_TOOLTIP_ROW" @click.stop="openRowProposal(index + 1)">
													<svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
												</button>
												<button type="button" class="ddt-row-mark" :title="MARK_TOOLTIP_ROW" @click.stop="openRowProposal(index + 1)">
													<svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
												</button>
											</div>
										</td>
									</tr>
									<!-- Inline proposals after last row -->
									<tr
										v-for="proposal in getProposalsAtRow(index + 1)"
										:key="`p-end-${proposal.id}`"
										class="border-l-4 border-l-amber-400 bg-amber-50/60 dark:border-l-amber-600 dark:bg-amber-900/10"
									>
										<td :colspan="colSpan" class="px-4 py-2">
											<div class="flex items-center gap-3 text-sm">
												<span class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium" :class="proposalStatusClass[proposal.status] || ''">
													{{ proposal.proposal_type }}
												</span>
												<span class="text-amber-800 dark:text-amber-200">{{ proposal.description.slice(0, 120) }}{{ proposal.description.length > 120 ? '...' : '' }}</span>
											</div>
										</td>
									</tr>
								</template>
							</template>
						</template>
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

			<!-- Proposal popup -->
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
/* Insert mark rows: zero height, no borders */
.ddt-table {
	border-collapse: collapse;
}

.ddt-mark-row {
	height: 0;
	line-height: 0;
}

.ddt-mark-cell {
	padding: 0 !important;
	height: 0 !important;
	line-height: 0;
	border: none !important;
	overflow: visible;
	position: relative;
}

/* Row insert mark buttons */
.ddt-row-mark {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 1rem;
	height: 1rem;
	border-radius: 9999px;
	border: 1px dashed;
	border-color: var(--mark-border, #9ca3af);
	background: white;
	color: #9ca3af;
	opacity: 0.3;
	transition: all 0.2s;
	cursor: pointer;
	position: relative;
	z-index: 10;
}

.ddt-row-mark:hover {
	opacity: 1;
	border-color: #f59e0b;
	background: #fffbeb;
	color: #d97706;
}

:root.dark .ddt-row-mark {
	background: #1f2937;
	border-color: #4b5563;
	color: #6b7280;
}

:root.dark .ddt-row-mark:hover {
	border-color: #f59e0b;
	background: rgba(120, 53, 15, 0.3);
	color: #fbbf24;
}

/* Column insert mark buttons */
.ddt-col-mark {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 1rem;
	height: 1rem;
	border-radius: 9999px;
	border: 1px dashed #9ca3af;
	background: white;
	color: #9ca3af;
	opacity: 0.3;
	transition: all 0.2s;
	cursor: pointer;
	position: absolute;
	left: -0.5rem;
	top: 50%;
	transform: translateY(-50%);
	z-index: 15;
}

.ddt-col-mark:hover {
	opacity: 1;
	border-color: #f59e0b;
	background: #fffbeb;
	color: #d97706;
}

.ddt-col-mark-end {
	left: auto;
	right: -0.5rem;
}

:root.dark .ddt-col-mark {
	background: #1f2937;
	border-color: #4b5563;
	color: #6b7280;
}

:root.dark .ddt-col-mark:hover {
	border-color: #f59e0b;
	background: rgba(120, 53, 15, 0.3);
	color: #fbbf24;
}
</style>
