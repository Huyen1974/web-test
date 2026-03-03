import { createError } from 'h3';
import {
	createTaskCommentRecord,
	createTaskRecord,
	createWorkflowChangeRequestRecord,
	createWorkflowRelationRecord,
	createWorkflowStepRecord,
	deleteWorkflowRelationsByIds,
	deleteWorkflowStepsByIds,
	getBlockLibraryItem,
	getTaskRecord,
	getWorkflowChangeRequestRecord,
	getWorkflowRecord,
	getWorkflowRelations,
	getWorkflowSteps,
	updateWorkflowChangeRequestRecord,
	updateWorkflowRecord,
	updateWorkflowRelationRecord,
	updateWorkflowStepRecord,
} from '~/server/utils/directusService';
import {
	buildWorkflowChangeDiff,
	compareBpmnStructures,
	dslToBpmnXml,
	parseBpmnXmlToDsl,
	scanWorkflowIntegrity,
	toWorkflowRelationDrafts,
} from '~/server/utils/workflowDsl';
import type {
	SchemaWarning,
	WorkflowChangeRequest,
	WorkflowChangeStatus,
	WorkflowDslDiff,
	WorkflowRelationDraft,
	WorkflowRelationSelector,
	WorkflowStep,
	WorkflowStepDraft,
	WorkflowStepPatch,
	WorkflowStepRelation,
	WorkflowStepSelector,
} from '~/types/workflow-dsl';
import type { Workflow } from '~/types/workflows';

export interface WorkflowChangeRequestInput {
	workflow_id: number;
	change_type: WorkflowChangeRequest['change_type'];
	title: string;
	description?: string | null;
	position_context?: string | null;
	suggested_actor_type?: WorkflowChangeRequest['suggested_actor_type'];
	suggested_block_id?: number | null;
	task_id?: number | null;
	step?: Partial<WorkflowStepDraft>;
	target_step_key?: string | null;
	after_step_key?: string | null;
	before_step_key?: string | null;
	block_params?: Record<string, any> | null;
	reorder?: Array<{ step_key: string; sort_order: number }>;
	dsl_diff?: WorkflowDslDiff | null;
	approved_by?: string | null;
}

type WorkflowGraph = {
	steps: WorkflowStep[];
	relations: WorkflowStepRelation[];
};

async function loadWorkflowGraph(workflowId: number) {
	try {
		const [steps, relations] = await Promise.all([getWorkflowSteps(workflowId), getWorkflowRelations(workflowId)]);

		return { steps, relations } satisfies WorkflowGraph;
	} catch {
		return { steps: [], relations: [] } satisfies WorkflowGraph;
	}
}

function appendApplyFailure(warnings: SchemaWarning[] | null | undefined, message: string) {
	return [
		...(warnings || []),
		{
			code: 'apply_failed',
			severity: 'error' as const,
			message,
		},
	];
}

async function ensureWorkflowTaskLink(workflow: Workflow, requestedTaskId: number | null | undefined, title: string) {
	if (requestedTaskId) {
		await getTaskRecord(requestedTaskId);
		return requestedTaskId;
	}

	if (workflow.task_id) {
		return workflow.task_id;
	}

	const task = await createTaskRecord({
		name: `[WCR] ${title}`,
		description: `Governance task auto-created for workflow ${workflow.title}.`,
		status: 'draft',
		task_type: 'planning',
	});

	await updateWorkflowRecord(workflow.id, { task_id: task.id });
	return task.id;
}

async function createGovernanceComment(
	taskId: number | null | undefined,
	tabScope: 'planning' | 'verify',
	workflowId: number,
	content: string,
) {
	if (!taskId) return null;
	return await createTaskCommentRecord({
		task_id: taskId,
		tab_scope: tabScope,
		agent_type: 'system',
		content,
		workflow_id: workflowId,
	});
}

function findStepRecord(steps: WorkflowStep[], selector: WorkflowStepSelector | WorkflowStepPatch) {
	if ('step_id' in selector && selector.step_id) {
		return steps.find((step) => step.id === selector.step_id) || null;
	}

	if ('step_key' in selector && selector.step_key) {
		return steps.find((step) => step.step_key === selector.step_key) || null;
	}

	return null;
}

