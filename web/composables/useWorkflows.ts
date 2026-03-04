/**
 * Composable for managing workflows (M-002 WorkflowModule)
 * Provides direct Directus reads for workflow metadata, steps, and relations.
 */

import { readItem, readItems } from '@directus/sdk';
import type { WorkflowStep, WorkflowStepRelation } from '~/types/workflow-dsl';
import type { Workflow } from '~/types/workflows';

export interface WorkflowMatrixDetail {
	workflow: Workflow;
	steps: WorkflowStep[];
	relations: WorkflowStepRelation[];
}

export async function useWorkflowMatrix(id: number | string) {
	const [workflow, steps, relations] = await Promise.all([
		useDirectus<Workflow>(
			readItem('workflows', id, {
				fields: [
					'id',
					'title',
					'description',
					'status',
					'task_id',
					'version',
					'process_code',
					'sort',
					'parent_workflow_id',
					'level',
					'date_updated',
				],
			}),
		),
		useDirectus<WorkflowStep[]>(
			readItems('workflow_steps', {
				filter: { workflow_id: { _eq: id } },
				fields: [
					'id',
					'workflow_id',
					'step_key',
					'step_type',
					'title',
					'description',
					'actor_type',
					'config',
					'position_x',
					'position_y',
					'block_id',
					'sort_order',
					'trigger_in_text',
					'trigger_out_text',
				],
				sort: ['sort_order', 'id'],
				limit: -1,
			}),
		),
		useDirectus<WorkflowStepRelation[]>(
			readItems('workflow_step_relations', {
				filter: { workflow_id: { _eq: id } },
				fields: [
					'id',
					'workflow_id',
					'from_step_id',
					'to_step_id',
					'relation_type',
					'condition_expression',
					'label',
					'sort_order',
				],
				sort: ['sort_order', 'id'],
				limit: -1,
			}),
		),
	]);

	return { workflow, steps, relations };
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
		fields: [
			'id',
			'title',
			'description',
			'status',
			'task_id',
			'version',
			'process_code',
			'sort',
			'parent_workflow_id',
			'level',
			'date_updated',
		],
		sort: ['sort', 'title', 'id'],
		limit: 50,
	};

	if (Object.keys(filter).length > 0) {
		params.filter = filter;
	}

	return await useDirectus<Workflow[]>(readItems('workflows', params));
}
