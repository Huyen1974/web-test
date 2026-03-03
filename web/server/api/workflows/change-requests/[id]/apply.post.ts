import { getRouterParam } from 'h3';
import { hasDirectusServiceToken } from '~/server/utils/directusService';
import { applyWorkflowChangeRequest } from '~/server/utils/workflowGovernance';

export default defineEventHandler(async (event) => {
	if (!hasDirectusServiceToken()) {
		throw createError({
			statusCode: 503,
			statusMessage: 'DIRECTUS_ADMIN_TOKEN is required for WCR apply.',
		});
	}

	const changeRequestId = Number(getRouterParam(event, 'id'));

	if (!Number.isInteger(changeRequestId) || changeRequestId <= 0) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Change request id must be a positive integer.',
		});
	}

	const body = await readBody<{ approved_by?: string | null }>(event);
	return await applyWorkflowChangeRequest(changeRequestId, body?.approved_by ?? null);
});