function findRelationRecord(
	steps: WorkflowStep[],
	relations: WorkflowStepRelation[],
	selector: WorkflowRelationSelector | { relation_id?: number; from_step_key?: string; to_step_key?: string },
) {
	if (selector.relation_id) {
		return relations.find((relation) => relation.id === selector.relation_id) || null;
	}

	if (selector.from_step_key && selector.to_step_key) {
		const fromStep = steps.find((step) => step.step_key === selector.from_step_key);
		const toStep = steps.find((step) => step.step_key === selector.to_step_key);
		if (!fromStep || !toStep) return null;
		return (
			relations.find((relation) => relation.from_step_id === fromStep.id && relation.to_step_id === toStep.id) || null
		);
	}

	return null;
}

function formatCreationComment(changeRequest: WorkflowChangeRequest) {
	return [
		`[WCR #${changeRequest.id}] Created`,
		`Title: ${changeRequest.title}`,
		`Type: ${changeRequest.change_type}`,
		`Status: ${changeRequest.status}`,
		...(changeRequest.dsl_diff?.preview_summary || []).map((line) => `Preview: ${line}`),
	].join('\n');
}

function formatStatusComment(changeRequest: WorkflowChangeRequest, status: WorkflowChangeStatus) {
	return [`[WCR #${changeRequest.id}] Status updated`, `Title: ${changeRequest.title}`, `New status: ${status}`].join(
		'\n',
	);
}

function formatAppliedComment(changeRequest: WorkflowChangeRequest, workflowVersion: number) {
	return [
		`[WCR #${changeRequest.id}] Applied`,
		`Title: ${changeRequest.title}`,
		`Workflow version: ${workflowVersion}`,
	].join('\n');
}

export async function createWorkflowChangeRequestFromInput(input: WorkflowChangeRequestInput) {
	const workflow = await getWorkflowRecord(input.workflow_id);
	const graph = await loadWorkflowGraph(workflow.id);
	const suggestedBlock = input.suggested_block_id ? await getBlockLibraryItem(input.suggested_block_id) : null;

	const diff = buildWorkflowChangeDiff(
		{
			workflowId: workflow.id,
			changeType: input.change_type,
			title: input.title,
			description: input.description ?? null,
			positionContext: input.position_context ?? null,
			suggestedActorType: input.suggested_actor_type ?? null,
			suggestedBlock,
			step: input.step,
			targetStepKey: input.target_step_key ?? null,
			afterStepKey: input.after_step_key ?? null,
			beforeStepKey: input.before_step_key ?? null,
			blockParams: input.block_params ?? null,
			reorder: input.reorder,
			dslDiff: input.dsl_diff ?? null,
		},
		graph.steps,
		graph.relations,
	);

	const warnings = scanWorkflowIntegrity(graph.steps, graph.relations, diff);
	const linkedTaskId = await ensureWorkflowTaskLink(workflow, input.task_id, input.title);

	const changeRequest = await createWorkflowChangeRequestRecord({
		workflow_id: workflow.id,
		change_type: input.change_type,
		title: input.title,
		description: input.description ?? null,
		position_context: input.position_context ?? null,
		suggested_actor_type: input.suggested_actor_type ?? null,
		suggested_block_id: input.suggested_block_id ?? null,
		status: 'draft',
		schema_warnings: warnings,
		dsl_diff: diff,
		approved_by: null,
		applied_at: null,
		task_id: linkedTaskId,
	});

	await createGovernanceComment(linkedTaskId, 'planning', workflow.id, formatCreationComment(changeRequest));
	return changeRequest;
}

export async function scanWorkflowChangeRequest(changeRequestId: number) {
	const changeRequest = await getWorkflowChangeRequestRecord(changeRequestId);
	const graph = await loadWorkflowGraph(changeRequest.workflow_id);

	const warnings = scanWorkflowIntegrity(
		graph.steps,
		graph.relations,
		changeRequest.dsl_diff || {
			change_type: changeRequest.change_type,
			workflow_id: changeRequest.workflow_id,
			preview_summary: ['Missing DSL diff'],
		},
	);

	await updateWorkflowChangeRequestRecord(changeRequest.id, { schema_warnings: warnings });
	return warnings;
}

