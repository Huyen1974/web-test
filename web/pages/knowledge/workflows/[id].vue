<script setup lang="ts">
import type { FieldConfig } from '~/composables/useDirectusTable';
import { readItems, updateItem } from '@directus/sdk';

const route = useRoute();
const workflowId = computed(() => Number(route.params.id));
const activeTab = computed(() => {
	const tab = typeof route.query.tab === 'string' ? route.query.tab : 'narrative';
	return ['narrative', 'matrix', 'diagram', 'wcr'].includes(tab) ? tab : 'narrative';
});

const tabs = [
	{ name: 'Mô tả', key: 'narrative' },
	{ name: 'Trình tự', key: 'matrix' },
	{ name: 'Sơ đồ BPMN', key: 'diagram' },
	{ name: 'Đề xuất thay đổi', key: 'wcr' },
];

// Narrative inline edit
const editingNarrative = ref(false);
const narrativeDraft = ref('');
const savingNarrative = ref(false);

function startEditNarrative() {
	narrativeDraft.value = workflow.value?.narrative || '';
	editingNarrative.value = true;
}

function cancelEditNarrative() {
	editingNarrative.value = false;
}

async function saveNarrative() {
	if (!workflow.value) return;
	savingNarrative.value = true;
	try {
		await useDirectus(updateItem('workflows', workflow.value.id, { narrative: narrativeDraft.value }));
		workflow.value.narrative = narrativeDraft.value;
		editingNarrative.value = false;
	} catch (err: any) {
		alert(err?.message || 'Không lưu được mô tả.');
	} finally {
		savingNarrative.value = false;
	}
}

// Fetch workflow header info
const {
	data: workflow,
	pending,
	error,
} = await useAsyncData(
	() => `workflow-header:${workflowId.value}`,
	async () => {
		if (!Number.isInteger(workflowId.value) || workflowId.value <= 0) {
			throw createError({ statusCode: 400, statusMessage: 'ID quy trình phải là số nguyên dương.' });
		}
		const items = await useDirectus<any[]>(
			readItems('workflows', {
				filter: { id: { _eq: workflowId.value } },
				fields: ['id', 'title', 'description', 'status', 'task_id', 'version', 'process_code', 'sort', 'date_updated', 'narrative', 'category_id.name', 'category_id.parent_id.name', 'category_id.parent_id.parent_id.name'],
				limit: 1,
			}),
		);
		return items?.[0] || null;
	},
	{ watch: [workflowId] },
);

useSeoMeta({
	title: () => workflow.value?.title || 'Chi tiết quy trình',
	description: () => workflow.value?.description || 'Xem chi tiết quy trình',
});

// Steps table config — reused across tabs
const stepFields: FieldConfig[] = [
	{ key: 'step_key', label: 'Mã bước', sortable: true },
	{ key: 'title', label: 'Tên bước', sortable: true },
	{ key: 'description', label: 'Mô tả', sortable: false, render: (v: string) => v || '—' },
	{ key: 'step_type', label: 'Loại bước', sortable: true },
	{ key: 'actor_type', label: 'Tác nhân', sortable: true, render: (v: string) => v || '—' },
];
</script>

