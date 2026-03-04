import {
	createDirectus,
	createItem,
	deleteItem,
	deleteItems,
	readItem,
	readItems,
	rest,
	staticToken,
	updateItem,
} from '@directus/sdk';
import type { RestClient } from '@directus/sdk';
import type { Schema } from '~/types/schema';
import type { Task, TaskComment } from '~/types/tasks';
import type {
	BlockLibraryItem,
	WorkflowChangeRequest,
	WorkflowRelationDraft,
	WorkflowStep,
	WorkflowStepRelation,
} from '~/types/workflow-dsl';
import type { Workflow } from '~/types/workflows';

type DirectusClient = RestClient<Schema>;

const WORKFLOW_FIELDS = [
	'id',
	'title',
	'description',
	'status',
	'task_id',
	'version',
	'date_created',
	'date_updated',
] as const;

const WORKFLOW_STEP_FIELDS = [
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
	'date_created',
	'date_updated',
] as const;

const WORKFLOW_RELATION_FIELDS = [
	'id',
	'workflow_id',
	'from_step_id',
	'to_step_id',
	'relation_type',
	'condition_expression',
	'label',
	'sort_order',
] as const;

const BLOCK_LIBRARY_FIELDS = [
	'id',
	'block_key',
	'title',
	'description',
	'category',
	'template_steps',
	'template_relations',
	'input_params',
	'version',
	'status',
	'date_created',
] as const;

const WCR_FIELDS = [
	'id',
	'workflow_id',
	'change_type',
	'title',
	'description',
	'position_context',
	'suggested_actor_type',
	'suggested_block_id',
	'status',
	'schema_warnings',
	'dsl_diff',
	'approved_by',
	'applied_at',
	'task_id',
	'date_created',
] as const;

const TASK_FIELDS = [
	'id',
	'name',
	'description',
	'status',
	'priority',
	'task_type',
	'plan_document_path',
	'lead_ai',
	'critic_ai',
] as const;

function getDirectusBaseUrl() {
	const config = useRuntimeConfig();
	return (
		config.directusInternalUrl ||
		config.public.directus?.rest?.baseUrl ||
		config.public.directusUrl ||
		'https://directus.incomexsaigoncorp.vn'
	);
}

function getDirectusServiceToken() {
	const config = useRuntimeConfig();
	return config.directusServiceToken || process.env.DIRECTUS_ADMIN_TOKEN || process.env.DIRECTUS_SERVER_TOKEN || '';
}

function createDirectusServiceClient(): DirectusClient {
	const baseUrl = getDirectusBaseUrl();
	const token = getDirectusServiceToken();

	let client = createDirectus<Schema>(baseUrl, { globals: { fetch: $fetch } }).with(rest());

	if (token) {
		client = client.with(staticToken(token));
	}

	return client;
}

export function hasDirectusServiceToken() {
	return Boolean(getDirectusServiceToken());
}

export async function getWorkflowRecord(workflowId: number | string) {
	return await createDirectusServiceClient().request<Workflow>(
		readItem('workflows', workflowId, {
			fields: [...WORKFLOW_FIELDS],
		}),
	);
}

export async function updateWorkflowRecord(workflowId: number | string, payload: Partial<Workflow>) {
	return await createDirectusServiceClient().request<Workflow>(updateItem('workflows', workflowId, payload));
}

export async function getWorkflowSteps(workflowId: number | string) {
	return await createDirectusServiceClient().request<WorkflowStep[]>(
		readItems('workflow_steps', {
			filter: { workflow_id: { _eq: workflowId } },
			fields: [...WORKFLOW_STEP_FIELDS],
			sort: ['sort_order', 'id'],
			limit: -1,
		}),
	);
}

export async function getWorkflowRelations(workflowId: number | string) {
	return await createDirectusServiceClient().request<WorkflowStepRelation[]>(
		readItems('workflow_step_relations', {
			filter: { workflow_id: { _eq: workflowId } },
			fields: [...WORKFLOW_RELATION_FIELDS],
			sort: ['sort_order', 'id'],
			limit: -1,
		}),
	);
}

export async function getBlockLibraryItem(blockId: number | string) {
	return await createDirectusServiceClient().request<BlockLibraryItem>(
		readItem('block_library', blockId, {
			fields: [...BLOCK_LIBRARY_FIELDS],
		}),
	);
}