export async function applyWorkflowChangeRequest(changeRequestId: number, approvedBy?: string | null) {
	const changeRequest = await getWorkflowChangeRequestRecord(changeRequestId);
	const workflow = await getWorkflowRecord(changeRequest.workflow_id);
	const graph = await loadWorkflowGraph(workflow.id);
	const diff = changeRequest.dsl_diff;

	if (!diff) {
		throw createError({
			statusCode: 400,
			statusMessage: `WCR #${changeRequest.id} is missing dsl_diff.`,
		});
	}

	const warnings = scanWorkflowIntegrity(graph.steps, graph.relations, diff);

	if (warnings.some((warning) => warning.severity === 'error')) {
		await updateWorkflowChangeRequestRecord(changeRequest.id, {
			status: 'needs_clarification',
			schema_warnings: warnings,
		});

		throw createError({
			statusCode: 409,
			statusMessage: `WCR #${changeRequest.id} has blocking integrity errors.`,
		});
	}

	try {
		const relationIdsToDelete = (diff.delete_relations || [])
			.map((selector) => findRelationRecord(graph.steps, graph.relations, selector))
			.filter((relation): relation is WorkflowStepRelation => Boolean(relation))
			.map((relation) => relation.id);

		if (relationIdsToDelete.length) {
			await deleteWorkflowRelationsByIds(relationIdsToDelete);
		}

		for (const patch of diff.update_steps || []) {
			const target = findStepRecord(graph.steps, patch);
			if (!target) continue;
			await updateWorkflowStepRecord(target.id, patch.changes);
		}

		const stepIdsToDelete = (diff.delete_steps || [])
			.map((selector) => findStepRecord(graph.steps, selector))
			.filter((step): step is WorkflowStep => Boolean(step))
			.map((step) => step.id);

		if (stepIdsToDelete.length) {
			await deleteWorkflowStepsByIds(stepIdsToDelete);
		}

		const createdStepIds = new Map<string, number>();

		for (const step of diff.create_steps || []) {
			const created = await createWorkflowStepRecord({
				workflow_id: workflow.id,
				step_key: step.step_key,
				step_type: step.step_type,
				title: step.title,
				description: step.description ?? null,
				actor_type: step.actor_type ?? null,
				config: step.config ?? {},
				position_x: step.position_x ?? null,
				position_y: step.position_y ?? null,
				block_id: step.block_id ?? null,
				sort_order: step.sort_order ?? 0,
			});

			createdStepIds.set(created.step_key, created.id);
		}

		const refreshedSteps = await getWorkflowSteps(workflow.id);
		const refreshedRelations = await getWorkflowRelations(workflow.id);

		for (const patch of diff.update_relations || []) {
			const target = findRelationRecord(refreshedSteps, refreshedRelations, patch);
			if (!target) continue;
			const relationChanges = { ...patch.changes };
			delete (relationChanges as Partial<WorkflowRelationDraft>).from_step_key;
			delete (relationChanges as Partial<WorkflowRelationDraft>).to_step_key;
			delete (relationChanges as Partial<WorkflowRelationDraft>).from_step_id;
			delete (relationChanges as Partial<WorkflowRelationDraft>).to_step_id;
			delete (relationChanges as Partial<WorkflowRelationDraft>).relation_id;
			await updateWorkflowRelationRecord(target.id, relationChanges);
		}

		const currentStepIdByKey = new Map(refreshedSteps.map((step) => [step.step_key, step.id]));

		for (const relation of diff.create_relations || []) {
			const fromStepId =
				relation.from_step_id ||
				(relation.from_step_key ? currentStepIdByKey.get(relation.from_step_key) : undefined) ||
				(relation.from_step_key ? createdStepIds.get(relation.from_step_key) : undefined);

			const toStepId =
				relation.to_step_id ||
				(relation.to_step_key ? currentStepIdByKey.get(relation.to_step_key) : undefined) ||
				(relation.to_step_key ? createdStepIds.get(relation.to_step_key) : undefined);

			if (!fromStepId || !toStepId) continue;

			await createWorkflowRelationRecord({
				workflow_id: workflow.id,
				from_step_id: fromStepId,
				to_step_id: toStepId,
				from_step_key: relation.from_step_key,
				to_step_key: relation.to_step_key,
				relation_type: relation.relation_type,
				condition_expression: relation.condition_expression ?? null,
				label: relation.label ?? null,
				sort_order: relation.sort_order ?? 0,
			});
		}

		const finalSteps = await getWorkflowSteps(workflow.id);
		const finalRelations = await getWorkflowRelations(workflow.id);
		const relationDrafts = toWorkflowRelationDrafts(finalSteps, finalRelations);
		const generatedXml = dslToBpmnXml(workflow, finalSteps, relationDrafts);
		const nextVersion = (workflow.version || 0) + 1;

		await updateWorkflowRecord(workflow.id, {
			bpmn_xml: generatedXml,
			version: nextVersion,
		});

		const applied = await updateWorkflowChangeRequestRecord(changeRequest.id, {
			status: 'applied',
			schema_warnings: warnings,
			approved_by: approvedBy ?? changeRequest.approved_by ?? null,
			applied_at: new Date().toISOString(),
		});

		await createGovernanceComment(applied.task_id, 'verify', workflow.id, formatAppliedComment(applied, nextVersion));
		return {
			changeRequest: applied,
			workflowVersion: nextVersion,
			steps: finalSteps,
			relations: finalRelations,
			bpmnXml: generatedXml,
		};
	} catch (error: any) {
		const failureMessage = error?.message || 'Unknown apply failure';
		const updatedWarnings = appendApplyFailure(changeRequest.schema_warnings, failureMessage);

		const failed = await updateWorkflowChangeRequestRecord(changeRequest.id, {
			status: 'needs_clarification',
			schema_warnings: updatedWarnings,
		});

		await createGovernanceComment(
			failed.task_id,
			'verify',
			workflow.id,
			`[WCR #${failed.id}] Apply failed\n${failureMessage}`,
		);

		throw error;
	}
}

