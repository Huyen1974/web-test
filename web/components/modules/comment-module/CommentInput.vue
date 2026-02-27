<script setup lang="ts">
/**
 * Comment Module M-001 — CommentInput
 * Chat-style input with agent selector and action dropdown
 */
import type { AgentType, CommentAction } from '~/types/tasks';
import { AGENT_DISPLAY } from './types';

defineProps<{
	disabled?: boolean;
}>();

const emit = defineEmits<{
	submit: [payload: { agent_type: AgentType; content: string; action?: CommentAction }];
}>();

const content = ref('');
const agentType = ref<AgentType>('user');
const action = ref<CommentAction | ''>('');
const submitting = ref(false);

// Derive agent options from AGENT_DISPLAY (single source)
const agentOptions = Object.entries(AGENT_DISPLAY).map(([value, display]) => ({
	value: value as AgentType,
	label: `${display.emoji} ${display.label}`,
}));

const actionOptions: Array<{ value: CommentAction | ''; label: string }> = [
	{ value: '', label: 'No action' },
	{ value: 'approve', label: '✅ Approve' },
	{ value: 'reject', label: '❌ Reject' },
	{ value: 'request_changes', label: '🔄 Request Changes' },
	{ value: 'escalate', label: '⚠️ Escalate' },
];

function handleSubmit() {
	if (!content.value.trim() || submitting.value) return;
	submitting.value = true;
	try {
		emit('submit', {
			agent_type: agentType.value,
			content: content.value.trim(),
			action: action.value || undefined,
		});
		content.value = '';
		action.value = '';
	} finally {
		submitting.value = false;
	}
}

// Ctrl+Enter / Cmd+Enter to send
function onKeydown(e: KeyboardEvent) {
	if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
		e.preventDefault();
		handleSubmit();
	}
}
</script>

<template>
	<div class="border-t border-gray-200 pt-4 dark:border-gray-700">
		<div class="space-y-3">
			<textarea
				v-model="content"
				rows="3"
				:disabled="disabled || submitting"
				placeholder="Write a message... (Ctrl+Enter to send)"
				class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
				@keydown="onKeydown"
			/>

			<div class="flex flex-wrap items-center gap-2">
				<!-- Agent selector -->
				<select
					v-model="agentType"
					:disabled="disabled || submitting"
					class="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
				>
					<option v-for="opt in agentOptions" :key="opt.value" :value="opt.value">
						{{ opt.label }}
					</option>
				</select>

				<!-- Action selector -->
				<select
					v-model="action"
					:disabled="disabled || submitting"
					class="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
				>
					<option v-for="opt in actionOptions" :key="opt.value" :value="opt.value">
						{{ opt.label }}
					</option>
				</select>

				<!-- Send button -->
				<div class="ml-auto">
					<button
						:disabled="!content.trim() || disabled || submitting"
						class="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
						@click="handleSubmit"
					>
						{{ submitting ? 'Sending...' : 'Send' }}
					</button>
				</div>
			</div>
		</div>
	</div>
</template>
