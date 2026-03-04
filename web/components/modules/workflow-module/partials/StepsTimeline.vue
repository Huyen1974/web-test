<script setup lang="ts">
/**
 * Vertical Steps Timeline — Tailwind CSS only
 * Replaces bpmn-js viewer. Designed for future task_checkpoints integration.
 *
 * Props:
 *   steps — array of workflow steps (sorted by sort_order)
 *   Each step can carry an optional `status` for checkpoint integration.
 */

export type StepStatus = 'done' | 'current' | 'pending';

export interface TimelineStep {
	id: number;
	title: string;
	actorType?: string | null;
	stepType?: string | null;
	status: StepStatus;
}

const props = defineProps<{
	steps: TimelineStep[];
}>();

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
	if (!actorType) return '—';
	return actorLabel[actorType] || actorType;
}

const statusStyle: Record<StepStatus, { ring: string; bg: string; text: string; line: string }> = {
	done: {
		ring: 'ring-emerald-300 dark:ring-emerald-700',
		bg: 'bg-emerald-500 dark:bg-emerald-600',
		text: 'text-white',
		line: 'bg-emerald-300 dark:bg-emerald-700',
	},
	current: {
		ring: 'ring-primary-300 dark:ring-primary-700',
		bg: 'bg-primary-500 dark:bg-primary-600',
		text: 'text-white',
		line: 'bg-gray-200 dark:bg-gray-700',
	},
	pending: {
		ring: 'ring-gray-200 dark:ring-gray-700',
		bg: 'bg-gray-100 dark:bg-gray-800',
		text: 'text-gray-400 dark:text-gray-500',
		line: 'bg-gray-200 dark:bg-gray-700',
	},
};
</script>

<template>
	<nav aria-label="Tiến trình thực hiện">
		<ol class="space-y-0">
			<li
				v-for="(step, index) in steps"
				:key="step.id"
				class="relative flex gap-x-3"
			>
				<!-- Vertical connector line -->
				<div
					v-if="index < steps.length - 1"
					class="absolute left-[15px] top-[30px] -bottom-0 w-0.5"
					:class="statusStyle[step.status].line"
				/>

				<!-- Circle with number -->
				<div class="relative flex h-[30px] w-[30px] shrink-0 items-center justify-center">
					<!-- Done: checkmark -->
					<span
						v-if="step.status === 'done'"
						class="flex h-7 w-7 items-center justify-center rounded-full ring-2"
						:class="[statusStyle.done.bg, statusStyle.done.ring]"
					>
						<svg class="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
							<path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
						</svg>
					</span>

					<!-- Current: pulsing ring -->
					<span
						v-else-if="step.status === 'current'"
						class="flex h-7 w-7 items-center justify-center rounded-full ring-2"
						:class="[statusStyle.current.bg, statusStyle.current.ring]"
					>
						<span class="text-xs font-semibold text-white">{{ index + 1 }}</span>
					</span>

					<!-- Pending: hollow circle -->
					<span
						v-else
						class="flex h-7 w-7 items-center justify-center rounded-full ring-2"
						:class="[statusStyle.pending.bg, statusStyle.pending.ring]"
					>
						<span class="text-xs font-medium" :class="statusStyle.pending.text">{{ index + 1 }}</span>
					</span>
				</div>

				<!-- Step content -->
				<div class="min-w-0 pb-5">
					<p
						class="text-sm font-medium"
						:class="step.status === 'pending'
							? 'text-gray-500 dark:text-gray-400'
							: 'text-gray-900 dark:text-white'"
					>
						{{ step.title }}
					</p>
					<p
						v-if="step.actorType"
						class="mt-0.5 text-xs text-gray-500 dark:text-gray-400"
					>
						{{ getActorLabel(step.actorType) }}
					</p>
				</div>
			</li>
		</ol>
	</nav>
</template>