<template>
	<div class="container mx-auto px-4 py-8">
		<div v-if="pending" class="py-12 text-center">
			<div class="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
			<p class="mt-2 text-gray-600 dark:text-gray-400">Đang tải quy trình...</p>
		</div>

		<div
			v-else-if="error || !workflow"
			class="rounded-md border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20"
		>
			<p class="text-red-800 dark:text-red-200">Lỗi tải quy trình: {{ error?.message || 'Không tìm thấy' }}</p>
		</div>

		<div v-else class="space-y-6">
			<div>
				<NuxtLink
					to="/knowledge/workflows"
					class="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
				>
					&larr; Quay lại danh sách quy trình
				</NuxtLink>

				<div class="flex flex-wrap items-start justify-between gap-4">
					<div>
						<div class="flex flex-wrap items-center gap-2">
							<h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ workflow.title }}</h1>
							<span
								v-if="workflow.process_code"
								class="inline-flex rounded-full bg-primary-100 px-2.5 py-1 text-xs font-medium text-primary-700 dark:bg-primary-900/40 dark:text-primary-300"
							>
								{{ workflow.process_code }}
							</span>
						</div>
						<p v-if="workflow.description" class="mt-1 text-gray-600 dark:text-gray-400">
							{{ workflow.description }}
						</p>
					</div>

					<div class="flex flex-wrap items-center gap-2">
						<span
							class="inline-flex rounded-full bg-gray-100 px-3 py-1 text-sm font-medium capitalize text-gray-700 dark:bg-gray-700/50 dark:text-gray-300"
						>
							{{ workflow.status }}
						</span>
						<span
							v-if="workflow.category_id?.name"
							class="inline-flex rounded-full bg-sky-100 px-3 py-1 text-sm font-medium text-sky-700 dark:bg-sky-900/40 dark:text-sky-300"
						>
							{{ workflow.category_id.name }}
						</span>
					</div>
				</div>
			</div>

			<div class="grid gap-4 sm:grid-cols-4">
				<div class="rounded-lg bg-white p-4 shadow dark:bg-gray-800">
					<p class="text-sm font-medium text-gray-500 dark:text-gray-400">STT</p>
					<p class="mt-1 text-lg font-semibold text-gray-900 dark:text-white">{{ workflow.sort ?? '—' }}</p>
				</div>
				<div class="rounded-lg bg-white p-4 shadow dark:bg-gray-800">
					<p class="text-sm font-medium text-gray-500 dark:text-gray-400">Phiên bản</p>
					<p class="mt-1 text-lg font-semibold text-gray-900 dark:text-white">{{ workflow.version }}</p>
				</div>
				<div class="rounded-lg bg-white p-4 shadow dark:bg-gray-800">
					<p class="text-sm font-medium text-gray-500 dark:text-gray-400">Công việc liên kết</p>
					<p class="mt-1 text-lg font-semibold text-gray-900 dark:text-white">{{ workflow.task_id || '—' }}</p>
				</div>
				<div class="rounded-lg bg-white p-4 shadow dark:bg-gray-800">
					<p class="text-sm font-medium text-gray-500 dark:text-gray-400">Mã quy trình</p>
					<p class="mt-1 text-lg font-semibold text-gray-900 dark:text-white">#{{ workflow.id }}</p>
				</div>
			</div>

			<div class="inline-flex">
				<nav class="flex gap-4">
					<NuxtLink
						v-for="tab in tabs"
						:key="tab.key"
						:href="`/knowledge/workflows/${workflowId}?tab=${tab.key}`"
						class="px-3 py-2 text-sm font-medium transition duration-300 rounded-button"
						:class="activeTab === tab.key
							? 'text-primary-700 bg-primary-100 dark:bg-primary-900 dark:text-white'
							: 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'"
					>
						{{ tab.name }}
					</NuxtLink>
				</nav>
			</div>

			<!-- Narrative tab: Mô tả -->
			<div v-if="activeTab === 'narrative'" class="space-y-6">
				<div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
					<div class="mb-4 flex items-center justify-between">
						<h3 class="text-base font-semibold text-gray-900 dark:text-white">Mô tả quy trình</h3>
						<button
							v-if="!editingNarrative"
							class="inline-flex items-center rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
							@click="startEditNarrative"
						>
							Chỉnh sửa
						</button>
					</div>

					<!-- View mode -->
					<div v-if="!editingNarrative">
						<p v-if="workflow.narrative" class="whitespace-pre-wrap text-sm leading-relaxed text-gray-700 dark:text-gray-300">
							{{ workflow.narrative }}
						</p>
						<p v-else class="text-sm italic text-gray-400 dark:text-gray-500">
							Chưa có mô tả. Nhấn Chỉnh sửa để thêm mô tả quy trình.
						</p>
					</div>

					<!-- Edit mode -->
					<div v-else class="space-y-3">
						<textarea
							v-model="narrativeDraft"
							rows="10"
							class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:focus:border-primary-400 dark:focus:ring-primary-900"
							placeholder="Nhập mô tả chi tiết về quy trình..."
						/>
						<div class="flex gap-2">
							<button
								class="inline-flex items-center rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
								:disabled="savingNarrative"
								@click="saveNarrative"
							>
								{{ savingNarrative ? 'Đang lưu...' : 'Lưu' }}
							</button>
							<button
								class="inline-flex items-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
								:disabled="savingNarrative"
								@click="cancelEditNarrative"
							>
								Hủy
							</button>
						</div>
					</div>
				</div>

				<!-- Hội đồng AI placeholder -->
				<div class="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center dark:border-gray-600 dark:bg-gray-800/50">
					<p class="text-sm font-medium text-gray-500 dark:text-gray-400">Hội đồng AI</p>
					<p class="mt-1 text-xs text-gray-400 dark:text-gray-500">CommentModule sẽ được lắp vào đây (Phase 2B)</p>
				</div>
			</div>

			<!-- Steps tab: DirectusDataTable -->
			<SharedDirectusDataTable
				v-if="activeTab === 'matrix'"
				collection="workflow_steps"
				:fields="stepFields"
				:filters="{ workflow_id: { _eq: workflowId } }"
				:default-sort="['sort_order', 'id']"
				:page-size="50"
				:searchable="false"
				title="Trình tự"
				:stt="true"
			>
				<template #cell-step_type="{ value }">
					<span
						class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium"
						:class="{
							'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300': value === 'action',
							'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300': value === 'condition',
							'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300': value === 'agent_call',
							'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300': value === 'human_checkpoint',
							'bg-slate-100 text-slate-700 dark:bg-slate-700/50 dark:text-slate-200': value === 'wait_for_event',
							'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300': value === 'loop',
							'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/40 dark:text-fuchsia-300': value === 'parallel',
						}"
					>
						{{ value }}
					</span>
				</template>
			</SharedDirectusDataTable>

			<!-- Diagram tab: BPMN viewer + steps table below -->
			<template v-else-if="activeTab === 'diagram'">
				<NuxtErrorBoundary>
					<ModulesWorkflowModuleWorkflowViewer :workflow-id="workflow.id" />

					<template #error="{ error: bpmnError }">
						<div class="rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-900/20">
							<p class="text-sm font-medium text-red-700 dark:text-red-300">Không thể tải sơ đồ quy trình</p>
							<p class="mt-1 text-xs text-red-500 dark:text-red-400">{{ bpmnError?.message || 'Lỗi không xác định' }}</p>
						</div>
					</template>
				</NuxtErrorBoundary>

				<!-- Steps table below diagram for reference -->
				<SharedDirectusDataTable
					collection="workflow_steps"
					:fields="stepFields"
					:filters="{ workflow_id: { _eq: workflowId } }"
					:default-sort="['sort_order', 'id']"
					:page-size="50"
					:searchable="false"
					title="Chi tiết các bước"
					:stt="true"
				>
					<template #cell-step_type="{ value }">
						<span
							class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium"
							:class="{
								'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300': value === 'action',
								'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300': value === 'condition',
								'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300': value === 'agent_call',
								'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300': value === 'human_checkpoint',
								'bg-slate-100 text-slate-700 dark:bg-slate-700/50 dark:text-slate-200': value === 'wait_for_event',
								'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300': value === 'loop',
								'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/40 dark:text-fuchsia-300': value === 'parallel',
							}"
						>
							{{ value }}
						</span>
					</template>
				</SharedDirectusDataTable>
			</template>

			<!-- WCR tab: WCR panel + steps table below for reference -->
			<template v-else-if="activeTab === 'wcr'">
				<ModulesWorkflowModulePartialsWcrIntakePanel
					:workflow-id="workflow.id"
				/>

				<!-- Steps table below WCR for reference -->
				<SharedDirectusDataTable
					collection="workflow_steps"
					:fields="stepFields"
					:filters="{ workflow_id: { _eq: workflowId } }"
					:default-sort="['sort_order', 'id']"
					:page-size="50"
					:searchable="false"
					title="Quy trình hiện tại (tham chiếu)"
					:stt="true"
				>
					<template #cell-step_type="{ value }">
						<span
							class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium"
							:class="{
								'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300': value === 'action',
								'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300': value === 'condition',
								'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300': value === 'agent_call',
								'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300': value === 'human_checkpoint',
								'bg-slate-100 text-slate-700 dark:bg-slate-700/50 dark:text-slate-200': value === 'wait_for_event',
								'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300': value === 'loop',
								'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/40 dark:text-fuchsia-300': value === 'parallel',
							}"
						>
							{{ value }}
						</span>
					</template>
				</SharedDirectusDataTable>
			</template>

			<ModulesCommentModule
				v-if="workflow.task_id"
				:task-id="workflow.task_id"
				title="Quản trị quy trình"
				show-checkpoints
			/>
		</div>
	</div>
</template>
