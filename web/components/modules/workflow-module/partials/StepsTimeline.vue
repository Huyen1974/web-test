<script setup lang="ts">
/**
 * Vertical Steps Timeline — Tailwind CSS only
 * Features: accordion expand/collapse, auto-position to current step,
 * scrollable container, status-based coloring.
 *
 * Props:
 *   steps — array of workflow steps (sorted by sort_order)
 *   Each step carries a `status` for checkpoint integration.
 */

export type StepStatus = 'done' | 'current' | 'pending';

export interface TimelineStep {
	id: number;
	title: string;
	actorType?: string | null;
	stepType?: string | null;
	description?: string | null;
	triggerIn?: string | null;
	triggerOut?: string | null;
	config?: Record<string, any> | null;
	status: StepStatus;
}

const props = defineProps<{
	steps: TimelineStep[];
}>();

const emit = defineEmits<{
	(e: 'scrollToIndex', index: number): void;
}>();

const expandedStepId = ref<number | null>(null);

function toggleStep(stepId: number) {
	expandedStepId.value = expandedStepId.value === stepId ? null : stepId;
}

// Auto-expand current step on mount
const currentStepIndex = computed(() => props.steps.findIndex((s) => s.status === 'current'));

onMounted(() => {
	if (currentStepIndex.value >= 0) {
		expandedStepId.value = props.steps[currentStepIndex.value].id;
	}
});

const actorLabel: Record<string, string> = {
	user: 'Người dùng',
	claude_ai: 'Claude AI',
	claude_code: 'Claude Code',
	gemini: 'Gemini',
	gpt: 'GPT',
	system: 'Hệ thống',
	orchestrator: 'Điều phối',
	codex: 'Codex',
};

function getActorLabel(actorType?: string | null): string {
	if (!actorType) return '';
	return actorLabel[actorType] || actorType;
}

const stepTypeLabel: Record<string, string> = {
	action: 'Hành động',
	agent_call: 'Gọi AI',
	condition: 'Điều kiện',
	wait_for_event: 'Chờ sự kiện',
	human_checkpoint: 'Kiểm tra',
	loop: 'Vòng lặp',
	parallel: 'Song song',
};

function getStepTypeLabel(stepType?: string | null): string {
	if (!stepType) return '';
	return stepTypeLabel[stepType] || stepType;
}

const statusStyle: Record<StepStatus, { ring: string; bg: string; text: string; line: string; stepBg: string }> = {
	done: {
		ring: 'ring-emerald-300 dark:ring-emerald-700',
		bg: 'bg-emerald-500 dark:bg-emerald-600',
		text: 'text-white',
		line: 'bg-emerald-300 dark:bg-emerald-700',
		stepBg: 'hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10',
	},
	current: {
		ring: 'ring-amber-300 dark:ring-amber-600',
		bg: 'bg-amber-500 dark:bg-amber-500',
		text: 'text-white',
		line: 'bg-gray-200 dark:bg-gray-700',
		stepBg: 'bg-amber-50/60 dark:bg-amber-900/15',
	},
	pending: {
		ring: 'ring-gray-200 dark:ring-gray-700',
		bg: 'bg-white dark:bg-gray-800',
		text: 'text-gray-400 dark:text-gray-500',
		line: 'bg-gray-200 dark:bg-gray-700',
		stepBg: 'hover:bg-gray-50/50 dark:hover:bg-gray-700/30',
	},
};

const stepTypeBadge: Record<string, string> = {
	action: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
	agent_call: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
	condition: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
	wait_for_event: 'bg-slate-100 text-slate-700 dark:bg-slate-700/50 dark:text-slate-200',
	human_checkpoint: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
	loop: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
	parallel: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/40 dark:text-fuchsia-300',
};

function hasDetails(step: TimelineStep): boolean {
	return !!(step.description || step.triggerIn || step.triggerOut || (step.config && Object.keys(step.config).length > 0));
}
</script>