export async function listBlockLibrary() {
	return await createDirectusServiceClient().request<BlockLibraryItem[]>(
		readItems('block_library', {
			fields: [...BLOCK_LIBRARY_FIELDS],
			filter: { status: { _neq: 'deprecated' } },
			sort: ['category', 'block_key'],
			limit: -1,
		}),
	);
}

export async function createWorkflowStepRecord(payload: Omit<WorkflowStep, 'id' | 'date_created' | 'date_updated'>) {
	return await createDirectusServiceClient().request<WorkflowStep>(createItem('workflow_steps', payload));
}

export async function updateWorkflowStepRecord(stepId: number, payload: Partial<WorkflowStep>) {
	return await createDirectusServiceClient().request<WorkflowStep>(updateItem('workflow_steps', stepId, payload));
}

export async function deleteWorkflowStepRecord(stepId: number) {
	return await createDirectusServiceClient().request(deleteItem('workflow_steps', stepId));
}

export async function deleteWorkflowStepsByIds(stepIds: number[]) {
	if (!stepIds.length) return [];
	return await createDirectusServiceClient().request(deleteItems('workflow_steps', stepIds));
}

export async function createWorkflowRelationRecord(
	payload: WorkflowRelationDraft & { workflow_id: number; from_step_id: number; to_step_id: number },
) {
	return await createDirectusServiceClient().request<WorkflowStepRelation>(
		createItem('workflow_step_relations', {
			workflow_id: payload.workflow_id,
			from_step_id: payload.from_step_id,
			to_step_id: payload.to_step_id,
			relation_type: payload.relation_type,
			condition_expression: payload.condition_expression ?? null,
			label: payload.label ?? null,
			sort_order: payload.sort_order ?? 0,
		}),
	);
}

export async function updateWorkflowRelationRecord(relationId: number, payload: Partial<WorkflowStepRelation>) {
	return await createDirectusServiceClient().request<WorkflowStepRelation>(
		updateItem('workflow_step_relations', relationId, payload),
	);
}

export async function deleteWorkflowRelationRecord(relationId: number) {
	return await createDirectusServiceClient().request(deleteItem('workflow_step_relations', relationId));
}

export async function deleteWorkflowRelationsByIds(relationIds: number[]) {
	if (!relationIds.length) return [];
	return await createDirectusServiceClient().request(deleteItems('workflow_step_relations', relationIds));
}

export async function getWorkflowChangeRequestRecord(changeRequestId: number | string) {
	return await createDirectusServiceClient().request<WorkflowChangeRequest>(
		readItem('workflow_change_requests', changeRequestId, {
			fields: [...WCR_FIELDS],
		}),
	);
}

export async function createWorkflowChangeRequestRecord(payload: Omit<WorkflowChangeRequest, 'id' | 'date_created'>) {
	return await createDirectusServiceClient().request<WorkflowChangeRequest>(
		createItem('workflow_change_requests', payload),
	);
}

export async function updateWorkflowChangeRequestRecord(
	changeRequestId: number | string,
	payload: Partial<WorkflowChangeRequest>,
) {
	return await createDirectusServiceClient().request<WorkflowChangeRequest>(
		updateItem('workflow_change_requests', changeRequestId, payload),
	);
}

export async function getTaskRecord(taskId: number | string) {
	return await createDirectusServiceClient().request<Task>(
		readItem('tasks', taskId, {
			fields: [...TASK_FIELDS],
		}),
	);
}

export async function createTaskRecord(payload: Partial<Task>) {
	return await createDirectusServiceClient().request<Task>(createItem('tasks', payload));
}

export async function createTaskCommentRecord(payload: {
	task_id: number | string;
	tab_scope: string;
	agent_type: string;
	content: string;
	action?: string | null;
	workflow_id?: number | null;
}) {
	return await createDirectusServiceClient().request<TaskComment>(
		createItem('task_comments', {
			task_id: payload.task_id,
			tab_scope: payload.tab_scope,
			agent_type: payload.agent_type,
			content: payload.content,
			action: payload.action ?? null,
			workflow_id: payload.workflow_id ?? null,
		}),
	);
}
