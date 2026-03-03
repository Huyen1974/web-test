<script setup lang="ts">
import type { WorkflowChangeRequest, WorkflowChangeType } from '~/types/workflow-dsl';
import { createWorkflowChangeRequest, useWorkflowChangeRequests } from '~/composables/useWorkflows';

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
	async () => useWorkflowChangeRequests(props.workflowId),
	{
		watch: [() => props.workflowId],
	},
);

const selectedWcr = computed(() => requests.value?.find((request) => request.id === selectedWcrId.value) || requests.value?.[0] || null);

watch(
	requests,
	(value) => {
		if (!value?.length) {
			selectedWcrId.value = null;
			return;
		}

		if (!selectedWcrId.value || !value.some((item) => item.id === selectedWcrId.value)) {
			selectedWcrId.value = value[0].id;
		}
	},
	{ immediate: true },
);

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
		submitError.value = 'Can mo ta thay doi truoc khi tao de xuat.';
		return;
	}

	submitError.value = '';
	submitting.value = true;

	try {
		const summary = description.value.trim().split('\n')[0].slice(0, 80);
		const created = await createWorkflowChangeRequest({
			workflow_id: props.workflowId,
			change_type: changeType.value,
			title: summary || 'Workflow change request',
			description: description.value.trim(),
			position_context: positionContext.value.trim() || null,
		});

		description.value = '';
		positionContext.value = '';
		selectedWcrId.value = created.id;
		await refresh();
		emit('wcr-created', created);
	} catch (err: any) {
		submitError.value = err?.data?.statusMessage || err?.message || 'Khong tao duoc de xuat thay doi.';
	} finally {
		submitting.value = false;
	}
}
</script>

<template>
	<div class="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
		<div class="rounded-lg bg-white p-4 shadow dark:bg-gray-800">
			<div class="mb-4">
				<h3 class="text-base font-semibold text-gray-900 dark:text-white">De xuat thay doi</h3>
				<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
					Mo ta bang ngon ngu tu nhien. He thong se tao WCR o trang thai <code>draft</code>.
				</p>
			</div>

			<div class="space-y-4">
				<div>
					<label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Loai thay doi</label>
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
					<label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Sau buoc nao?</label>
					<input
						v-model="positionContext"
						type="text"
						placeholder="Vi du: Sau buoc Review Task"
						class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:focus:border-primary-400 dark:focus:ring-primary-900"
					>
				</div>

				<div>
					<label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Mo ta thay doi ban muon...</label>
					<textarea
						v-model="description"
						rows="6"
						placeholder="Vi du: Them buoc AI review sau Review Task de kiem tra logic truoc khi owner phe duyet."
						class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:focus:border-primary-400 dark:focus:ring-primary-900"
					/>
				</div>

				<p v-if="submitError" class="text-sm text-red-600 dark:text-red-400">{{ submitError }}</p>

				<button
					class="inline-flex items-center rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
					:disabled="submitting"
					@click="submitRequest"
				>
					<span v-if="submitting">Dang tao...</span>
					<span v-else>Tao de xuat</span>
				</button>
			</div>
		</div>

		<div class="rounded-lg bg-white shadow dark:bg-gray-800">
			<div class="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
				<div class="flex items-center justify-between gap-3">
					<h3 class="text-base font-semibold text-gray-900 dark:text-white">Danh sach WCR</h3>
					<button
						class="inline-flex items-center rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
						@click="refresh"
					>
						Lam moi
					</button>
				</div>
			</div>

			<div v-if="pending" class="px-4 py-12 text-center">
				<div class="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
				<p class="mt-2 text-sm text-gray-500 dark:text-gray-400">Dang tai de xuat...</p>
			</div>

			<div v-else-if="error" class="px-4 py-8 text-center">
				<p class="text-sm text-red-600 dark:text-red-400">Khong tai duoc WCR: {{ error.message }}</p>
			</div>

			<div v-else-if="!requests?.length" class="px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
				Chua co de xuat nao
			</div>

			<div v-else class="grid divide-y divide-gray-200 dark:divide-gray-700">
				<button
					v-for="request in requests"
					:key="request.id"
					type="button"
					class="w-full px-4 py-3 text-left transition hover:bg-gray-50 dark:hover:bg-gray-700/40"
					:class="request.id === selectedWcr?.id ? 'bg-gray-50 dark:bg-gray-700/40' : ''"
					@click="selectedWcrId = request.id"
				>
					<div class="flex items-start justify-between gap-3">
						<div class="min-w-0">
							<p class="truncate text-sm font-medium text-gray-900 dark:text-white">{{ request.title }}</p>
							<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{{ request.change_type }}</p>
						</div>
						<span class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium" :class="statusBadge[request.status]">
							{{ request.status }}
						</span>
					</div>
				</button>
			</div>

			<div v-if="selectedWcr" class="border-t border-gray-200 px-4 py-4 dark:border-gray-700">
				<h4 class="text-sm font-semibold text-gray-900 dark:text-white">{{ selectedWcr.title }}</h4>
				<p class="mt-2 text-sm text-gray-600 dark:text-gray-400">{{ selectedWcr.description || 'Khong co mo ta.' }}</p>
				<div class="mt-3 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
					<span>ID #{{ selectedWcr.id }}</span>
					<span v-if="selectedWcr.position_context">Vi tri: {{ selectedWcr.position_context }}</span>
					<span>{{ selectedWcr.date_created ? new Date(selectedWcr.date_created).toLocaleString() : 'Chua co ngay tao' }}</span>
				</div>
			</div>
		</div>
	</div>
</template>
