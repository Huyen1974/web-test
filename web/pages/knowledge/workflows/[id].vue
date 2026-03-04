<script setup lang="ts">
import type { FieldConfig } from '~/composables/useDirectusTable';
import { readItems, updateItem } from '@directus/sdk';
import type { TimelineStep } from '~/components/modules/workflow-module/partials/StepsTimeline.vue';

const route = useRoute();
const workflowId = computed(() => Number(route.params.id));
const activeTab = computed(() => {
	const tab = typeof route.query.tab === 'string' ? route.query.tab : 'narrative';
	return ['narrative', 'matrix', 'diagram', 'wcr'].includes(tab) ? tab : 'narrative';
});

const tabs = [
	{ name: 'Mô tả', key: 'narrative' },
	{ name: 'Trình tự', key: 'matrix' },
	{ name: 'Tiến trình thực hiện', key: 'diagram' },
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

// Fetch steps for timeline — includes detail fields for accordion expansion
const { data: stepsRaw } = await useAsyncData(
	() => `workflow-steps:${workflowId.value}`,
	async () => {
		if (!Number.isInteger(workflowId.value) || workflowId.value <= 0) return [];
		return await useDirectus<Array<{
			id: number;
			title: string;
			description: string | null;
			actor_type: string | null;
			step_type: string | null;
			sort_order: number;
			trigger_in_text: string | null;
			trigger_out_text: string | null;
			config: Record<string, any> | null;
		}>>(
			readItems('workflow_steps', {
				filter: { workflow_id: { _eq: workflowId.value } },
				fields: ['id', 'title', 'description', 'actor_type', 'step_type', 'sort_order', 'trigger_in_text', 'trigger_out_text', 'config'],
				sort: ['sort_order', 'id'],
				limit: -1,
			}),
		);
	},
	{ watch: [workflowId] },
);

const timelineSteps = computed<TimelineStep[]>(() =>
	(stepsRaw.value || []).map((step) => ({
		id: step.id,
		title: step.title,
		description: step.description,
		actorType: step.actor_type,
		stepType: step.step_type,
		triggerIn: step.trigger_in_text,
		triggerOut: step.trigger_out_text,
		config: step.config,
		status: 'pending' as const,
	})),
);

// [3] Auto-position: scroll to current step at position 3 from top
const tableScrollRef = ref<HTMLElement | null>(null);
const timelineScrollRef = ref<HTMLElement | null>(null);

function scrollToCurrentStep() {
	const currentIndex = timelineSteps.value.findIndex((s) => s.status === 'current');
	if (currentIndex < 0) return;

	// Target: show current step at position 3 (index 2 visible above it)
	const targetIndex = Math.max(0, currentIndex - 2);

	nextTick(() => {
		// Scroll table
		if (tableScrollRef.value) {
			const rows = tableScrollRef.value.querySelectorAll('tbody tr');
			if (rows[targetIndex]) {
				rows[targetIndex].scrollIntoView({ block: 'start', behavior: 'smooth' });
			}
		}
		// Scroll timeline
		if (timelineScrollRef.value) {
			const items = timelineScrollRef.value.querySelectorAll('[data-step-index]');
			if (items[targetIndex]) {
				items[targetIndex].scrollIntoView({ block: 'start', behavior: 'smooth' });
			}
		}
	});
}

// Auto-scroll when diagram tab activates
watch(activeTab, (tab) => {
	if (tab === 'diagram') {
		nextTick(() => scrollToCurrentStep());
	}
});

onMounted(() => {
	if (activeTab.value === 'diagram') {
		nextTick(() => scrollToCurrentStep());
	}
});

// [5] Info cards collapse
const showMetaDetails = ref(false);

// Status display helpers
const statusDisplay: Record<string, { label: string; class: string }> = {
	draft: { label: 'Nháp', class: 'bg-gray-100 text-gray-700 dark:bg-gray-700/50 dark:text-gray-300' },
	active: { label: 'Hoạt động', class: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
	archived: { label: 'Lưu trữ', class: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
};

function getStatusInfo(status: string) {
	return statusDisplay[status] || { label: status, class: 'bg-gray-100 text-gray-700 dark:bg-gray-700/50 dark:text-gray-300' };
}

// Build breadcrumb from category hierarchy
const categoryBreadcrumb = computed(() => {
	if (!workflow.value?.category_id) return '';
	const parts: string[] = [];
	if (workflow.value.category_id?.parent_id?.parent_id?.name) {
		parts.push(workflow.value.category_id.parent_id.parent_id.name);
	}
	if (workflow.value.category_id?.parent_id?.name) {
		parts.push(workflow.value.category_id.parent_id.name);
	}
	if (workflow.value.category_id?.name) {
		parts.push(workflow.value.category_id.name);
	}
	return parts.join(' / ');
});
</script>

<template>
	<div class="container mx-auto px-4 py-6 lg:px-6">
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

		<div v-else class="space-y-4">
			<!-- [5] Reorganized header: Title + Status prominent, metadata compressed -->
			<div>
				<NuxtLink
					to="/knowledge/workflows"
					class="mb-3 inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
				>
					&larr; Quay lại danh sách quy trình
				</NuxtLink>

				<!-- Primary header: Title + Status + Category -->
				<div class="flex flex-wrap items-start justify-between gap-3">
					<div class="min-w-0 flex-1">
						<div class="flex flex-wrap items-center gap-2">
							<h1 class="text-xl font-bold leading-tight text-gray-900 dark:text-white lg:text-2xl">{{ workflow.title }}</h1>
							<span
								class="inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold"
								:class="getStatusInfo(workflow.status).class"
							>
								{{ getStatusInfo(workflow.status).label }}
							</span>
						</div>
						<p v-if="workflow.description" class="mt-1 text-sm text-gray-600 dark:text-gray-400">
							{{ workflow.description }}
						</p>
						<!-- Category breadcrumb -->
						<p v-if="categoryBreadcrumb" class="mt-1 text-xs text-gray-400 dark:text-gray-500">
							{{ categoryBreadcrumb }}
						</p>
					</div>

					<!-- Compact metadata badges -->
					<div class="flex shrink-0 flex-wrap items-center gap-1.5">
						<span
							v-if="workflow.process_code"
							class="inline-flex rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700/60 dark:text-gray-400"
							:title="`Mã quy trình: ${workflow.process_code}`"
						>
							{{ workflow.process_code }}
						</span>
						<span
							class="inline-flex rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-700/60 dark:text-gray-400"
							:title="`Phiên bản ${workflow.version}`"
						>
							v{{ workflow.version }}
						</span>
						<span
							v-if="workflow.sort != null"
							class="inline-flex rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-700/60 dark:text-gray-400"
							:title="`STT: ${workflow.sort}`"
						>
							#{{ workflow.sort }}
						</span>
						<button
							v-if="workflow.task_id"
							class="inline-flex items-center gap-1 rounded bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-600 transition-colors hover:bg-primary-100 dark:bg-primary-900/30 dark:text-primary-400 dark:hover:bg-primary-900/50"
							:title="`Công việc liên kết: Task #${workflow.task_id}`"
							@click="showMetaDetails = !showMetaDetails"
						>
							Task #{{ workflow.task_id }}
						</button>
					</div>
				</div>
			</div>

			<!-- Tab navigation -->
			<nav class="flex gap-1 border-b border-gray-200 dark:border-gray-700">
				<NuxtLink
					v-for="tab in tabs"
					:key="tab.key"
					:href="`/knowledge/workflows/${workflowId}?tab=${tab.key}`"
					class="relative px-4 py-2.5 text-sm font-medium transition-colors duration-200"
					:class="activeTab === tab.key
						? 'text-primary-700 dark:text-primary-300'
						: 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'"
				>
					{{ tab.name }}
					<span
						v-if="activeTab === tab.key"
						class="absolute inset-x-0 -bottom-px h-0.5 bg-primary-600 dark:bg-primary-400"
					/>
				</NuxtLink>
			</nav>

			<!-- Narrative tab: Mo ta -->
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

				<!-- Hoi dong AI placeholder -->
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

			<!-- [1][2][3][4][6] Diagram tab: Golden ratio layout with scrollable containers -->
			<div v-else-if="activeTab === 'diagram'" class="grid gap-4 lg:grid-cols-[38fr_62fr]">
				<!-- Left: Compact steps table (~38%) with scroll -->
				<div class="flex flex-col rounded-lg bg-white shadow dark:bg-gray-800">
					<div class="shrink-0 border-b border-gray-200 px-4 py-3 dark:border-gray-700">
						<h3 class="text-sm font-semibold text-gray-900 dark:text-white">Trình tự</h3>
						<p class="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{{ timelineSteps.length }} bước</p>
					</div>
					<div
						ref="tableScrollRef"
						class="scrollbar-thin min-h-0 flex-1 overflow-y-auto"
						style="max-height: calc(100vh - 280px);"
					>
						<table class="min-w-full">
							<thead class="sticky top-0 z-10 bg-gray-50 dark:bg-gray-900/60">
								<tr>
									<th class="w-12 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">STT</th>
									<th class="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Tên bước</th>
									<th class="w-24 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Tác nhân</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-gray-100 dark:divide-gray-700/50">
								<tr v-if="!timelineSteps.length">
									<td colspan="3" class="px-3 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
										Chưa có bước nào
									</td>
								</tr>
								<tr
									v-for="(step, index) in timelineSteps"
									v-else
									:key="step.id"
									:data-table-row-index="index"
									class="transition-colors duration-150"
									:class="{
										'bg-emerald-50/60 dark:bg-emerald-900/10': step.status === 'done',
										'bg-amber-50/60 dark:bg-amber-900/10': step.status === 'current',
										'hover:bg-gray-50 dark:hover:bg-gray-700/30': step.status === 'pending',
									}"
								>
									<td
										class="whitespace-nowrap px-3 py-2 text-xs tabular-nums"
										:class="{
											'font-semibold text-emerald-600 dark:text-emerald-400': step.status === 'done',
											'font-bold text-amber-600 dark:text-amber-400': step.status === 'current',
											'text-gray-400 dark:text-gray-500': step.status === 'pending',
										}"
									>{{ index + 1 }}</td>
									<td
										class="px-3 py-2 text-sm"
										:class="{
											'text-emerald-700 dark:text-emerald-300': step.status === 'done',
											'font-medium text-amber-700 dark:text-amber-300': step.status === 'current',
											'text-gray-700 dark:text-gray-300': step.status === 'pending',
										}"
									>{{ step.title }}</td>
									<td class="whitespace-nowrap px-3 py-2 text-xs text-gray-400 dark:text-gray-500">{{ step.actorType || '—' }}</td>
								</tr>
							</tbody>
						</table>
					</div>
				</div>

				<!-- Right: Vertical Steps Timeline (~62%) with scroll -->
				<div class="flex flex-col rounded-lg bg-white shadow dark:bg-gray-800">
					<div class="shrink-0 border-b border-gray-200 px-4 py-3 dark:border-gray-700">
						<h3 class="text-sm font-semibold text-gray-900 dark:text-white">Tiến trình thực hiện</h3>
						<p class="mt-0.5 text-xs text-gray-400 dark:text-gray-500">Bấm vào bước để xem chi tiết</p>
					</div>
					<div
						ref="timelineScrollRef"
						class="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-4 py-3"
						style="max-height: calc(100vh - 280px);"
					>
						<div v-if="!timelineSteps.length" class="py-8 text-center text-sm text-gray-400 dark:text-gray-500">
							Chưa có bước nào
						</div>
						<ModulesWorkflowModulePartialsStepsTimeline
							v-else
							:steps="timelineSteps"
						/>
					</div>
				</div>
			</div>

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

<style scoped>
/* [2] Custom scrollbar styling */
.scrollbar-thin::-webkit-scrollbar {
	width: 5px;
}
.scrollbar-thin::-webkit-scrollbar-track {
	background: transparent;
}
.scrollbar-thin::-webkit-scrollbar-thumb {
	background-color: rgba(156, 163, 175, 0.3);
	border-radius: 9999px;
}
.scrollbar-thin::-webkit-scrollbar-thumb:hover {
	background-color: rgba(156, 163, 175, 0.5);
}

:root.dark .scrollbar-thin::-webkit-scrollbar-thumb {
	background-color: rgba(75, 85, 99, 0.4);
}
:root.dark .scrollbar-thin::-webkit-scrollbar-thumb:hover {
	background-color: rgba(75, 85, 99, 0.6);
}
</style>
