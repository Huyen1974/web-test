/**
 * Comment Module M-001 — Composable
 * Wraps useTasks composable for module-internal use
 */

import type { TabScope, AgentType, CommentAction, TaskComment } from '~/types/tasks';

export function useComments(taskId: Ref<number | string>, tabScope?: Ref<TabScope | undefined>) {
	const key = computed(() => `comment-module-${taskId.value}-${tabScope?.value || 'all'}`);

	const {
		data: comments,
		refresh,
		pending,
	} = useAsyncData(
		key.value,
		async () => useTaskComments(taskId.value, tabScope?.value),
		{ watch: [taskId, ...(tabScope ? [tabScope] : [])] },
	);

	async function addComment(data: { agent_type: AgentType; content: string; action?: CommentAction }) {
		const created = await createTaskComment({
			task_id: taskId.value,
			tab_scope: tabScope?.value || ('general' as TabScope),
			agent_type: data.agent_type,
			content: data.content,
			action: data.action,
		});
		await refresh();
		return created;
	}

	return { comments, refresh, pending, addComment };
}
