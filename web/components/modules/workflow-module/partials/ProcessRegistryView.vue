<script setup lang="ts">
import { readItems } from '@directus/sdk';
import { useDebounceFn } from '@vueuse/shared';
import type { Workflow, WorkflowLevel, WorkflowStatus } from '~/types/workflows';

const props = withDefaults(
	defineProps<{
		page: number;
		pageSize?: number;
		searchQuery?: string;
		filterStatus?: WorkflowStatus | '';
		filterLevel?: WorkflowLevel | number | null;
	}>(),
	{
		pageSize: 25,
		searchQuery: '',
		filterStatus: '',
		filterLevel: null,
	},
);

const emit = defineEmits<{
	'workflow-selected': [id: number];
	'page-change': [page: number];
	'update:searchQuery': [value: string];
	'update:filterStatus': [value: WorkflowStatus | ''];
	'update:filterLevel': [value: WorkflowLevel | '' | null];
}>();

const searchDraft = ref(props.searchQuery || '');

watch(
	() => props.searchQuery,
	(value) => {
		searchDraft.value = value || '';
	},
);

watch(
	searchDraft,
	useDebounceFn((value: string) => {
		emit('update:searchQuery', value);
	}, 300),
);

type WorkflowRegistryItem = Workflow & {
	stepCount: number;
};

type WorkflowStepCountRow = {
	id: number;
	workflow_id: number;
};

const requestKey = computed(() =>
	[
		'workflow-registry',
		props.page,
		props.pageSize,
		props.searchQuery || '',
		props.filterStatus || '',
		props.filterLevel || '',
	].join(':'),
);

const {
	data,
	pending,
	error,
	refresh,
} = await useAsyncData(
	() => requestKey.value,
	async () => {
		const filter: Record<string, any> = {};

		if (props.filterStatus) {
			filter.status = { _eq: props.filterStatus };
		}

		if (props.filterLevel !== null && props.filterLevel !== '') {
			filter.level = { _eq: props.filterLevel };
		}

		const limit = props.pageSize + 1;
		const offset = (props.page - 1) * props.pageSize;

		const params: Record<string, any> = {
			fields: ['id', 'process_code', 'title', 'description', 'sort', 'level', 'status', 'parent_workflow_id'],
			sort: ['sort', 'title', 'id'],
			limit,
			offset,
		};

		if (Object.keys(filter).length) {
			params.filter = filter;
		}

		const trimmedSearch = props.searchQuery?.trim();
		if (trimmedSearch) {
			params.search = trimmedSearch;
		}

		const workflows = await useDirectus<Workflow[]>(
			readItems('workflows', params),
		);

		const hasNextPage = workflows.length > props.pageSize;
		const pagedItems = workflows.slice(0, props.pageSize);
		const workflowIds = pagedItems.map((workflow) => workflow.id);

		let stepCounts: WorkflowStepCountRow[] = [];
		if (workflowIds.length) {
			stepCounts = await useDirectus<WorkflowStepCountRow[]>(
				readItems('workflow_steps', {
					filter: { workflow_id: { _in: workflowIds } },
					fields: ['id', 'workflow_id'],
					limit: -1,
				}),
			);
		}

		const stepCountByWorkflow = stepCounts.reduce<Record<number, number>>((counts, row) => {
			counts[row.workflow_id] = (counts[row.workflow_id] || 0) + 1;
			return counts;
		}, {});

		return {
			items: pagedItems.map((workflow) => ({
				...workflow,
				stepCount: stepCountByWorkflow[workflow.id] || 0,
			})) as WorkflowRegistryItem[],
			hasNextPage,
		};
	},
	{
		watch: [
			() => props.page,
			() => props.pageSize,
			() => props.searchQuery,
			() => props.filterStatus,
			() => props.filterLevel,
		],
	},
);

const items = computed(() => data.value?.items || []);
const displayItems = computed(() => {
	const rows = [...items.value];
	const byParent = new Map<number | null, typeof rows>();

	for (const row of rows) {
		const parentKey = row.parent_workflow_id ?? null;
		const siblings = byParent.get(parentKey) || [];
		siblings.push(row);
		byParent.set(parentKey, siblings);
	}

	for (const siblings of byParent.values()) {
		siblings.sort((left, right) => {
			const leftSort = left.sort ?? Number.MAX_SAFE_INTEGER;
			const rightSort = right.sort ?? Number.MAX_SAFE_INTEGER;
			if (leftSort !== rightSort) return leftSort - rightSort;
			return left.title.localeCompare(right.title);
		});
	}

	const seen = new Set<number>();
	const ordered: typeof rows = [];

	const visit = (parentId: number | null) => {
		for (const row of byParent.get(parentId) || []) {
			if (seen.has(row.id)) continue;
			seen.add(row.id);
			ordered.push(row);
			visit(row.id);
		}
	};

	visit(null);

	for (const row of rows) {
		if (!seen.has(row.id)) {
			ordered.push(row);
		}
	}

	return ordered;
});
const canGoPrev = computed(() => props.page > 1);
const canGoNext = computed(() => Boolean(data.value?.hasNextPage));

const levelMeta: Record<number, { label: string; badge: string }> = {
	1: {
		label: 'Cấp 1',
		badge: 'bg-slate-100 text-slate-700 dark:bg-slate-700/50 dark:text-slate-200',
	},
	2: {
		label: 'Cấp 2',
		badge: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
	},
	3: {
		label: 'Cấp 3',
		badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
	},
};

const statusFilterOptions = [
	{ label: 'Tất cả', value: '' },
	{ label: 'Hoạt động', value: 'active' },
	{ label: 'Nháp', value: 'draft' },
	{ label: 'Lưu trữ', value: 'archived' },
];

