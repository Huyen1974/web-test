/**
 * Composable for managing workflows (M-002 WorkflowModule)
 * Provides data access layer for workflow operations via Directus SDK
 */

import { readItems, readItem } from '@directus/sdk';
import type { Workflow } from '~/types/workflows';

/**
 * Fetch a single workflow by ID
 */
export async function useWorkflowDetail(id: number | string) {
	return await useDirectus<Workflow>(
		readItem('workflows', id, {
			fields: ['id', 'title', 'description', 'bpmn_xml', 'status', 'task_id', 'version', 'date_created', 'date_updated'],
		}),
	);
}

/**
 * Fetch workflows list, optionally filtered by task_id
 */
export async function useWorkflowsList(taskId?: number | string) {
	const filter: Record<string, any> = {};

	if (taskId) {
		filter.task_id = { _eq: taskId };
	}

	const params: Record<string, any> = {
		fields: ['id', 'title', 'status', 'task_id', 'version', 'date_updated'],
		sort: ['-date_updated'],
		limit: 50,
	};

	if (Object.keys(filter).length > 0) {
		params.filter = filter;
	}

	return await useDirectus<Workflow[]>(readItems('workflows', params));
}

/**
 * Reactive composable for loading a workflow and its BPMN XML
 */
export function useWorkflow(workflowId: Ref<number | string>) {
	const key = computed(() => `workflow-${workflowId.value}`);

	const {
		data: workflow,
		refresh,
		pending: loading,
		error,
	} = useAsyncData(
		key.value,
		async () => useWorkflowDetail(workflowId.value),
		{ watch: [workflowId] },
	);

	const bpmnXml = computed(() => workflow.value?.bpmn_xml || '');

	return { workflow, bpmnXml, loading, error, refresh };
}
