<script setup lang="ts">
/**
 * CommentModule v1 — Reusable, standalone comment component
 *
 * Usage: <CommentModule :task-id="4" />
 * Usage: <CommentModule :task-id="4" tab-scope="planning" :readonly="false" />
 *
 * Fetches and displays task_comments from Directus via useTasks composable.
 * Self-contained: no dependency on parent page context.
 *
 * Roadmap:
 * - v2: AI orchestration (auto-assign lead/critic), threading, reactions
 * - v3: Workflow approval, plan status transitions, cross-collection discussions
 */
import type { AgentType, CommentAction, TabScope } from '~/types/tasks';
import { AGENT_TYPE_META, COMMENT_ACTION_META } from '~/types/tasks';

const props = withDefaults(
	defineProps<{
		taskId: number | string;
		tabScope?: TabScope;
		readonly?: boolean;
		showForm?: boolean;
		title?: string;
	}>(),
	{
		tabScope: undefined,
		readonly: false,
		showForm: true,
		title: 'Discussion',
	},
);

const emit = defineEmits<{
	'comment-added': [comment: any];
}>();

// Safe accessor for agent type metadata
function getAgentMeta(agentType: string) {
	return AGENT_TYPE_META[agentType as AgentType] || { label: agentType || 'Unknown', color: 'gray', icon: '' };
}

// Agent abbreviation map
const AGENT_ABBREV: Record<string, string> = {
	user: 'U',
	claude_ai: 'CA',
	gpt: 'G',
	gemini: 'Ge',
	claude_code: 'CC',
	codex: 'Cx',
	antigravity: 'AG',
	system: 'S',
};

// Fetch comments
const {
	data: comments,
	refresh: refreshComments,
	pending: commentsPending,
} = await useAsyncData(`comment-module-${props.taskId}-${props.tabScope || 'all'}`, async () => {
	return await useTaskComments(props.taskId, props.tabScope);
});

// Comment form state
const newComment = ref('');
const newAgentType = ref<AgentType>('user');
const newAction = ref<CommentAction | ''>('');
const submitting = ref(false);

const agentOptions: Array<{ value: AgentType; label: string }> = [
	{ value: 'user', label: 'User' },
	{ value: 'claude_ai', label: 'Claude AI' },
	{ value: 'gpt', label: 'GPT' },
	{ value: 'gemini', label: 'Gemini' },
	{ value: 'claude_code', label: 'Claude Code' },
	{ value: 'codex', label: 'Codex' },
	{ value: 'antigravity', label: 'Antigravity' },
	{ value: 'system', label: 'System' },
];

const actionOptions: Array<{ value: CommentAction | ''; label: string }> = [
	{ value: '', label: 'No action' },
	{ value: 'approve', label: 'Approve' },
	{ value: 'reject', label: 'Reject' },
	{ value: 'request_changes', label: 'Request Changes' },
	{ value: 'escalate', label: 'Escalate' },
];

async function submitComment() {
	if (!newComment.value.trim()) return;
	submitting.value = true;
	try {
		const created = await createTaskComment({
			task_id: props.taskId,
			tab_scope: props.tabScope || ('general' as TabScope),
			agent_type: newAgentType.value,
			content: newComment.value.trim(),
			action: newAction.value || undefined,
		});
		newComment.value = '';
		newAction.value = '';
		await refreshComments();
		emit('comment-added', created);
	} catch (e) {
		console.error('Failed to create comment:', e);
	} finally {
		submitting.value = false;
	}
}

function formatDate(dateStr?: string): string {
	if (!dateStr) return '';
	const date = new Date(dateStr);
	return date.toLocaleString();
}
</script>

<template>
	<div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
		<h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">{{ title }}</h3>

		<!-- Loading -->
		<div v-if="commentsPending" class="py-4 text-center text-gray-400">Loading comments...</div>

		<!-- Empty -->
		<div v-else-if="!comments?.length" class="py-4 text-center text-gray-400 dark:text-gray-500">
			No comments yet.
		</div>

		<!-- Comments List -->
		<div v-else class="space-y-4">
			<div
				v-for="comment in comments"
				:key="comment.id"
				class="rounded-lg border border-gray-200 p-4 dark:border-gray-700"
			>
				<div class="mb-2 flex items-center justify-between">
					<div class="flex items-center gap-2">
						<span
							:class="`inline-flex h-6 w-6 items-center justify-center rounded-full bg-${getAgentMeta(comment.agent_type).color}-100 dark:bg-${getAgentMeta(comment.agent_type).color}-900/30`"
						>
							<span class="text-xs">{{ AGENT_ABBREV[comment.agent_type] || '?' }}</span>
						</span>
						<span
							:class="`text-sm font-medium text-${getAgentMeta(comment.agent_type).color}-700 dark:text-${getAgentMeta(comment.agent_type).color}-400`"
						>
							{{ getAgentMeta(comment.agent_type).label }}
						</span>
						<span class="text-xs text-gray-400">{{ formatDate(comment.date_created) }}</span>
					</div>

					<span
						v-if="comment.action && COMMENT_ACTION_META[comment.action]"
						:class="`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-${COMMENT_ACTION_META[comment.action].color}-100 text-${COMMENT_ACTION_META[comment.action].color}-800 dark:bg-${COMMENT_ACTION_META[comment.action].color}-900/30 dark:text-${COMMENT_ACTION_META[comment.action].color}-400`"
					>
						{{ COMMENT_ACTION_META[comment.action].label }}
					</span>
				</div>

				<p class="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">{{ comment.content }}</p>
			</div>
		</div>

		<!-- Add Comment Form -->
		<div v-if="showForm && !readonly" class="mt-6 border-t border-gray-200 pt-4 dark:border-gray-700">
			<h4 class="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">Add Comment</h4>

			<div class="space-y-3">
				<textarea
					v-model="newComment"
					rows="3"
					placeholder="Write your comment..."
					class="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
				></textarea>

				<div class="flex flex-wrap items-center gap-3">
					<select
						v-model="newAgentType"
						class="rounded-md border-gray-300 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
					>
						<option v-for="opt in agentOptions" :key="opt.value" :value="opt.value">
							{{ opt.label }}
						</option>
					</select>

					<select
						v-model="newAction"
						class="rounded-md border-gray-300 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
					>
						<option v-for="opt in actionOptions" :key="opt.value" :value="opt.value">
							{{ opt.label }}
						</option>
					</select>

					<button
						:disabled="!newComment.trim() || submitting"
						class="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
						@click="submitComment"
					>
						{{ submitting ? 'Submitting...' : 'Submit' }}
					</button>
				</div>
			</div>
		</div>
	</div>
</template>
