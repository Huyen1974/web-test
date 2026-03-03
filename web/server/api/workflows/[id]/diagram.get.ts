import { getRouterParam } from 'h3';
import { getWorkflowRecord, getWorkflowRelations, getWorkflowSteps } from '~/server/utils/directusService';
import { dslToBpmnXml, toWorkflowRelationDrafts } from '~/server/utils/workflowDsl';

export default defineEventHandler(async (event) => {
	const workflowId = Number(getRouterParam(event, 'id'));

	if (!Number.isInteger(workflowId) || workflowId <= 0) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Workflow id must be a positive integer.',
		});
	}

	const workflow = await getWorkflowRecord(workflowId);

	try {
		const steps = await getWorkflowSteps(workflowId);

		if (!steps.length) {
			return {
				workflow,
				bpmnXml: workflow.bpmn_xml,
				source: 'bpmn_cache' as const,
				dslAvailable: false,
				stepCount: 0,
				relationCount: 0,
			};
		}

		const relations = await getWorkflowRelations(workflowId);
		return {
			workflow,
			bpmnXml: dslToBpmnXml(workflow, steps, toWorkflowRelationDrafts(steps, relations)),
			source: 'dsl' as const,
			dslAvailable: true,
			stepCount: steps.length,
			relationCount: relations.length,
		};
	} catch {
		return {
			workflow,
			bpmnXml: workflow.bpmn_xml,
			source: 'bpmn_cache' as const,
			dslAvailable: false,
			stepCount: 0,
			relationCount: 0,
		};
	}
});
