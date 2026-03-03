import { getRouterParam } from 'h3';
import { hasDirectusServiceToken } from '~/server/utils/directusService';
import { updateWorkflowChangeRequestStatus } from '~/server/utils/workflowGovernance';
import type { WorkflowChangeStatus } from '~/types/workflow-dsl';

export default defineEventHandler(async (event) => {
	if (!hasDirectusServiceToken()) {
		throw createError({
			statusCode: 503,
			statusMessage: 'DIRECTUS_ADMIN_TOKEN is required for WCR status updates.',
		});
	}

	const changeRequestId = Number(getRouterParam(event, 'id'));

	if (!Number.isInteger(changeRequestId) || changeRequestId <= 0) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Change request id must be a positive integer.',
		});
	}

	const body = await readBody<{ status?: WorkflowChangeStatus; approved_by?: string | null }>(event);

	if (!body.status) {
		throw createError({
			statusCode: 400,
			statusMessage: 'status is required.',
		});
	}

	return await updateWorkflowChangeRequestStatus(changeRequestId, body.status, body.approved_by ?? null);
});
