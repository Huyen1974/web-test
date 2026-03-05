<script setup lang="ts">
import { readItems } from '@directus/sdk';
import type { WorkflowActorType, WorkflowStep, WorkflowStepRelation, WorkflowStepType } from '~/types/workflow-dsl';

const props = withDefaults(
	defineProps<{
		workflowId: number;
		showInsertMarks?: boolean;
		pendingWcrs?: Array<{ id: number; title: string; change_type: string; position_context: string | null; status: string }>;
	}>(),
	{
		showInsertMarks: false,
		pendingWcrs: () => [],
	},
);

const emit = defineEmits<{
	'step-selected': [stepKey: string];
	'insert-at': [afterStepId: number, afterIndex: number];
}>();

const requestKey = computed(() => `workflow-matrix:${props.workflowId}`);

const {
	data,
	pending,
	error,
	refresh,
} = await useAsyncData(
	() => requestKey.value,
	async () => {
		const [steps, relations] = await Promise.all([
			useDirectus<WorkflowStep[]>(
				readItems('workflow_steps', {
					filter: { workflow_id: { _eq: props.workflowId } },
					fields: [
						'id',
						'workflow_id',
						'step_key',
						'step_type',
						'title',
						'description',
						'actor_type',
						'sort_order',
						'trigger_in_text',
						'trigger_out_text',
					],
					sort: ['sort_order', 'id'],
					limit: -1,
				}),
			),
			useDirectus<WorkflowStepRelation[]>(
				readItems('workflow_step_relations', {
					filter: { workflow_id: { _eq: props.workflowId } },
					fields: ['id', 'workflow_id', 'from_step_id', 'to_step_id', 'relation_type', 'label', 'sort_order'],
					sort: ['sort_order', 'id'],
					limit: -1,
				}),
			),
		]);

		return {
			steps,
			relations,
		};
	},
	{
		watch: [() => props.workflowId],
	},
);

const steps = computed(() => data.value?.steps || []);
const relations = computed(() => data.value?.relations || []);
const stepById = computed(() =>
	Object.fromEntries(steps.value.map((step) => [step.id, step])) as Record<number, WorkflowStep>,
);

const stepTypeMeta: Record<WorkflowStepType, string> = {
	action: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
	condition: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
	agent_call: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
	human_checkpoint: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
	wait_for_event: 'bg-slate-100 text-slate-700 dark:bg-slate-700/50 dark:text-slate-200',
	loop: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
	parallel: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/40 dark:text-fuchsia-300',
};

function actorLabel(actor?: WorkflowActorType | null) {
	return actor || '—';
}

function stepTypeBadge(stepType: WorkflowStepType) {
	return stepTypeMeta[stepType] || 'bg-gray-100 text-gray-700 dark:bg-gray-700/50 dark:text-gray-300';
}

function deriveTriggerIn(step: WorkflowStep, relationRows: WorkflowStepRelation[]) {
	if (step.trigger_in_text?.trim()) return step.trigger_in_text;

	const incoming = relationRows.filter((relation) => relation.to_step_id === step.id);
	if (!incoming.length) return 'Bắt đầu quy trình';

	return incoming
		.map((relation) => {
			const fromStep = stepById.value[relation.from_step_id];
			const prefix = relation.label ? `${relation.label}: ` : '';
			return `← ${prefix}${fromStep?.title || relation.from_step_id}`;
		})
		.join(' | ');
}

function deriveTriggerOut(step: WorkflowStep, relationRows: WorkflowStepRelation[]) {
	if (step.trigger_out_text?.trim()) return step.trigger_out_text;

	const outgoing = relationRows.filter((relation) => relation.from_step_id === step.id);
	if (!outgoing.length) return 'Kết thúc';

	return outgoing
		.map((relation) => {
			const toStep = stepById.value[relation.to_step_id];
			const prefix = relation.label ? `${relation.label}: ` : '';
			return `→ ${prefix}${toStep?.title || relation.to_step_id}`;
		})
		.join(' | ');
}

/** Parse position_context to extract step ID: "after_step:123|..." → 123 */
function parsePositionStepId(ctx: string | null): number | null {
	if (!ctx) return null;
	const match = ctx.match(/^after_step:(\d+)/);
	return match ? Number(match[1]) : null;
}

/** Get WCRs positioned after a given step */
function getWcrsAfterStep(stepId: number) {
	return (props.pendingWcrs || []).filter((wcr) => parsePositionStepId(wcr.position_context) === stepId);
}

const wcrStatusBadge: Record<string, string> = {
	draft: 'bg-slate-100 text-slate-700 dark:bg-slate-700/50 dark:text-slate-200',
	ai_reviewing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
	needs_clarification: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
	ready_for_approval: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
};
</script>

