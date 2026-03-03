import { getRouterParam } from 'h3';
import { listWorkflowChangeRequestRecords } from '~/server/utils/directusService';

export default defineEventHandler(async (event) => {
	const workflowId = Number(getRouterParam(event, 'id'));

	if (!Number.isInteger(workflowId) || workflowId <= 0) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Workflow id must be a positive integer.',
		});
	}

	return await listWorkflowChangeRequestRecords(workflowId);
});
