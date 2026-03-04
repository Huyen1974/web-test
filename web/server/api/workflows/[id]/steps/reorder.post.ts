import { getRouterParam, readBody } from 'h3';
import { getWorkflowSteps, updateWorkflowStepRecord } from '~/server/utils/directusService';

/**
 * POST /api/workflows/:id/steps/reorder
 *
 * Re-numbers sort_order for all steps in a workflow.
 * Optionally inserts a gap after a specific step for new step insertion.
 *
 * Body:
 *   { after_step_id?: number }
 *   - If after_step_id is provided, leaves a gap (slot) after that step.
 *   - Returns the suggested sort_order for the new step.
 *
 * Response:
 *   { updated: number, slot?: number }
 */
export default defineEventHandler(async (event) => {
	const workflowId = Number(getRouterParam(event, 'id'));

	if (!Number.isInteger(workflowId) || workflowId <= 0) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Workflow id must be a positive integer.',
		});
	}

	const body = await readBody<{ after_step_id?: number }>(event);
	const afterStepId = body?.after_step_id ?? null;

	const steps = await getWorkflowSteps(workflowId);

	if (!steps.length) {
		return { updated: 0, slot: 10 };
	}

	const SPACING = 10;
	let slot: number | undefined;
	let order = SPACING;
	let updated = 0;

	for (const step of steps) {
		if (step.sort_order !== order) {
			await updateWorkflowStepRecord(step.id, { sort_order: order });
			updated++;
		}

		if (afterStepId != null && step.id === afterStepId) {
			order += SPACING;
			slot = order;
		}

		order += SPACING;
	}

	// If after_step_id was not found among steps, place slot at the end
	if (afterStepId != null && slot == null) {
		slot = order;
	}

	return { updated, ...(slot != null ? { slot } : {}) };
});
