import { getRouterParam } from 'h3';
import { hasDirectusServiceToken } from '~/server/utils/directusService';
import { scanWorkflowChangeRequest } from '~/server/utils/workflowGovernance';

export default defineEventHandler(async (event) => {
	if (!hasDirectusServiceToken()) {
		throw createError({
			statusCode: 503,
			statusMessage: 'DIRECTUS_ADMIN_TOKEN is required for integrity scans.',
		});
	}

	const changeRequestId = Number(getRouterParam(event, 'id'));

	if (!Number.isInteger(changeRequestId) || changeRequestId <= 0) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Change request id must be a positive integer.',
		});
	}

	return {
		warnings: await scanWorkflowChangeRequest(changeRequestId),
	};
});
