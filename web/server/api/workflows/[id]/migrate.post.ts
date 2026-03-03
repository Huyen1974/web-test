import { getRouterParam } from 'h3';
import { hasDirectusServiceToken } from '~/server/utils/directusService';
import { migrateWorkflowToDsl } from '~/server/utils/workflowGovernance';

export default defineEventHandler(async (event) => {
	if (!hasDirectusServiceToken()) {
		throw createError({
			statusCode: 503,
			statusMessage: 'DIRECTUS_ADMIN_TOKEN is required for workflow migration.',
		});
	}

	const workflowId = Number(getRouterParam(event, 'id'));

	if (!Number.isInteger(workflowId) || workflowId <= 0) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Workflow id must be a positive integer.',
		});
	}

	return await migrateWorkflowToDsl(workflowId);
});
