<script setup lang="ts">
import { createItem, readItems } from '@directus/sdk';
import type { WorkflowChangeRequest, WorkflowChangeType } from '~/types/workflow-dsl';

const props = defineProps<{
	workflowId: number;
}>();

const emit = defineEmits<{
	'wcr-created': [request: WorkflowChangeRequest];
}>();

const description = ref('');
const changeType = ref<WorkflowChangeType>('modify_step');
const positionContext = ref('');
const selectedWcrId = ref<number | null>(null);
const submitting = ref(false);
const submitError = ref<string>('');

const requestKey = computed(() => `workflow-wcr:${props.workflowId}`);

const {
	data: requests,
	pending,
	error,
	refresh,
} = await useAsyncData(
	() => requestKey.value,
	async () =>
		useDirectus<WorkflowChangeRequest[]>(
			readItems('workflow_change_requests', {
				filter: { workflow_id: { _eq: props.workflowId } },
				fields: [
					'id',
					'workflow_id',
					'change_type',
					'title',
					'description',
					'position_context',
					'status',
					'date_created',
				],
				sort: ['-date_created', '-id'],
				limit: 100,
			}),
		),
	{
		watch: [() => props.workflowId],
	},
);

function toggleWcr(id: number) {
	selectedWcrId.value = selectedWcrId.value === id ? null : id;
}

const selectedWcr = computed(() => requests.value?.find((request) => request.id === selectedWcrId.value) || null);

const statusBadge: Record<string, string> = {
	draft: 'bg-slate-100 text-slate-700 dark:bg-slate-700/50 dark:text-slate-200',
	ai_reviewing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
	needs_clarification: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
	ready_for_approval: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
	approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
	rejected: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
	applied: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
};

async function submitRequest() {
	if (!description.value.trim()) {
		submitError.value = 'Cần mô tả thay đổi trước khi tạo đề xuất.';
		return;
	}

	submitError.value = '';
	submitting.value = true;

	try {
		const summary = description.value.trim().split('\n')[0].slice(0, 80);
		const created = await useDirectus<WorkflowChangeRequest>(
			createItem('workflow_change_requests', {
			workflow_id: props.workflowId,
			change_type: changeType.value,
			title: summary || 'Workflow change request',
			description: description.value.trim(),
			position_context: positionContext.value.trim() || null,
				status: 'draft',
			}),
		);

		description.value = '';
		positionContext.value = '';
		selectedWcrId.value = created.id;
		await refresh();
		emit('wcr-created', created);
	} catch (err: any) {
		submitError.value = err?.data?.statusMessage || err?.message || 'Không tạo được đề xuất thay đổi.';
	} finally {
		submitting.value = false;
	}
}
</script>

<template>
	<div class="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
		<div class="rounded-lg bg-white p-4 shadow dark:bg-gray-800">
			<div class="mb-4">
				<h3 class="text-base font-semibold text-gray-900 dark:text-white">Đề xuất thay đổi</h3>
				<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
					Mô tả bằng ngôn ngữ tự nhiên. Hệ thống sẽ tạo WCR ở trạng thái <code>draft</code>.
				</p>
			</div>

			<div class="space-y-4">
				<div>
					<label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Loại thay đổi</label>
					<select
						v-model="changeType"
						class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:focus:border-primary-400 dark:focus:ring-primary-900"
					>
						<option value="add_step">add_step</option>
						<option value="modify_step">modify_step</option>
						<option value="remove_step">remove_step</option>
						<option value="add_block">add_block</option>
						<option value="reorder">reorder</option>
						<option value="restructure">restructure</option>
					</select>
				</div>

				<div>
					<label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Sau bước nào?</label>
					<input
						v-model="positionContext"
						type="text"
						placeholder="Ví dụ: Sau bước Review Task"
						class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:focus:border-primary-400 dark:focus:ring-primary-900"
					>
				</div>

				<div>
					<label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Mô tả thay đổi bạn muốn...</label>
					<textarea
						v-model="description"
						rows="6"
						placeholder="Ví dụ: Thêm bước AI review sau Review Task để kiểm tra logic trước khi owner phê duyệt."
						class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:focus:border-primary-400 dark:focus:ring-primary-900"
					/>
				</div>

				<p v-if="submitError" class="text-sm text-red-600 dark:text-red-400">{{ submitError }}</p>

				<button
					class="inline-flex items-center rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
					:disabled="submitting"
					@click="submitRequest"
				>
					<span v-if="submitting">Đang tạo...</span>
					<span v-else>Tạo đề xuất</span>
				</button>
			</div>
		</div>

		<div class="rounded-lg bg-white shadow dark:bg-gray-800">
			<div class="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
				<div class="flex items-center justify-between gap-3">
					<h3 class="text-base font-semibold text-gray-900 dark:text-white">Danh sách WCR</h3>
					<button
						class="inline-flex items-center rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
						@click="refresh"
					>
						Làm mới
					</button>
				</div>
			</div>

			<div v-if="pending" class="px-4 py-12 text-center">
				<div class="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
				<p class="mt-2 text-sm text-gray-500 dark:text-gray-400">Đang tải đề xuất...</p>
			</div>

			<div v-else-if="error" class="px-4 py-8 text-center">
				<p class="text-sm text-red-600 dark:text-red-400">Không tải được WCR: {{ error.message }}</p>
			</div>

			<div v-else-if="!requests?.length" class="px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
				Chưa có đề xuất nào
			</div>

			<div v-else class="divide-y divide-gray-200 dark:divide-gray-700">
				<div v-for="request in requests" :key="request.id">
					<button
						type="button"
						class="w-full px-4 py-3 text-left transition hover:bg-gray-50 dark:hover:bg-gray-700/40"
						:class="request.id === selectedWcrId ? 'bg-gray-50 dark:bg-gray-700/40' : ''"
						@click="toggleWcr(request.id)"
					>
						<div class="flex items-start justify-between gap-3">
							<div class="min-w-0 flex items-center gap-2">
								<svg
									class="h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200"
									:class="request.id === selectedWcrId ? 'rotate-90' : ''"
									fill="none" viewBox="0 0 24 24" stroke="currentColor"
								>
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
								</svg>
								<div class="min-w-0">
									<p class="truncate text-sm font-medium text-gray-900 dark:text-white">{{ request.title }}</p>
									<p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{{ request.change_type }}</p>
								</div>
							</div>
							<span class="inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-medium" :class="statusBadge[request.status]">
								{{ request.status }}
							</span>
						</div>
					</button>
					<!-- Accordion detail -->
					<div
						v-if="request.id === selectedWcrId"
						class="border-t border-gray-100 bg-gray-50/50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800/50"
					>
						<p class="text-sm text-gray-700 dark:text-gray-300">{{ request.description || 'Không có mô tả.' }}</p>
						<div class="mt-2 flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
							<span>ID #{{ request.id }}</span>
							<span v-if="request.position_context">Vị trí: {{ request.position_context }}</span>
							<span>{{ request.date_created ? new Date(request.date_created).toLocaleString() : '—' }}</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>