export async function updateWorkflowChangeRequestStatus(
	changeRequestId: number,
	status: WorkflowChangeStatus,
	approvedBy?: string | null,
) {
	const changeRequest = await getWorkflowChangeRequestRecord(changeRequestId);

	if (status === 'approved') {
		await updateWorkflowChangeRequestRecord(changeRequest.id, {
			status: 'approved',
			approved_by: approvedBy ?? changeRequest.approved_by ?? null,
		});

		return await applyWorkflowChangeRequest(changeRequest.id, approvedBy ?? changeRequest.approved_by ?? null);
	}

	const updated = await updateWorkflowChangeRequestRecord(changeRequest.id, {
		status,
		approved_by: approvedBy ?? changeRequest.approved_by ?? null,
	});

	await createGovernanceComment(updated.task_id, 'verify', updated.workflow_id, formatStatusComment(updated, status));
	return { changeRequest: updated };
}

export async function migrateWorkflowToDsl(workflowId: number) {
	const workflow = await getWorkflowRecord(workflowId);
	const currentGraph = await loadWorkflowGraph(workflow.id);
	const parsedDsl = parseBpmnXmlToDsl(workflow, workflow.bpmn_xml);
	const existingRelationIds = currentGraph.relations.map((relation) => relation.id);
	const existingStepIds = currentGraph.steps.map((step) => step.id);

	if (existingRelationIds.length) {
		await deleteWorkflowRelationsByIds(existingRelationIds);
	}

	if (existingStepIds.length) {
		await deleteWorkflowStepsByIds(existingStepIds);
	}

	const createdSteps: WorkflowStep[] = [];

	for (const step of parsedDsl.steps) {
		const created = await createWorkflowStepRecord({
			workflow_id: workflow.id,
			step_key: step.step_key,
			step_type: step.step_type,
			title: step.title,
			description: step.description ?? null,
			actor_type: step.actor_type ?? null,
			config: step.config ?? {},
			position_x: step.position_x ?? null,
			position_y: step.position_y ?? null,
			block_id: step.block_id ?? null,
			sort_order: step.sort_order ?? 0,
		});

		createdSteps.push(created);
	}

	const createdStepIdByKey = new Map(createdSteps.map((step) => [step.step_key, step.id]));

	for (const relation of parsedDsl.relations) {
		const fromStepId = relation.from_step_key ? createdStepIdByKey.get(relation.from_step_key) : undefined;
		const toStepId = relation.to_step_key ? createdStepIdByKey.get(relation.to_step_key) : undefined;
		if (!fromStepId || !toStepId) continue;

		await createWorkflowRelationRecord({
			workflow_id: workflow.id,
			from_step_id: fromStepId,
			to_step_id: toStepId,
			from_step_key: relation.from_step_key,
			to_step_key: relation.to_step_key,
			relation_type: relation.relation_type,
			condition_expression: relation.condition_expression ?? null,
			label: relation.label ?? null,
			sort_order: relation.sort_order ?? 0,
		});
	}

	const finalRelations = await getWorkflowRelations(workflow.id);
	const generatedXml = dslToBpmnXml(workflow, createdSteps, toWorkflowRelationDrafts(createdSteps, finalRelations));
	const comparison = compareBpmnStructures(workflow.bpmn_xml, generatedXml);

	if (comparison.matches) {
		await updateWorkflowRecord(workflow.id, { bpmn_xml: generatedXml });
	}

	return {
		workflow,
		steps: createdSteps,
		relations: finalRelations,
		comparison,
		generatedXml,
	};
}
