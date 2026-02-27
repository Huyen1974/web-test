<script setup lang="ts">
/**
 * Comment Module M-001 — Entry Point
 * Module Protocol Standard compliant
 *
 * Usage:
 *   <ModulesCommentModuleCommentModule :task-id="4" />
 *   <ModulesCommentModuleCommentModule :task-id="4" tab-scope="planning" title="Discussion" />
 *
 * Slots (v2 readiness):
 *   #header  — Override title area
 *   #empty   — Override empty state
 *   #input   — Override input area
 */
import type { AgentType, CommentAction } from '~/types/tasks';
import type { CommentModuleProps } from './types';
import { useComments } from './composables/useComments';

const props = withDefaults(defineProps<CommentModuleProps>(), {
	tabScope: undefined,
	readonly: false,
	title: 'Discussion',
});

const emit = defineEmits<{
	'comment-added': [comment: any];
}>();

// Convert props to computed refs for the composable
const taskIdRef = computed(() => props.taskId);
const tabScopeRef = computed(() => props.tabScope);

const { comments, refresh, pending, addComment } = useComments(taskIdRef, tabScopeRef);

async function handleSubmit(payload: { agent_type: AgentType; content: string; action?: CommentAction }) {
	const created = await addComment(payload);
	emit('comment-added', created);
}
</script>

<template>
	<div class="rounded-lg bg-white shadow dark:bg-gray-800">
		<!-- Header -->
		<div class="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
			<slot name="header">
				<div class="flex items-center justify-between">
					<h3 class="text-base font-semibold text-gray-900 dark:text-white">
						{{ title }}
					</h3>
					<span
						v-if="comments?.length"
						class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-400"
					>
						{{ comments.length }}
					</span>
				</div>
			</slot>
		</div>

		<!-- Thread -->
		<div class="px-4 py-3">
			<ModulesCommentModuleCommentThread
				:comments="comments || []"
				:pending="pending"
			>
				<template #empty>
					<slot name="empty">
						<p class="text-sm text-gray-400">No messages yet.</p>
					</slot>
				</template>
			</ModulesCommentModuleCommentThread>
		</div>

		<!-- Input -->
		<div v-if="!readonly" class="px-4 pb-4">
			<slot name="input">
				<ModulesCommentModuleCommentInput @submit="handleSubmit" />
			</slot>
		</div>
	</div>
</template>