<template>
	<nav aria-label="Tiến trình thực hiện">
		<ol class="space-y-0">
			<li
				v-for="(step, index) in steps"
				:key="step.id"
		:data-step-index="index"
				:data-step-status="step.status"
				class="relative"
			>
				<!-- Vertical connector line -->
				<div
					v-if="index < steps.length - 1"
					class="absolute left-[15px] top-[30px] -bottom-0 w-0.5 transition-colors duration-300"
					:class="statusStyle[step.status].line"
				/>

				<!-- Clickable step row -->
				<button
					type="button"
					class="flex w-full gap-x-3 rounded-lg px-1 py-0.5 text-left transition-colors duration-200"
					:class="[
						statusStyle[step.status].stepBg,
						expandedStepId === step.id ? 'bg-gray-50 dark:bg-gray-700/40' : '',
					]"
					@click="toggleStep(step.id)"
				>
					<!-- Circle with number/icon -->
					<div class="relative flex h-[30px] w-[30px] shrink-0 items-center justify-center">
						<!-- Done: checkmark -->
						<span
							v-if="step.status === 'done'"
							class="flex h-7 w-7 items-center justify-center rounded-full ring-2 transition-all duration-300"
							:class="[statusStyle.done.bg, statusStyle.done.ring]"
						>
							<svg class="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
								<path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
							</svg>
						</span>

						<!-- Current: highlighted ring -->
						<span
							v-else-if="step.status === 'current'"
							class="flex h-7 w-7 items-center justify-center rounded-full ring-2 shadow-sm transition-all duration-300"
							:class="[statusStyle.current.bg, statusStyle.current.ring]"
						>
							<span class="text-xs font-bold text-white">{{ index + 1 }}</span>
						</span>

						<!-- Pending: hollow circle -->
						<span
							v-else
							class="flex h-7 w-7 items-center justify-center rounded-full border-2 border-gray-200 bg-white transition-all duration-300 dark:border-gray-600 dark:bg-gray-800"
						>
							<span class="text-xs font-medium text-gray-400 dark:text-gray-500">{{ index + 1 }}</span>
						</span>
					</div>

					<!-- Step compact content -->
					<div class="flex min-w-0 flex-1 items-center gap-2 py-1">
						<p
							class="flex-1 text-sm font-medium leading-snug transition-colors duration-200"
							:class="step.status === 'done'
								? 'text-emerald-700 dark:text-emerald-300'
								: step.status === 'current'
									? 'text-amber-700 dark:text-amber-300'
									: 'text-gray-500 dark:text-gray-400'"
						>
							{{ step.title }}
						</p>
						<span
							v-if="step.actorType"
							class="shrink-0 text-xs text-gray-400 dark:text-gray-500"
						>
							{{ getActorLabel(step.actorType) }}
						</span>
						<!-- Expand chevron -->
						<svg
							v-if="hasDetails(step)"
							class="h-4 w-4 shrink-0 text-gray-300 transition-transform duration-200 dark:text-gray-600"
							:class="expandedStepId === step.id ? 'rotate-90' : ''"
							viewBox="0 0 20 20" fill="currentColor"
						>
							<path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd" />
						</svg>
					</div>
				</button>

				<!-- Accordion expanded content -->
				<Transition
					enter-active-class="transition-all duration-200 ease-out"
					enter-from-class="max-h-0 opacity-0"
					enter-to-class="max-h-96 opacity-100"
					leave-active-class="transition-all duration-150 ease-in"
					leave-from-class="max-h-96 opacity-100"
					leave-to-class="max-h-0 opacity-0"
				>
					<div
						v-if="expandedStepId === step.id && hasDetails(step)"
						class="ml-[39px] overflow-hidden pb-2"
					>
						<div class="rounded-md border border-gray-100 bg-gray-50/70 px-3 py-2.5 dark:border-gray-700 dark:bg-gray-800/60">
							<!-- Description -->
							<p v-if="step.description" class="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
								{{ step.description }}
							</p>

							<!-- Step type badge -->
							<div v-if="step.stepType" class="mt-2 flex flex-wrap gap-1.5">
								<span
									class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
									:class="stepTypeBadge[step.stepType] || 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'"
								>
									{{ getStepTypeLabel(step.stepType) }}
								</span>
							</div>

							<!-- Trigger in/out -->
							<div v-if="step.triggerIn || step.triggerOut" class="mt-2 space-y-1">
								<p v-if="step.triggerIn" class="text-xs text-gray-500 dark:text-gray-400">
									<span class="font-medium text-gray-600 dark:text-gray-300">Vào:</span> {{ step.triggerIn }}
								</p>
								<p v-if="step.triggerOut" class="text-xs text-gray-500 dark:text-gray-400">
									<span class="font-medium text-gray-600 dark:text-gray-300">Ra:</span> {{ step.triggerOut }}
								</p>
							</div>

							<!-- Config (if non-empty, show as key-value) -->
							<div v-if="step.config && Object.keys(step.config).length > 0" class="mt-2">
								<p class="text-xs font-medium text-gray-600 dark:text-gray-300">Cấu hình:</p>
								<div class="mt-1 flex flex-wrap gap-1">
									<span
										v-for="(val, key) in step.config"
										:key="String(key)"
										class="inline-flex rounded bg-gray-200/80 px-1.5 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-400"
									>
										{{ key }}: {{ typeof val === 'object' ? JSON.stringify(val) : val }}
									</span>
								</div>
							</div>
						</div>
					</div>
				</Transition>

				<!-- Bottom spacing for non-last items when collapsed -->
				<div v-if="expandedStepId !== step.id" class="h-2" />
			</li>
		</ol>
	</nav>
</template>