const levelFilterOptions = [
	{ label: 'Tất cả', value: '' },
	{ label: 'Cấp 1', value: 1 },
	{ label: 'Cấp 2', value: 2 },
	{ label: 'Cấp 3', value: 3 },
];

const utColumns = [
	{ key: 'sort', label: 'STT', sortable: false },
	{ key: 'process_code', label: 'Mã QT', sortable: false },
	{ key: 'title', label: 'Tên', sortable: false },
	{ key: 'description', label: 'Mô tả', sortable: false },
	{ key: 'level', label: 'Cấp', sortable: false },
	{ key: 'stepCount', label: 'Số bước', sortable: false },
	{ key: 'status', label: 'Trạng thái', sortable: false },
];

const statusMeta: Record<WorkflowStatus, string> = {
	draft: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
	active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
	archived: 'bg-gray-100 text-gray-700 dark:bg-gray-700/50 dark:text-gray-300',
};

function truncateDescription(value?: string | null) {
	if (!value) return 'Không có mô tả';
	return value.length > 100 ? `${value.slice(0, 100).trim()}...` : value;
}

function levelLabel(level?: number | null) {
	return levelMeta[level || 1]?.label || `Cấp ${level || 1}`;
}

function levelBadge(level?: number | null) {
	return levelMeta[level || 1]?.badge || 'bg-gray-100 text-gray-700 dark:bg-gray-700/50 dark:text-gray-300';
}

function statusBadge(status: WorkflowStatus) {
	return statusMeta[status] || 'bg-gray-100 text-gray-700 dark:bg-gray-700/50 dark:text-gray-300';
}

function handleSelect(row: any) {
	emit('workflow-selected', row.id);
}

function changePage(nextPage: number) {
	if (nextPage < 1 || nextPage === props.page) return;
	emit('page-change', nextPage);
}
</script>

<template>
	<div class="space-y-4">
		<div class="rounded-lg bg-white p-4 shadow dark:bg-gray-800">
			<div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_140px]">
				<div>
					<label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Tìm quy trình</label>
					<UInput
						v-model="searchDraft"
						placeholder="Tìm theo tên hoặc mã quy trình..."
						icon="i-heroicons-magnifying-glass"
					/>
				</div>

				<div>
					<label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Trạng thái</label>
					<USelect
						:model-value="filterStatus || ''"
						:options="statusFilterOptions"
						@change="emit('update:filterStatus', $event as WorkflowStatus | '')"
					/>
				</div>

				<div>
					<label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Cấp</label>
					<USelect
						:model-value="filterLevel ?? ''"
						:options="levelFilterOptions"
						@change="emit('update:filterLevel', $event ? Number($event) as WorkflowLevel : '')"
					/>
				</div>
			</div>
		</div>

		<div class="overflow-hidden rounded-lg bg-white shadow dark:bg-gray-800">
			<!-- Loading -->
			<div v-if="pending" class="px-4 py-12 text-center">
				<div class="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
				<p class="mt-2 text-sm text-gray-500 dark:text-gray-400">Đang tải quy trình...</p>
			</div>

			<!-- Error -->
			<div v-else-if="error" class="px-4 py-8 text-center">
				<p class="text-sm text-red-600 dark:text-red-400">
					Không tải được danh sách quy trình: {{ error.message }}
				</p>
				<UButton class="mt-3" @click="refresh">Thử lại</UButton>
			</div>

			<!-- UTable -->
			<UTable
				v-else
				:rows="displayItems"
				:columns="utColumns"
				:ui="{
					tr: { active: 'cursor-pointer transition hover:bg-gray-50 dark:hover:bg-gray-700/40' },
				}"
				:empty-state="{ icon: 'material-symbols:database-outline', label: 'Chưa có quy trình nào' }"
				@select="handleSelect"
			>
				<template #sort-data="{ row }">
					<span class="text-sm text-gray-700 dark:text-gray-300">{{ row.sort ?? '—' }}</span>
				</template>

				<template #process_code-data="{ row }">
					<span class="text-sm font-medium text-gray-900 dark:text-white">{{ row.process_code || '—' }}</span>
				</template>

				<template #title-data="{ row }">
					<div :style="{ paddingLeft: `${Math.max(0, (row.level || 1) - 1) * 18}px` }">
						<span class="text-sm text-gray-900 dark:text-white">{{ row.title }}</span>
					</div>
				</template>

				<template #description-data="{ row }">
					<span class="text-sm text-gray-600 dark:text-gray-400">{{ truncateDescription(row.description) }}</span>
				</template>

				<template #level-data="{ row }">
					<span class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium" :class="levelBadge(row.level)">
						{{ levelLabel(row.level) }}
					</span>
				</template>

				<template #stepCount-data="{ row }">
					<span class="text-sm text-gray-700 dark:text-gray-300">{{ row.stepCount }}</span>
				</template>

				<template #status-data="{ row }">
					<span class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize" :class="statusBadge(row.status)">
						{{ row.status }}
					</span>
				</template>
			</UTable>

			<div class="flex items-center justify-between border-t border-gray-200 px-4 py-3 dark:border-gray-700">
				<p class="text-sm text-gray-500 dark:text-gray-400">
					Trang {{ page }} · {{ displayItems.length }} bản ghi
				</p>
				<div class="flex items-center gap-2">
					<UButton variant="outline" size="sm" :disabled="!canGoPrev || pending" @click="changePage(page - 1)">Trước</UButton>
					<UButton variant="outline" size="sm" :disabled="!canGoNext || pending" @click="changePage(page + 1)">Sau</UButton>
				</div>
			</div>
		</div>
	</div>
</template>
