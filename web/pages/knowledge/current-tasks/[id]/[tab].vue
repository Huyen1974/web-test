<script setup lang="ts">
import { markdownToHtml } from '~/utils/markdown';
import type { Task, TaskComment, TabScope, AgentType, CommentAction } from '~/types/tasks';
import { TAB_CONFIG, AGENT_TYPE_META, COMMENT_ACTION_META } from '~/types/tasks';

const route = useRoute();
const taskId = route.params.id as string;
const tabKey = computed(() => route.params.tab as TabScope);

// Get task from parent layout (with safe defaults)
const task = inject<Ref<Task | null>>('task', ref(null));
const refreshTask = inject<() => Promise<void>>('refreshTask', async () => {});

// Find current tab config
const currentTab = computed(() => TAB_CONFIG.find((t) => t.key === tabKey.value));

// Get markdown content for current tab
const tabContent = computed(() => {
	if (!task?.value || !currentTab.value) return '';
	return (task.value[currentTab.value.field] as string) || '';
});

const renderedContent = computed(() => {
	if (!tabContent.value) return '';
	try {
		return markdownToHtml(tabContent.value);
	} catch {
		return `<pre>${tabContent.value}</pre>`;
	}
});

// Safe accessor for agent type metadata (guards against unknown agent_type values)
function getAgentMeta(agentType: string) {
	return (
		AGENT_TYPE_META[agentType as AgentType] || { label: agentType || 'Unknown', color: 'gray', icon: '' }
	);
}

// Fetch comments for this tab
const {
	data: comments,
	refresh: refreshComments,
	pending: commentsPending,
} = await useAsyncData(
	`task-comments-${taskId}-${tabKey.value}`,
	async () => {
		return await useTaskComments(taskId, tabKey.value);
	},
	{ watch: [tabKey] },
);

// Comment form state
const newComment = ref('');
const newAgentType = ref<AgentType>('user');
const newAction = ref<CommentAction | ''>('');
const submitting = ref(false);

const agentOptions: Array<{ value: AgentType; label: string }> = [
	{ value: 'user', label: 'User' },
	{ value: 'claude', label: 'Claude' },
	{ value: 'claude_code', label: 'Claude Code' },
	{ value: 'claude_desktop', label: 'Claude Desktop' },
	{ value: 'gpt', label: 'GPT' },
	{ value: 'gemini', label: 'Gemini' },
	{ value: 'codex', label: 'Codex' },
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
		await createTaskComment({
			task_id: taskId,
			tab_scope: tabKey.value,
			agent_type: newAgentType.value,
			content: newComment.value.trim(),
			action: newAction.value || undefined,
		});
		newComment.value = '';
		newAction.value = '';
		await refreshComments();
	} catch (e) {
		console.error('Failed to create comment:', e);
	} finally {
		submitting.value = false;
	}
}

function formatCommentDate(dateStr?: string): string {
	if (!dateStr) return '';
	const date = new Date(dateStr);
	return date.toLocaleString();
}
</script>

<template>
	<div class="space-y-6">
		<!-- Tab Content -->
		<div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
			<h2 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
				{{ currentTab?.label || tabKey }}
			</h2>

			<div v-if="renderedContent">
				<TypographyProse :content="renderedContent" size="sm" />
			</div>
			<div v-else class="py-8 text-center text-gray-400 dark:text-gray-500">
				<p>No content for this tab yet.</p>
			</div>
		</div>

		<!-- Feedback Stream -->
		<div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
			<h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Feedback</h3>

			<!-- Comments List -->
			<div v-if="commentsPending" class="py-4 text-center text-gray-400">Loading comments...</div>

			<div v-else-if="!comments?.length" class="py-4 text-center text-gray-400 dark:text-gray-500">
				No feedback yet for this tab.
			</div>

			<div v-else class="space-y-4">
				<div
					v-for="comment in comments"
					:key="comment.id"
					class="rounded-lg border border-gray-200 p-4 dark:border-gray-700"
				>
					<div class="mb-2 flex items-center justify-between">
						<div class="flex items-center gap-2">
							<!-- Agent icon -->
							<span
								:class="`inline-flex h-6 w-6 items-center justify-center rounded-full bg-${getAgentMeta(comment.agent_type).color}-100 dark:bg-${getAgentMeta(comment.agent_type).color}-900/30`"
							>
								<span class="text-xs">{{
									({ user: 'U', claude: 'C', claude_code: 'CC', claude_desktop: 'CD', gpt: 'G', gemini: 'Ge', codex: 'Cx', system: 'S' })[comment.agent_type] || '?'
								}}</span>
							</span>
							<span
								:class="`text-sm font-medium text-${getAgentMeta(comment.agent_type).color}-700 dark:text-${getAgentMeta(comment.agent_type).color}-400`"
							>
								{{ getAgentMeta(comment.agent_type).label }}
							</span>
							<span class="text-xs text-gray-400">{{ formatCommentDate(comment.date_created) }}</span>
						</div>

						<!-- Action badge -->
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
			<div class="mt-6 border-t border-gray-200 pt-4 dark:border-gray-700">
				<h4 class="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">Add Feedback</h4>

				<div class="space-y-3">
					<textarea
						v-model="newComment"
						rows="3"
						placeholder="Write your feedback..."
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
	</div>
</template>
