<script setup lang="ts">
import type { WorkflowActorType, WorkflowStep, WorkflowStepRelation, WorkflowStepType } from '~/types/workflow-dsl';
import { useWorkflowMatrix } from '~/composables/useWorkflows';

const props = defineProps<{
	workflowId: number;
}>();

const emit = defineEmits<{
	'step-selected': [stepKey: string];
}>();

const requestKey = computed(() => `workflow-matrix:${props.workflowId}`);

const {
	data,
	pending,
	error,
	refresh,
} = await useAsyncData(
	() => requestKey.value,
	async () => useWorkflowMatrix(props.workflowId),
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
	if (!incoming.length) return 'Bat dau quy trinh';

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
	if (!outgoing.length) return 'Ket thuc';

	return outgoing
		.map((relation) => {
			const toStep = stepById.value[relation.to_step_id];
			const prefix = relation.label ? `${relation.label}: ` : '';
			return `→ ${prefix}${toStep?.title || relation.to_step_id}`;
		})
		.join(' | ');
}
</script>

<template>
	<div class="overflow-hidden rounded-lg bg-white shadow dark:bg-gray-800">
		<div class="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
			<div class="flex items-center justify-between gap-3">
				<h3 class="text-base font-semibold text-gray-900 dark:text-white">Bang buoc</h3>
				<button
					class="inline-flex items-center rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
					@click="refresh"
				>
					Lam moi
				</button>
			</div>
		</div>

		<div class="overflow-x-auto">
			<table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
				<thead class="bg-gray-50 dark:bg-gray-900/40">
					<tr>
						<th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">STT</th>
						<th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Ma buoc</th>
						<th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Ten buoc</th>
						<th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Trigger vao</th>
						<th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Trigger ra</th>
						<th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Mo ta nhiem vu</th>
						<th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Loai buoc</th>
						<th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Actor</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-200 dark:divide-gray-700">
					<tr v-if="pending">
						<td colspan="8" class="px-4 py-12 text-center">
							<div class="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
							<p class="mt-2 text-sm text-gray-500 dark:text-gray-400">Dang tai danh sach buoc...</p>
						</td>
					</tr>

					<tr v-else-if="error">
						<td colspan="8" class="px-4 py-8 text-center">
							<p class="text-sm text-red-600 dark:text-red-400">
								Khong tai duoc ma tran buoc: {{ error.message }}
							</p>
						</td>
					</tr>

					<tr v-else-if="!steps.length">
						<td colspan="8" class="px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
							Chua co buoc nao
						</td>
					</tr>

					<tr
						v-for="step in steps"
						v-else
						:key="step.id"
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
				</tbody>
			</table>
		</div>
	</div>
</template>
