import { getRouterParam } from 'h3';
import { getWorkflowRecord, getWorkflowRelations, getWorkflowSteps } from '~/server/utils/directusService';

export default defineEventHandler(async (event) => {
	const workflowId = Number(getRouterParam(event, 'id'));

	if (!Number.isInteger(workflowId) || workflowId <= 0) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Workflow id must be a positive integer.',
		});
	}

	const [workflow, steps, relations] = await Promise.all([
		getWorkflowRecord(workflowId),
		getWorkflowSteps(workflowId),
		getWorkflowRelations(workflowId),
	]);

	return {
		workflow,
		steps,
		relations,
	};
});
