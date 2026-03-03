import { hasDirectusServiceToken } from '~/server/utils/directusService';
import { createWorkflowChangeRequestFromInput } from '~/server/utils/workflowGovernance';
import type { WorkflowChangeRequestInput } from '~/server/utils/workflowGovernance';

export default defineEventHandler(async (event) => {
	if (!hasDirectusServiceToken()) {
		throw createError({
			statusCode: 503,
			statusMessage: 'DIRECTUS_ADMIN_TOKEN is required for WCR intake.',
		});
	}

	const body = await readBody<WorkflowChangeRequestInput>(event);

	if (!body.workflow_id || !body.change_type || !body.title) {
		throw createError({
			statusCode: 400,
			statusMessage: 'workflow_id, change_type, and title are required.',
		});
	}

	return await createWorkflowChangeRequestFromInput(body);
});
