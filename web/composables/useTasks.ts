/**
 * Composable for managing tasks + task_comments (P43 Super Session Task Manager)
 * Provides data access layer for task operations via Directus SDK
 */

import { readItems, readItem, updateItem, createItem } from '@directus/sdk';
import type { Task, TaskComment, TaskStatus, TabScope } from '~/types/tasks';

/**
 * Fetch tasks list with optional status filter
 */
export async function useTasksList(statusFilter?: TaskStatus | TaskStatus[]) {
	const filter: Record<string, any> = {};

	if (statusFilter) {
		if (Array.isArray(statusFilter)) {
			filter.status = { _in: statusFilter };
		} else {
			filter.status = { _eq: statusFilter };
		}
	}

	const params: Record<string, any> = {
		fields: ['*'],
		sort: ['sort', '-date_updated'],
		limit: 100,
	};

	if (Object.keys(filter).length > 0) {
		params.filter = filter;
	}

	return await useDirectus<Task[]>(readItems('tasks', params));
}

/**
 * Fetch a single task by ID with its comments
 */
export async function useTaskDetail(id: number | string) {
	return await useDirectus<Task>(
		readItem('tasks', id, {
			fields: ['*'],
		}),
	);
}

/**
 * Fetch comments for a task, optionally filtered by tab scope
 */
export async function useTaskComments(taskId: number | string, tabScope?: TabScope) {
	const filter: Record<string, any> = {
		task_id: { _eq: taskId },
	};

	if (tabScope) {
		filter.tab_scope = { _eq: tabScope };
	}

	return await useDirectus<TaskComment[]>(
		readItems('task_comments', {
			filter,
			sort: ['-date_created'],
			limit: 200,
		}),
	);
}

/**
 * Create a new comment on a task
 */
export async function createTaskComment(data: {
	task_id: number | string;
	tab_scope: TabScope;
	agent_type: string;
	content: string;
	action?: string;
}) {
	return await useDirectus<TaskComment>(createItem('task_comments', data));
}

/**
 * Find a task linked to a knowledge document by plan_document_path
 * Returns the first matching planning task, or null
 */
export async function useLinkedTask(documentPath: string) {
	// Try multiple path variants (knowledge/..., docs/...)
	const variants = [documentPath];
	if (!documentPath.startsWith('knowledge/')) variants.push(`knowledge/${documentPath}`);
	if (documentPath.startsWith('docs/')) variants.push(documentPath.replace(/^docs\//, 'knowledge/'));
	// Also try with/without .md
	const withMd = variants.flatMap((v) => (v.endsWith('.md') ? [v] : [v, `${v}.md`]));

	const items = await useDirectus<Task[]>(
		readItems('tasks', {
			filter: {
				plan_document_path: { _in: withMd },
			},
			fields: ['id', 'name', 'task_type', 'plan_document_path', 'lead_ai', 'critic_ai', 'status'],
			limit: 1,
		}),
	);

	return items?.length ? items[0] : null;
}

/**
 * Update a task's fields
 */
export async function updateTask(id: number | string, updates: Partial<Task>) {
	return await useDirectus<Task>(updateItem('tasks', id, updates));
}
