/**
 * Composable for managing workflows (M-002 WorkflowModule)
 * Provides data access layer for workflow operations via Directus SDK
 */

import { readItems, updateItem } from '@directus/sdk';
import type { Workflow } from '~/types/workflows';

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

/**
 * Fetch workflow detail + renderable BPMN XML
 */
export async function useWorkflowDetail(id: number | string) {
	return await $fetch<WorkflowRuntimeDetail>(`/api/workflows/${id}/diagram`);
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