<template>
	<div class="overflow-hidden rounded-lg bg-white shadow dark:bg-gray-800">
		<div class="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
			<div class="flex items-center justify-between gap-3">
				<h3 class="text-base font-semibold text-gray-900 dark:text-white">Bảng bước</h3>
				<button
					class="inline-flex items-center rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
					@click="refresh"
				>
					Làm mới
				</button>
			</div>
		</div>

		<div class="overflow-x-auto">
			<!-- TABLE-EXCEPTION: Dead code — not referenced, pending deletion -->
		<table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
				<thead class="bg-gray-50 dark:bg-gray-900/40">
					<tr>
						<th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">STT</th>
						<th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Mã bước</th>
						<th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Tên bước</th>
						<th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Trigger vào</th>
						<th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Trigger ra</th>
						<th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Mô tả nhiệm vụ</th>
						<th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Loại bước</th>
						<th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Tác nhân</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-200 dark:divide-gray-700">
					<tr v-if="pending">
						<td colspan="8" class="px-4 py-12 text-center">
							<div class="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
							<p class="mt-2 text-sm text-gray-500 dark:text-gray-400">Đang tải danh sách bước...</p>
						</td>
					</tr>

					<tr v-else-if="error">
						<td colspan="8" class="px-4 py-8 text-center">
							<p class="text-sm text-red-600 dark:text-red-400">
								Không tải được ma trận bước: {{ error.message }}
							</p>
						</td>
					</tr>

					<tr v-else-if="!steps.length">
						<td colspan="8" class="px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
							Chưa có bước nào
						</td>
					</tr>

					<template v-for="(step, index) in steps" v-else :key="step.id">
						<!-- Step data row -->
						<tr
							class="cursor-pointer transition hover:bg-gray-50 dark:hover:bg-gray-700/40"
							@click="emit('step-selected', step.step_key)"
						>
							<td class="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
								{{ step.sort_order ?? '—' }}
							</td>
							<td class="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
								{{ step.step_key }}
							</td>
							<td class="px-4 py-3 text-sm text-gray-900 dark:text-white">
								{{ step.title }}
							</td>
							<td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
								{{ deriveTriggerIn(step, relations) }}
							</td>
							<td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
								{{ deriveTriggerOut(step, relations) }}
							</td>
							<td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
								{{ step.description || '—' }}
							</td>
							<td class="whitespace-nowrap px-4 py-3 text-sm">
								<span class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium" :class="stepTypeBadge(step.step_type)">
									{{ step.step_type }}
								</span>
							</td>
							<td class="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
								{{ actorLabel(step.actor_type) }}
							</td>
						</tr>

						<!-- Inline WCR rows for this step -->
						<tr
							v-for="wcr in getWcrsAfterStep(step.id)"
							:key="`wcr-${wcr.id}`"
							class="border-l-4 border-l-amber-400 bg-amber-50/60 dark:border-l-amber-600 dark:bg-amber-900/10"
						>
							<td class="px-4 py-2 text-xs text-amber-600 dark:text-amber-400">WCR</td>
							<td class="px-4 py-2 text-xs text-amber-700 dark:text-amber-300">#{{ wcr.id }}</td>
							<td colspan="4" class="px-4 py-2 text-sm text-amber-800 dark:text-amber-200">
								{{ wcr.title }}
							</td>
							<td class="px-4 py-2 text-xs">
								<span class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium" :class="wcrStatusBadge[wcr.status] || 'bg-gray-100 text-gray-600'">
									{{ wcr.change_type }}
								</span>
							</td>
							<td class="px-4 py-2 text-xs">
								<span class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium" :class="wcrStatusBadge[wcr.status] || 'bg-gray-100 text-gray-600'">
									{{ wcr.status }}
								</span>
							</td>
						</tr>

						<!-- Insert mark "+" between rows -->
						<tr
							v-if="showInsertMarks && index < steps.length - 1"
							class="group"
						>
							<td colspan="8" class="px-4 py-0">
								<div class="flex h-6 items-center">
									<button
										type="button"
										class="flex h-5 w-5 items-center justify-center rounded-full border border-dashed border-gray-300 bg-white text-gray-400 opacity-0 transition-all duration-200 hover:border-amber-400 hover:bg-amber-50 hover:text-amber-600 group-hover:opacity-100 dark:border-gray-600 dark:bg-gray-800 dark:hover:border-amber-500 dark:hover:bg-amber-900/30 dark:hover:text-amber-400"
										title="Thêm đề xuất tại đây"
										@click="emit('insert-at', step.id, index)"
									>
										<svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
											<path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
										</svg>
									</button>
								</div>
							</td>
						</tr>
					</template>
				</tbody>
			</table>
		</div>
	</div>
</template>
