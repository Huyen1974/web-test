/**
 * Composable for managing workflows (M-002 WorkflowModule)
 * Provides data access layer for workflow operations via workflow runtime APIs
 * and the existing Directus SDK path for BPMN modeler save.
 */

import { readItems, updateItem } from '@directus/sdk';
import type { WorkflowChangeRequest, WorkflowStep, WorkflowStepRelation } from '~/types/workflow-dsl';
import type { Workflow, WorkflowLevel, WorkflowStatus } from '~/types/workflows';

/**
 * Runtime workflow payload for viewer/modeler
 */
export interface WorkflowRuntimeDetail {
	workflow: Workflow;
	bpmnXml: string;
	source: 'dsl' | 'bpmn_cache';
	dslAvailable: boolean;
	stepCount: number;
	relationCount: number;
}

export interface WorkflowRegistryItem extends Workflow {
	stepCount: number;
}

export interface WorkflowRegistryResult {
	items: WorkflowRegistryItem[];
	page: number;
	pageSize: number;
	hasNextPage: boolean;
}

export interface WorkflowRegistryFilters {
	page?: number;
	pageSize?: number;
	searchQuery?: string;
	filterStatus?: WorkflowStatus | '';
	filterLevel?: WorkflowLevel | number | null;
}

export interface WorkflowMatrixDetail {
	workflow: Workflow;
	steps: WorkflowStep[];
	relations: WorkflowStepRelation[];
}

/**
 * Fetch workflow detail + renderable BPMN XML
 */
export async function useWorkflowDetail(id: number | string) {
	return await $fetch<WorkflowRuntimeDetail>(`/api/workflows/${id}/diagram`);
}

export async function useWorkflowRegistry(options: WorkflowRegistryFilters = {}) {
	const params = new URLSearchParams();
	params.set('page', String(options.page || 1));
	params.set('pageSize', String(options.pageSize || 25));

	if (options.searchQuery?.trim()) {
		params.set('search', options.searchQuery.trim());
	}

	if (options.filterStatus) {
		params.set('status', options.filterStatus);
	}

	if (options.filterLevel) {
		params.set('level', String(options.filterLevel));
	}

	return await $fetch<WorkflowRegistryResult>(`/api/workflows/registry?${params.toString()}`);
}

export async function useWorkflowMatrix(id: number | string) {
	return await $fetch<WorkflowMatrixDetail>(`/api/workflows/${id}/matrix`);
}

export async function useWorkflowChangeRequests(id: number | string) {
	return await $fetch<WorkflowChangeRequest[]>(`/api/workflows/${id}/change-requests`);
}

export async function createWorkflowChangeRequest(payload: {
	workflow_id: number;
	change_type: WorkflowChangeRequest['change_type'];
	title: string;
	description?: string | null;
	position_context?: string | null;
}) {
	return await $fetch<WorkflowChangeRequest>('/api/workflows/change-requests', {
		method: 'POST',
		body: payload,
	});
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

/**
 * Save workflow BPMN XML back to Directus
 */
export async function saveWorkflow(id: number | string, bpmnXml: string) {
	const runtime = await useWorkflowDetail(id);

	if (runtime.dslAvailable) {
		throw new Error(
			'This workflow is governed by DSL. Submit a workflow change request instead of saving BPMN XML directly.',
		);
	}

	return await useDirectus<Workflow>(updateItem('workflows', id, { bpmn_xml: bpmnXml }));
}

/**
 * Reactive composable for loading a workflow and its BPMN XML
 */
export function useWorkflow(workflowId: Ref<number | string>) {
	const key = computed(() => `workflow-runtime-${workflowId.value}`);

	const {
		data: runtime,
		refresh,
		pending: loading,
		error,
	} = useAsyncData(
		() => key.value,
		async () => useWorkflowDetail(workflowId.value),
		{ watch: [workflowId] },
	);

	const workflow = computed(() => runtime.value?.workflow || null);
	const bpmnXml = computed(() => runtime.value?.bpmnXml || '');
	const dslSource = computed(() => runtime.value?.source || 'bpmn_cache');
	const dslAvailable = computed(() => runtime.value?.dslAvailable || false);
	const stepCount = computed(() => runtime.value?.stepCount || 0);
	const relationCount = computed(() => runtime.value?.relationCount || 0);

	return { workflow, bpmnXml, dslSource, dslAvailable, stepCount, relationCount, loading, error, refresh };
}
