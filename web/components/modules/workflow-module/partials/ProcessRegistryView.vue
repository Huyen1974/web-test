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

		const workflows = await useDirectus<Workflow[]>(
			readItems('workflows', {
				fields: ['id', 'process_code', 'title', 'description', 'sort', 'level', 'status', 'parent_workflow_id'],
				filter: Object.keys(filter).length ? filter : undefined,
				search: props.searchQuery?.trim() || undefined,
				sort: ['sort', 'title', 'id'],
				limit,
				offset,
			}),
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
		label: 'Cu',
		badge: 'bg-slate-100 text-slate-700 dark:bg-slate-700/50 dark:text-slate-200',
	},
	2: {
		label: 'Ba',
		badge: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
	},
	3: {
		label: 'Me',
		badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
	},
};

const statusMeta: Record<WorkflowStatus, string> = {
	draft: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
	active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
	archived: 'bg-gray-100 text-gray-700 dark:bg-gray-700/50 dark:text-gray-300',
};

function truncateDescription(value?: string | null) {
	if (!value) return 'Khong co mo ta';
	return value.length > 100 ? `${value.slice(0, 100).trim()}...` : value;
}

function levelLabel(level?: number | null) {
	return levelMeta[level || 1]?.label || `T${level || 1}`;
}

function levelBadge(level?: number | null) {
	return levelMeta[level || 1]?.badge || 'bg-gray-100 text-gray-700 dark:bg-gray-700/50 dark:text-gray-300';
}

function statusBadge(status: WorkflowStatus) {
	return statusMeta[status] || 'bg-gray-100 text-gray-700 dark:bg-gray-700/50 dark:text-gray-300';
}

function handleSelect(id: number) {
	emit('workflow-selected', id);
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
					<label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Tim quy trinh</label>
					<input
						v-model="searchDraft"
						type="text"
						placeholder="Tim theo ten hoac ma quy trinh..."
						class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:focus:border-primary-400 dark:focus:ring-primary-900"
					>
				</div>

				<div>
					<label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Trang thai</label>
					<select
						:value="filterStatus || ''"
						class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:focus:border-primary-400 dark:focus:ring-primary-900"
						@change="emit('update:filterStatus', ($event.target as HTMLSelectElement).value as WorkflowStatus | '')"
					>
						<option value="">Tat ca</option>
						<option value="active">active</option>
						<option value="draft">draft</option>
						<option value="archived">archived</option>
					</select>
				</div>

				<div>
					<label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Tang</label>
					<select
						:value="filterLevel ?? ''"
						class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:focus:border-primary-400 dark:focus:ring-primary-900"
						@change="emit('update:filterLevel', ($event.target as HTMLSelectElement).value ? Number(($event.target as HTMLSelectElement).value) as WorkflowLevel : '')"
					>
						<option value="">Tat ca</option>
						<option value="1">Cu</option>
						<option value="2">Ba</option>
						<option value="3">Me</option>
					</select>
				</div>
			</div>
		</div>

		<div class="overflow-hidden rounded-lg bg-white shadow dark:bg-gray-800">
			<div class="overflow-x-auto">
				<table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
					<thead class="bg-gray-50 dark:bg-gray-900/40">
						<tr>
							<th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">STT</th>
							<th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Ma QT</th>
							<th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Ten</th>
							<th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Mo ta</th>
							<th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Tang</th>
							<th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">So buoc</th>
							<th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Trang thai</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200 dark:divide-gray-700">
						<tr v-if="pending">
							<td colspan="7" class="px-4 py-12 text-center">
								<div class="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
								<p class="mt-2 text-sm text-gray-500 dark:text-gray-400">Dang tai quy trinh...</p>
							</td>
						</tr>

						<tr v-else-if="error">
							<td colspan="7" class="px-4 py-8 text-center">
								<p class="text-sm text-red-600 dark:text-red-400">
									Khong tai duoc danh sach quy trinh: {{ error.message }}
								</p>
								<button
									class="mt-3 inline-flex items-center rounded-md bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700"
									@click="refresh"
								>
									Thu lai
								</button>
							</td>
						</tr>

						<tr v-else-if="!displayItems.length">
							<td colspan="7" class="px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
								Chua co quy trinh nao
							</td>
						</tr>

						<tr
							v-for="workflow in displayItems"
							v-else
							:key="workflow.id"
							class="cursor-pointer transition hover:bg-gray-50 dark:hover:bg-gray-700/40"
							@click="handleSelect(workflow.id)"
						>
							<td class="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
								{{ workflow.sort ?? '—' }}
							</td>
							<td class="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
								{{ workflow.process_code || '—' }}
							</td>
							<td class="px-4 py-3 text-sm text-gray-900 dark:text-white">
								<div :style="{ paddingLeft: `${Math.max(0, (workflow.level || 1) - 1) * 18}px` }">
									{{ workflow.title }}
								</div>
							</td>
							<td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
								{{ truncateDescription(workflow.description) }}
							</td>
							<td class="whitespace-nowrap px-4 py-3 text-sm">
								<span class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium" :class="levelBadge(workflow.level)">
									{{ levelLabel(workflow.level) }}
								</span>
							</td>
							<td class="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
								{{ workflow.stepCount }}
							</td>
							<td class="whitespace-nowrap px-4 py-3 text-sm">
								<span class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize" :class="statusBadge(workflow.status)">
									{{ workflow.status }}
								</span>
							</td>
						</tr>
					</tbody>
				</table>
			</div>

			<div class="flex items-center justify-between border-t border-gray-200 px-4 py-3 dark:border-gray-700">
				<p class="text-sm text-gray-500 dark:text-gray-400">
					Trang {{ page }} · {{ displayItems.length }} ban ghi
				</p>
				<div class="flex items-center gap-2">
					<button
						class="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
						:disabled="!canGoPrev || pending"
						@click="changePage(page - 1)"
					>
						Truoc
					</button>
					<button
						class="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
						:disabled="!canGoNext || pending"
						@click="changePage(page + 1)"
					>
						Sau
					</button>
				</div>
			</div>
		</div>
	</div>
</template>
