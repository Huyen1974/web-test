import { XMLParser } from 'fast-xml-parser';
import type {
	BlockLibraryItem,
	SchemaWarning,
	WorkflowActorType,
	WorkflowChangeType,
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

type Point = { x: number; y: number };

type RenderKind =
	| 'startEvent'
	| 'task'
	| 'serviceTask'
	| 'exclusiveGateway'
	| 'intermediateCatchEvent'
	| 'userTask'
	| 'parallelGateway'
	| 'endEvent';

type BpmnNodeShape = {
	id: string;
	name: string;
	renderKind: RenderKind;
	x: number;
	y: number;
	width: number;
	height: number;
};

type BpmnFlow = {
	id: string;
	sourceRef: string;
	targetRef: string;
	label?: string | null;
	conditionExpression?: string | null;
};

export interface WorkflowChangeIntent {
	workflowId: number;
	changeType: WorkflowChangeType;
	title: string;
	description?: string | null;
	positionContext?: string | null;
	suggestedActorType?: WorkflowActorType | null;
	suggestedBlock?: BlockLibraryItem | null;
	dslDiff?: WorkflowDslDiff | null;
	step?: Partial<WorkflowStepDraft>;
	targetStepKey?: string | null;
	afterStepKey?: string | null;
	beforeStepKey?: string | null;
	blockParams?: Record<string, any> | null;
	reorder?: Array<{ step_key: string; sort_order: number }>;
}

export interface ParsedWorkflowDsl {
	steps: WorkflowStepDraft[];
	relations: WorkflowRelationDraft[];
}

export interface BpmnStructureComparison {
	matches: boolean;
	issues: string[];
}

const xmlParser = new XMLParser({
	ignoreAttributes: false,
	attributeNamePrefix: '',
	allowBooleanAttributes: true,
	parseAttributeValue: false,
	parseTagValue: false,
	trimValues: false,
});

function toArray<T>(value: T | T[] | null | undefined): T[] {
	if (!value) return [];
	return Array.isArray(value) ? value : [value];
}

function escapeXml(value: string) {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&apos;');
}

function sanitizeKey(value: string) {
	return (
		value
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '_')
			.replace(/^_+|_+$/g, '') || 'step'
	);
}

function uniqueStepKey(base: string, taken: Set<string>) {
	let key = sanitizeKey(base);
	let counter = 2;

	while (taken.has(key)) {
		key = `${sanitizeKey(base)}_${counter}`;
		counter += 1;
	}

	taken.add(key);
	return key;
}

function relationLookupKey(
	relation: Pick<WorkflowRelationDraft, 'from_step_key' | 'to_step_key' | 'label' | 'relation_type'>,
) {
	return `${relation.from_step_key || 'missing'}::${relation.to_step_key || 'missing'}::${relation.relation_type || 'sequence'}::${relation.label || ''}`;
}

function stepLookupKey(step: Pick<WorkflowStepDraft, 'step_key'>) {
	return step.step_key;
}

function cloneJson<T>(value: T): T {
	return JSON.parse(JSON.stringify(value)) as T;
}

function defaultRenderKind(step: WorkflowStepDraft | WorkflowStep): RenderKind {
	const renderHint = step.config?.render_as;
	if (renderHint === 'startEvent') return 'startEvent';
	if (renderHint === 'endEvent') return 'endEvent';

	switch (step.step_type) {
		case 'action':
			return 'task';
		case 'agent_call':
			return 'serviceTask';
		case 'condition':
		case 'loop':
			return 'exclusiveGateway';
		case 'wait_for_event':
			return 'intermediateCatchEvent';
		case 'human_checkpoint':
			return 'userTask';
		case 'parallel':
			return 'parallelGateway';
	}
}

function shapeSize(renderKind: RenderKind) {
	switch (renderKind) {
		case 'exclusiveGateway':
		case 'parallelGateway':
			return { width: 60, height: 60 };
		case 'startEvent':
		case 'intermediateCatchEvent':
		case 'endEvent':
			return { width: 36, height: 36 };
		default:
			return { width: 160, height: 80 };
	}
}

function shapeName(step: WorkflowStepDraft | WorkflowStep, stt?: number) {
	const prefix = stt != null ? `${stt}. ` : '';
	if (step.step_type === 'agent_call' && step.actor_type) {
		return `${prefix}${step.actor_type}`;
	}

	return `${prefix}${step.title || step.step_key}`;
}

function stepStateFromRecord(step: WorkflowStep): WorkflowStepDraft {
	return {
		existing_id: step.id,
		step_key: step.step_key,
		step_type: step.step_type,
		title: step.title,
		description: step.description ?? null,
		actor_type: step.actor_type ?? null,
		config: cloneJson(step.config ?? {}),
		position_x: step.position_x ?? null,
		position_y: step.position_y ?? null,
		block_id: step.block_id ?? null,
		sort_order: step.sort_order ?? 0,
	};
}

function relationStateFromRecord(
	relation: WorkflowStepRelation,
	stepById: Map<number, WorkflowStep>,
): WorkflowRelationDraft {
	return {
		relation_id: relation.id,
		from_step_id: relation.from_step_id,
		to_step_id: relation.to_step_id,
		from_step_key: stepById.get(relation.from_step_id)?.step_key,
		to_step_key: stepById.get(relation.to_step_id)?.step_key,
		relation_type: relation.relation_type,
		condition_expression: relation.condition_expression ?? null,
		label: relation.label ?? null,
		sort_order: relation.sort_order ?? 0,
	};
}

export function toWorkflowStepDrafts(steps: WorkflowStep[]) {
	return steps.map((step) => stepStateFromRecord(step));
}

export function toWorkflowRelationDrafts(steps: WorkflowStep[], relations: WorkflowStepRelation[]) {
	const stepById = new Map(steps.map((step) => [step.id, step]));
	return relations.map((relation) => relationStateFromRecord(relation, stepById));
}

function selectorMatchesStep(selector: WorkflowStepSelector, step: WorkflowStepDraft) {
	if (selector.step_id && step.existing_id) return selector.step_id === step.existing_id;
	if (selector.step_key) return selector.step_key === step.step_key;
	return false;
}

function selectorMatchesRelation(selector: WorkflowRelationSelector, relation: WorkflowRelationDraft) {
	if (selector.relation_id && relation.relation_id) return selector.relation_id === relation.relation_id;

	if (selector.from_step_key && selector.to_step_key) {
		return selector.from_step_key === relation.from_step_key && selector.to_step_key === relation.to_step_key;
	}

	return false;
}

export function previewWorkflowDsl(
	existingSteps: WorkflowStep[],
	existingRelations: WorkflowStepRelation[],
	diff: WorkflowDslDiff,
) {
	const stepMap = new Map<string, WorkflowStepDraft>();
	const stepById = new Map<number, WorkflowStep>();
	const relationList: WorkflowRelationDraft[] = [];

	for (const step of existingSteps) {
		stepMap.set(step.step_key, stepStateFromRecord(step));
		stepById.set(step.id, step);
	}

	for (const relation of existingRelations) {
		relationList.push(relationStateFromRecord(relation, stepById));
	}

	for (const selector of diff.delete_steps || []) {
		for (const [stepKey, step] of stepMap.entries()) {
			if (selectorMatchesStep(selector, step)) {
				stepMap.delete(stepKey);
			}
		}
	}

	for (const patch of diff.update_steps || []) {
		const current = patch.step_key
			? stepMap.get(patch.step_key)
			: [...stepMap.values()].find((step) => step.existing_id === patch.step_id);

		if (!current) continue;
		const previousKey = current.step_key;
		Object.assign(current, cloneJson(patch.changes));

		if (patch.changes.step_key && patch.changes.step_key !== previousKey) {
			stepMap.delete(previousKey);
			current.step_key = patch.changes.step_key;
			stepMap.set(current.step_key, current);
		}
	}

	for (const step of diff.create_steps || []) {
		stepMap.set(stepLookupKey(step), cloneJson(step));
	}

	let nextRelations = relationList.filter(
		(relation) => !(diff.delete_relations || []).some((selector) => selectorMatchesRelation(selector, relation)),
	);

	for (const patch of diff.update_relations || []) {
		const target = nextRelations.find((relation) => {
			if (patch.relation_id && relation.relation_id) return patch.relation_id === relation.relation_id;

			if (patch.from_step_key && patch.to_step_key) {
				return patch.from_step_key === relation.from_step_key && patch.to_step_key === relation.to_step_key;
			}

			return false;
		});

		if (!target) continue;
		Object.assign(target, cloneJson(patch.changes));
	}

	for (const relation of diff.create_relations || []) {
		nextRelations.push(cloneJson(relation));
	}

	nextRelations = nextRelations.filter((relation) => relation.from_step_key && relation.to_step_key);

	return {
		steps: [...stepMap.values()].sort(
			(left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0) || left.step_key.localeCompare(right.step_key),
		),
		relations: nextRelations.sort(
			(left, right) =>
				(left.sort_order ?? 0) - (right.sort_order ?? 0) ||
				relationLookupKey(left).localeCompare(relationLookupKey(right)),
		),
	};
}

function buildWarningsFromGraph(steps: WorkflowStepDraft[], relations: WorkflowRelationDraft[]) {
	const warnings: SchemaWarning[] = [];
	const counts = new Map<string, number>();

	for (const step of steps) {
		counts.set(step.step_key, (counts.get(step.step_key) || 0) + 1);
	}

	for (const [stepKey, total] of counts.entries()) {
		if (total > 1) {
			warnings.push({
				code: 'duplicate_step_key',
				severity: 'error',
				message: `Step key '${stepKey}' appears ${total} times in the same workflow.`,
				step_keys: [stepKey],
			});
		}
	}

	const stepKeys = new Set(steps.map((step) => step.step_key));
	const incoming = new Map<string, number>();
	const outgoing = new Map<string, number>();
	const outgoingRelations = new Map<string, WorkflowRelationDraft[]>();

	for (const relation of relations) {
		if (!relation.from_step_key || !relation.to_step_key) continue;

		if (!stepKeys.has(relation.from_step_key) || !stepKeys.has(relation.to_step_key)) {
			warnings.push({
				code: 'missing_relation_endpoint',
				severity: 'error',
				message: `Relation ${relation.from_step_key || 'unknown'} -> ${relation.to_step_key || 'unknown'} references a missing step.`,
				step_keys: [relation.from_step_key || 'missing', relation.to_step_key || 'missing'],
			});

			continue;
		}

		outgoing.set(relation.from_step_key, (outgoing.get(relation.from_step_key) || 0) + 1);
		incoming.set(relation.to_step_key, (incoming.get(relation.to_step_key) || 0) + 1);
		outgoingRelations.set(relation.from_step_key, [...(outgoingRelations.get(relation.from_step_key) || []), relation]);
	}

	for (const step of steps) {
		const hasIncoming = (incoming.get(step.step_key) || 0) > 0;
		const hasOutgoing = (outgoing.get(step.step_key) || 0) > 0;

		if (!hasIncoming && !hasOutgoing) {
			warnings.push({
				code: 'orphan_step',
				severity: 'warning',
				message: `Step '${step.step_key}' is orphaned and has no incoming or outgoing relations.`,
				step_keys: [step.step_key],
			});
		}

		if (step.step_type === 'condition') {
			const conditionBranches = outgoingRelations.get(step.step_key) || [];

			if (conditionBranches.length < 2) {
				warnings.push({
					code: 'condition_incomplete',
					severity: 'warning',
					message: `Condition step '${step.step_key}' should branch to at least two destinations.`,
					step_keys: [step.step_key],
				});
			}
		}

		if (step.step_type === 'loop') {
			const loopBranches = outgoingRelations.get(step.step_key) || [];
			const hasLoopBack = loopBranches.some((relation) => relation.relation_type === 'loop_back');
			const hasExit = loopBranches.some((relation) => relation.relation_type !== 'loop_back');

			if (hasLoopBack && !hasExit) {
				warnings.push({
					code: 'loop_without_exit',
					severity: 'warning',
					message: `Loop step '${step.step_key}' has a loop-back edge but no exit path.`,
					step_keys: [step.step_key],
				});
			}
		}
	}

	return warnings;
}

export function scanWorkflowIntegrity(
	existingSteps: WorkflowStep[],
	existingRelations: WorkflowStepRelation[],
	diff: WorkflowDslDiff,
) {
	const preview = previewWorkflowDsl(existingSteps, existingRelations, diff);
	return buildWarningsFromGraph(preview.steps, preview.relations);
}

function buildPreviewSummary(diff: WorkflowDslDiff) {
	return [
		diff.create_steps?.length ? `+${diff.create_steps.length} steps` : null,
		diff.update_steps?.length ? `~${diff.update_steps.length} step updates` : null,
		diff.delete_steps?.length ? `-${diff.delete_steps.length} steps` : null,
		diff.create_relations?.length ? `+${diff.create_relations.length} relations` : null,
		diff.delete_relations?.length ? `-${diff.delete_relations.length} relations` : null,
	].filter(Boolean) as string[];
}

function nextSortOrder(existingSteps: WorkflowStep[]) {
	return existingSteps.reduce((maxValue, step) => Math.max(maxValue, step.sort_order || 0), 0) + 10;
}

function findSimpleSuccessor(existingRelations: WorkflowStepRelation[], sourceStepId?: number) {
	if (!sourceStepId) return null;

	const candidates = existingRelations
		.filter((relation) => relation.from_step_id === sourceStepId && relation.relation_type !== 'loop_back')
		.sort((left, right) => (left.sort_order || 0) - (right.sort_order || 0));

	return candidates.length === 1 ? candidates[0] : null;
}

function resolveStepKeyFromIntent(value: string | null | undefined) {
	return value?.trim() || null;
}

function buildStepDraft(
	intent: WorkflowChangeIntent,
	existingSteps: WorkflowStep[],
	takenStepKeys: Set<string>,
	baseSortOrder: number,
) {
	const stepInput = intent.step || {};
	const baseKey = stepInput.step_key || stepInput.title || intent.title || 'step';

	return {
		step_key: uniqueStepKey(baseKey, takenStepKeys),
		step_type: stepInput.step_type || 'action',
		title: stepInput.title || intent.title,
		description: stepInput.description ?? intent.description ?? null,
		actor_type: stepInput.actor_type ?? intent.suggestedActorType ?? null,
		config: cloneJson(stepInput.config ?? {}),
		position_x: stepInput.position_x ?? null,
		position_y: stepInput.position_y ?? null,
		block_id: stepInput.block_id ?? null,
		sort_order: stepInput.sort_order ?? baseSortOrder ?? nextSortOrder(existingSteps),
	};
}

function buildInsertRelations(
	existingSteps: WorkflowStep[],
	existingRelations: WorkflowStepRelation[],
	afterStepKey: string | null,
	newEntryStepKey: string,
	newExitStepKeys: string[],
) {
	const predecessor = afterStepKey ? existingSteps.find((step) => step.step_key === afterStepKey) : null;
	const replacedRelation = predecessor ? findSimpleSuccessor(existingRelations, predecessor.id) : null;
	const createRelations: WorkflowRelationDraft[] = [];
	const deleteRelations: WorkflowRelationSelector[] = [];

	if (predecessor) {
		createRelations.push({
			from_step_key: predecessor.step_key,
			to_step_key: newEntryStepKey,
			relation_type: replacedRelation?.relation_type || 'sequence',
			sort_order: (replacedRelation?.sort_order || predecessor.sort_order || 0) + 1,
		});
	}

	if (replacedRelation) {
		const replacedTarget = existingSteps.find((step) => step.id === replacedRelation.to_step_id);

		if (replacedTarget) {
			deleteRelations.push({ relation_id: replacedRelation.id });

			for (const exitStepKey of newExitStepKeys) {
				createRelations.push({
					from_step_key: exitStepKey,
					to_step_key: replacedTarget.step_key,
					relation_type: replacedRelation.relation_type,
					label: replacedRelation.label ?? null,
					condition_expression: replacedRelation.condition_expression ?? null,
					sort_order: (replacedRelation.sort_order || 0) + 2,
				});
			}
		}
	}

	return { createRelations, deleteRelations };
}

function expandBlockTemplate(
	block: BlockLibraryItem,
	existingSteps: WorkflowStep[],
	takenStepKeys: Set<string>,
	blockParams?: Record<string, any> | null,
) {
	const prefix = uniqueStepKey(`${block.block_key}_${existingSteps.length + 1}`, takenStepKeys);
	const templateKeyMap = new Map<string, string>();
	const createdSteps: WorkflowStepDraft[] = [];

	for (const templateStep of block.template_steps || []) {
		const resolvedStepKey = uniqueStepKey(`${prefix}_${templateStep.template_key}`, takenStepKeys);
		templateKeyMap.set(templateStep.template_key, resolvedStepKey);

		createdSteps.push({
			step_key: resolvedStepKey,
			step_type: templateStep.step_type,
			title: templateStep.title,
			description: templateStep.description ?? null,
			actor_type: templateStep.actor_param
				? blockParams?.[templateStep.actor_param] || templateStep.actor_type || null
				: templateStep.actor_type || null,
			config: {
				...(templateStep.config || {}),
				...(blockParams || {}),
			},
			position_x: templateStep.position_x ?? null,
			position_y: templateStep.position_y ?? null,
			block_id: block.id,
			sort_order: templateStep.sort_order ?? nextSortOrder(existingSteps) + createdSteps.length,
		});
	}

	const internalRelations = (block.template_relations || []).map((relation, index) => ({
		from_step_key: templateKeyMap.get(relation.from_template_key),
		to_step_key: templateKeyMap.get(relation.to_template_key),
		relation_type: relation.relation_type,
		condition_expression: relation.condition_expression ?? null,
		label: relation.label ?? null,
		sort_order: relation.sort_order ?? index * 10,
	}));

	const inboundTargets = new Set(internalRelations.map((relation) => relation.to_step_key));
	const outboundSources = new Set(internalRelations.map((relation) => relation.from_step_key));

	const entryStepKeys = createdSteps.map((step) => step.step_key).filter((stepKey) => !inboundTargets.has(stepKey));

	const exitStepKeys = createdSteps.map((step) => step.step_key).filter((stepKey) => !outboundSources.has(stepKey));

	return {
		steps: createdSteps,
		relations: internalRelations,
		entryStepKeys,
		exitStepKeys,
	};
}

export function buildWorkflowChangeDiff(
	intent: WorkflowChangeIntent,
	existingSteps: WorkflowStep[],
	existingRelations: WorkflowStepRelation[],
) {
	if (intent.dslDiff) {
		return {
			...cloneJson(intent.dslDiff),
			preview_summary: intent.dslDiff.preview_summary?.length
				? intent.dslDiff.preview_summary
				: buildPreviewSummary(intent.dslDiff),
		};
	}

	const takenStepKeys = new Set(existingSteps.map((step) => step.step_key));
	const afterStepKey = resolveStepKeyFromIntent(intent.afterStepKey);
	const targetStepKey = resolveStepKeyFromIntent(intent.targetStepKey);

	switch (intent.changeType) {
		case 'add_step': {
			const newStep = buildStepDraft(intent, existingSteps, takenStepKeys, nextSortOrder(existingSteps));

			const insert = buildInsertRelations(existingSteps, existingRelations, afterStepKey, newStep.step_key, [
				newStep.step_key,
			]);

			const diff: WorkflowDslDiff = {
				change_type: 'add_step',
				workflow_id: intent.workflowId,
				create_steps: [newStep],
				create_relations: insert.createRelations,
				delete_relations: insert.deleteRelations,
				metadata: {
					after_step_key: afterStepKey,
				},
				preview_summary: [],
			};

			diff.preview_summary = buildPreviewSummary(diff);
			return diff;
		}

		case 'add_block': {
			if (!intent.suggestedBlock) {
				return {
					change_type: 'add_block',
					workflow_id: intent.workflowId,
					preview_summary: ['No block selected'],
				};
			}

			const blockExpansion = expandBlockTemplate(
				intent.suggestedBlock,
				existingSteps,
				takenStepKeys,
				intent.blockParams,
			);

			const insert = buildInsertRelations(
				existingSteps,
				existingRelations,
				afterStepKey,
				blockExpansion.entryStepKeys[0] || blockExpansion.steps[0]?.step_key,
				blockExpansion.exitStepKeys.length
					? blockExpansion.exitStepKeys
					: [blockExpansion.steps.at(-1)?.step_key || blockExpansion.steps[0]?.step_key],
			);

			const diff: WorkflowDslDiff = {
				change_type: 'add_block',
				workflow_id: intent.workflowId,
				create_steps: blockExpansion.steps,
				create_relations: [...blockExpansion.relations, ...insert.createRelations],
				delete_relations: insert.deleteRelations,
				metadata: {
					after_step_key: afterStepKey,
					block_key: intent.suggestedBlock.block_key,
				},
				preview_summary: [],
			};

			diff.preview_summary = buildPreviewSummary(diff);
			return diff;
		}

		case 'modify_step': {
			const changes = cloneJson(intent.step || {});
			delete (changes as Partial<WorkflowStepDraft>).existing_id;

			const diff: WorkflowDslDiff = {
				change_type: 'modify_step',
				workflow_id: intent.workflowId,
				update_steps: targetStepKey ? [{ step_key: targetStepKey, changes }] : [],
				metadata: {
					target_step_key: targetStepKey,
				},
				preview_summary: [],
			};

			diff.preview_summary = buildPreviewSummary(diff);
			return diff;
		}

		case 'remove_step': {
			const targetStep = targetStepKey ? existingSteps.find((step) => step.step_key === targetStepKey) : null;
			const incoming = targetStep ? existingRelations.filter((relation) => relation.to_step_id === targetStep.id) : [];

			const outgoing = targetStep
				? existingRelations.filter((relation) => relation.from_step_id === targetStep.id)
				: [];

			const deleteRelations = [...incoming, ...outgoing].map((relation) => ({ relation_id: relation.id }));
			const createRelations: WorkflowRelationDraft[] = [];

			if (targetStep && incoming.length === 1 && outgoing.length === 1) {
				const previousStep = existingSteps.find((step) => step.id === incoming[0].from_step_id);
				const nextStep = existingSteps.find((step) => step.id === outgoing[0].to_step_id);

				if (previousStep && nextStep && previousStep.id !== nextStep.id) {
					createRelations.push({
						from_step_key: previousStep.step_key,
						to_step_key: nextStep.step_key,
						relation_type: outgoing[0].relation_type,
						label: outgoing[0].label ?? null,
						condition_expression: outgoing[0].condition_expression ?? null,
						sort_order: outgoing[0].sort_order ?? incoming[0].sort_order ?? 0,
					});
				}
			}

			const diff: WorkflowDslDiff = {
				change_type: 'remove_step',
				workflow_id: intent.workflowId,
				delete_steps: targetStepKey ? [{ step_key: targetStepKey }] : [],
				delete_relations: deleteRelations,
				create_relations: createRelations,
				preview_summary: [],
			};

			diff.preview_summary = buildPreviewSummary(diff);
			return diff;
		}

		case 'reorder': {
			const diff: WorkflowDslDiff = {
				change_type: 'reorder',
				workflow_id: intent.workflowId,
				update_steps: (intent.reorder || []).map<WorkflowStepPatch>((item) => ({
					step_key: item.step_key,
					changes: { sort_order: item.sort_order },
				})),
				preview_summary: [],
			};

			diff.preview_summary = buildPreviewSummary(diff);
			return diff;
		}

		default:
			return {
				change_type: intent.changeType,
				workflow_id: intent.workflowId,
				preview_summary: ['Manual restructure diff required'],
			};
	}
}

function buildShapeRegistry(
	steps: Array<WorkflowStepDraft | WorkflowStep>,
	relations: WorkflowRelationDraft[],
	_workflowTitle: string,
) {
	const outgoing = new Map<string, WorkflowRelationDraft[]>();
	const incoming = new Map<string, WorkflowRelationDraft[]>();

	for (const relation of relations) {
		if (!relation.from_step_key || !relation.to_step_key) continue;
		outgoing.set(relation.from_step_key, [...(outgoing.get(relation.from_step_key) || []), relation]);
		incoming.set(relation.to_step_key, [...(incoming.get(relation.to_step_key) || []), relation]);
	}

	// === TB (top→bottom) layout via BFS layering ===
	const CENTER_X = 400;
	const VERTICAL_SPACING = 200;
	const HORIZONTAL_SPACING = 250;

	// Build adjacency for BFS
	const childrenOf = new Map<string, string[]>();
	for (const relation of relations) {
		if (!relation.from_step_key || !relation.to_step_key) continue;
		childrenOf.set(relation.from_step_key, [...(childrenOf.get(relation.from_step_key) || []), relation.to_step_key]);
	}

	// Find entry steps (no incoming edges, not start/end events)
	const allStepKeys = new Set(steps.map((s) => s.step_key));
	const hasIncoming = new Set<string>();
	for (const relation of relations) {
		if (relation.to_step_key && allStepKeys.has(relation.to_step_key)) {
			hasIncoming.add(relation.to_step_key);
		}
	}

	// BFS to assign layers (depth)
	const layerOf = new Map<string, number>();
	const queue: string[] = [];
	for (const step of steps) {
		const isStartEvent = step.config?.render_as === 'startEvent';
		if (isStartEvent || !hasIncoming.has(step.step_key)) {
			layerOf.set(step.step_key, 0);
			queue.push(step.step_key);
		}
	}

	let head = 0;
	while (head < queue.length) {
		const current = queue[head++];
		const currentLayer = layerOf.get(current) ?? 0;
		for (const child of childrenOf.get(current) || []) {
			const existingLayer = layerOf.get(child);
			if (existingLayer === undefined || existingLayer < currentLayer + 1) {
				layerOf.set(child, currentLayer + 1);
				queue.push(child);
			}
		}
	}

	// Assign layers for any unvisited steps
	for (const step of steps) {
		if (!layerOf.has(step.step_key)) {
			layerOf.set(step.step_key, steps.indexOf(step));
		}
	}

	// Group steps by layer
	const layers = new Map<number, (WorkflowStepDraft | WorkflowStep)[]>();
	for (const step of steps) {
		const layer = layerOf.get(step.step_key) ?? 0;
		layers.set(layer, [...(layers.get(layer) || []), step]);
	}

	// Position nodes: y by layer, x spread within layer
	const positionedSteps = steps.map((step, index) => {
		const renderKind = defaultRenderKind(step);
		const size = shapeSize(renderKind);
		const layer = layerOf.get(step.step_key) ?? index;
		const layerSteps = layers.get(layer) || [step];
		const posInLayer = layerSteps.indexOf(step);
		const layerWidth = layerSteps.length;

		// Use explicit positions if set, otherwise compute TB layout
		const x = step.position_x ?? (CENTER_X + (posInLayer - (layerWidth - 1) / 2) * HORIZONTAL_SPACING);
		const y = step.position_y ?? (80 + layer * VERTICAL_SPACING);

		// STT: use sort_order if available, otherwise index + 1
		const stt = (step as any).sort_order ?? index + 1;

		return {
			id: step.step_key,
			name: shapeName(step, stt),
			renderKind,
			x,
			y,
			width: size.width,
			height: size.height,
		} satisfies BpmnNodeShape;
	});

	const explicitStartNodes = positionedSteps.filter((step) => step.renderKind === 'startEvent');

	const entrySteps = positionedSteps.filter(
		(step) =>
			step.renderKind !== 'startEvent' && step.renderKind !== 'endEvent' && !(incoming.get(step.id) || []).length,
	);

	const exitSteps = positionedSteps.filter(
		(step) =>
			step.renderKind !== 'startEvent' && step.renderKind !== 'endEvent' && !(outgoing.get(step.id) || []).length,
	);

	const maxLayer = Math.max(0, ...Array.from(layerOf.values()));
	const averageExitX = exitSteps.length ? exitSteps.reduce((sum, s) => sum + s.x, 0) / exitSteps.length : CENTER_X;

	const startNode: BpmnNodeShape | null = explicitStartNodes.length
		? null
		: {
				id: 'start_event',
				name: 'Bắt đầu',
				renderKind: 'startEvent',
				x: CENTER_X - 18,
				y: 10,
				width: 36,
				height: 36,
			};

	const endNodes = exitSteps.map((step, index) => ({
		id: `end_event_${sanitizeKey(step.id)}_${index + 1}`,
		name: 'Kết thúc',
		renderKind: 'endEvent' as const,
		x: step.x,
		y: 80 + (maxLayer + 1) * VERTICAL_SPACING,
		width: 36,
		height: 36,
	}));

	return {
		nodes: positionedSteps,
		entrySteps,
		exitSteps,
		startNode,
		endNodes,
	};
}

function elementTagName(renderKind: RenderKind) {
	switch (renderKind) {
		case 'startEvent':
			return 'bpmn:startEvent';
		case 'task':
			return 'bpmn:task';
		case 'serviceTask':
			return 'bpmn:serviceTask';
		case 'exclusiveGateway':
			return 'bpmn:exclusiveGateway';
		case 'intermediateCatchEvent':
			return 'bpmn:intermediateCatchEvent';
		case 'userTask':
			return 'bpmn:userTask';
		case 'parallelGateway':
			return 'bpmn:parallelGateway';
		case 'endEvent':
			return 'bpmn:endEvent';
	}
}

function eventCenter(shape: BpmnNodeShape): Point {
	return {
		x: shape.x + shape.width / 2,
		y: shape.y + shape.height / 2,
	};
}

function buildWaypoints(source: BpmnNodeShape, target: BpmnNodeShape): Point[] {
	const sourceCenter = eventCenter(source);
	const targetCenter = eventCenter(target);

	// Vertical (TB) layout: connections go from bottom of source to top of target
	if (Math.abs(sourceCenter.x - targetCenter.x) <= 8) {
		// Straight vertical line
		return [
			{ x: sourceCenter.x, y: source.y + source.height },
			{ x: targetCenter.x, y: target.y },
		];
	}

	// Offset horizontally: route down then across then down
	const middleY = source.y + source.height + Math.max(30, Math.round((target.y - (source.y + source.height)) / 2));
	return [
		{ x: sourceCenter.x, y: source.y + source.height },
		{ x: sourceCenter.x, y: middleY },
		{ x: targetCenter.x, y: middleY },
		{ x: targetCenter.x, y: target.y },
	];
}

export function dslToBpmnXml(
	workflow: Pick<Workflow, 'id' | 'title' | 'description'>,
	steps: Array<WorkflowStepDraft | WorkflowStep>,
	relations: WorkflowRelationDraft[],
) {
	const registry = buildShapeRegistry(steps, relations, workflow.title);
	const nodeLookup = new Map(registry.nodes.map((node) => [node.id, node]));
	const endNodeLookup = new Map(registry.endNodes.map((node) => [node.id, node]));
	const incomingFlows = new Map<string, string[]>();
	const outgoingFlows = new Map<string, string[]>();
	const flowRecords: BpmnFlow[] = [];

	for (const relation of relations) {
		if (!relation.from_step_key || !relation.to_step_key) continue;

		const flowId = relation.relation_id
			? `flow_${relation.relation_id}`
			: sanitizeKey(`flow_${relation.from_step_key}_${relation.to_step_key}`);

		flowRecords.push({
			id: flowId,
			sourceRef: relation.from_step_key,
			targetRef: relation.to_step_key,
			label: relation.label ?? null,
			conditionExpression: relation.condition_expression ?? null,
		});

		outgoingFlows.set(relation.from_step_key, [...(outgoingFlows.get(relation.from_step_key) || []), flowId]);
		incomingFlows.set(relation.to_step_key, [...(incomingFlows.get(relation.to_step_key) || []), flowId]);
	}

	for (const entryStep of registry.entrySteps) {
		if (!registry.startNode) break;
		const flowId = `flow_start_${sanitizeKey(entryStep.id)}`;

		flowRecords.unshift({
			id: flowId,
			sourceRef: registry.startNode.id,
			targetRef: entryStep.id,
		});

		outgoingFlows.set(registry.startNode.id, [...(outgoingFlows.get(registry.startNode.id) || []), flowId]);
		incomingFlows.set(entryStep.id, [...(incomingFlows.get(entryStep.id) || []), flowId]);
	}

	for (const [index, exitStep] of registry.exitSteps.entries()) {
		const endNode = registry.endNodes[index];
		const flowId = `flow_end_${sanitizeKey(exitStep.id)}`;

		flowRecords.push({
			id: flowId,
			sourceRef: exitStep.id,
			targetRef: endNode.id,
		});

		outgoingFlows.set(exitStep.id, [...(outgoingFlows.get(exitStep.id) || []), flowId]);
		incomingFlows.set(endNode.id, [...(incomingFlows.get(endNode.id) || []), flowId]);
	}

	const processNodes = [registry.startNode, ...registry.nodes, ...registry.endNodes].filter(Boolean) as BpmnNodeShape[];

	const processXml = processNodes
		.map((node) => {
			const tag = elementTagName(node.renderKind);
			const nameAttr = node.name ? ` name="${escapeXml(node.name)}"` : '';
			const markerAttr = node.renderKind === 'parallelGateway' || node.renderKind === 'exclusiveGateway' ? '' : '';
			return [
				`    <${tag} id="${escapeXml(node.id)}"${nameAttr}${markerAttr}>`,
				...(incomingFlows.get(node.id) || []).map(
					(flowId) => `      <bpmn:incoming>${escapeXml(flowId)}</bpmn:incoming>`,
				),
				...(outgoingFlows.get(node.id) || []).map(
					(flowId) => `      <bpmn:outgoing>${escapeXml(flowId)}</bpmn:outgoing>`,
				),
				`    </${tag}>`,
			].join('\n');
		})
		.join('\n');

	const flowXml = flowRecords
		.map((flow) => {
			const nameAttr = flow.label ? ` name="${escapeXml(flow.label)}"` : '';
			const attrs = `id="${escapeXml(flow.id)}" sourceRef="${escapeXml(flow.sourceRef)}" targetRef="${escapeXml(flow.targetRef)}"${nameAttr}`;

			if (!flow.conditionExpression) {
				return `    <bpmn:sequenceFlow ${attrs} />`;
			}

			return [
				`    <bpmn:sequenceFlow ${attrs}>`,
				`      <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">${escapeXml(flow.conditionExpression)}</bpmn:conditionExpression>`,
				`    </bpmn:sequenceFlow>`,
			].join('\n');
		})
		.join('\n');

	const shapeXml = processNodes
		.map((node) => {
			const isMarkerVisible =
				node.renderKind === 'exclusiveGateway' || node.renderKind === 'parallelGateway'
					? ' isMarkerVisible="true"'
					: '';

			return [
				`      <bpmndi:BPMNShape id="${escapeXml(node.id)}_di" bpmnElement="${escapeXml(node.id)}"${isMarkerVisible}>`,
				`        <dc:Bounds x="${Math.round(node.x)}" y="${Math.round(node.y)}" width="${Math.round(node.width)}" height="${Math.round(node.height)}" />`,
				`      </bpmndi:BPMNShape>`,
			].join('\n');
		})
		.join('\n');

	const edgeXml = flowRecords
		.map((flow) => {
			const source =
				nodeLookup.get(flow.sourceRef) ||
				(registry.startNode && registry.startNode.id === flow.sourceRef
					? registry.startNode
					: endNodeLookup.get(flow.sourceRef));

			const target =
				nodeLookup.get(flow.targetRef) ||
				(registry.startNode && registry.startNode.id === flow.targetRef
					? registry.startNode
					: endNodeLookup.get(flow.targetRef));

			if (!source || !target) return '';

			return [
				`      <bpmndi:BPMNEdge id="${escapeXml(flow.id)}_di" bpmnElement="${escapeXml(flow.id)}">`,
				...buildWaypoints(source as BpmnNodeShape, target as BpmnNodeShape).map(
					(point) => `        <di:waypoint x="${Math.round(point.x)}" y="${Math.round(point.y)}" />`,
				),
				`      </bpmndi:BPMNEdge>`,
			].join('\n');
		})
		.filter(Boolean)
		.join('\n');

	return [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" id="Definitions_WorkflowDsl" targetNamespace="http://bpmn.io/schema/bpmn">',
		`  <bpmn:process id="Workflow_${workflow.id}" name="${escapeXml(workflow.title)}" isExecutable="true">`,
		processXml,
		flowXml,
		'  </bpmn:process>',
		'  <bpmndi:BPMNDiagram id="BPMNDiagram_WorkflowDsl">',
		`    <bpmndi:BPMNPlane id="BPMNPlane_WorkflowDsl" bpmnElement="Workflow_${workflow.id}">`,
		shapeXml,
		edgeXml,
		'    </bpmndi:BPMNPlane>',
		'  </bpmndi:BPMNDiagram>',
		'</bpmn:definitions>',
	].join('\n');
}

function lookupShapeBounds(definitions: Record<string, any>) {
	const diagram = toArray(definitions['bpmndi:BPMNDiagram'])[0];
	const plane = toArray(diagram?.['bpmndi:BPMNPlane'])[0];
	const shapes = toArray(plane?.['bpmndi:BPMNShape']);
	const boundsByElement = new Map<string, { x: number; y: number }>();

	for (const shape of shapes) {
		const bounds = shape['dc:Bounds'];
		if (!shape?.bpmnElement || !bounds) continue;

		boundsByElement.set(shape.bpmnElement, {
			x: Number(bounds.x || 0),
			y: Number(bounds.y || 0),
		});
	}

	return boundsByElement;
}

export function parseBpmnXmlToDsl(workflow: Pick<Workflow, 'id' | 'title'>, bpmnXml: string): ParsedWorkflowDsl {
	const parsed = xmlParser.parse(bpmnXml);
	const definitions = parsed['bpmn:definitions'];
	const process = toArray(definitions?.['bpmn:process'])[0];
	const boundsByElement = lookupShapeBounds(definitions);
	const steps: WorkflowStepDraft[] = [];
	const relations: WorkflowRelationDraft[] = [];
	const takenStepKeys = new Set<string>();
	const bpmnIdToStepKey = new Map<string, string>();

	const nodeMappings: Array<{ tag: string; step_type: WorkflowStepDraft['step_type']; render_as?: RenderKind | null }> =
		[
			{ tag: 'bpmn:startEvent', step_type: 'wait_for_event', render_as: 'startEvent' },
			{ tag: 'bpmn:task', step_type: 'action' },
			{ tag: 'bpmn:userTask', step_type: 'human_checkpoint' },
			{ tag: 'bpmn:serviceTask', step_type: 'agent_call' },
			{ tag: 'bpmn:exclusiveGateway', step_type: 'condition' },
			{ tag: 'bpmn:parallelGateway', step_type: 'parallel' },
			{ tag: 'bpmn:intermediateCatchEvent', step_type: 'wait_for_event' },
			{ tag: 'bpmn:endEvent', step_type: 'action', render_as: 'endEvent' },
		];

	for (const mapping of nodeMappings) {
		for (const node of toArray(process?.[mapping.tag])) {
			const keyBase = node.name || node.id || mapping.tag.replace('bpmn:', '');
			const stepKey = uniqueStepKey(keyBase, takenStepKeys);
			const bounds = boundsByElement.get(node.id);

			const config = mapping.render_as
				? { render_as: mapping.render_as, source_bpmn_id: node.id }
				: { source_bpmn_id: node.id };

			const actorCandidate = mapping.step_type === 'agent_call' && node.name ? sanitizeKey(node.name) : null;

			const actorType =
				actorCandidate &&
				['user', 'claude_ai', 'claude_code', 'gemini', 'gpt', 'system', 'orchestrator', 'codex'].includes(
					actorCandidate,
				)
					? actorCandidate
					: null;

			steps.push({
				source_bpmn_id: node.id,
				step_key: stepKey,
				step_type: mapping.step_type,
				title: node.name || node.id || workflow.title,
				description: null,
				actor_type: actorType as WorkflowActorType | null,
				config,
				position_x: bounds?.x ?? null,
				position_y: bounds?.y ?? null,
				block_id: null,
				sort_order: steps.length * 10,
			});

			bpmnIdToStepKey.set(node.id, stepKey);
		}
	}

	for (const flow of toArray(process?.['bpmn:sequenceFlow'])) {
		const fromStepKey = bpmnIdToStepKey.get(flow.sourceRef);
		const toStepKey = bpmnIdToStepKey.get(flow.targetRef);

		if (!fromStepKey || !toStepKey) continue;

		relations.push({
			from_step_key: fromStepKey,
			to_step_key: toStepKey,
			relation_type: flow.name ? 'conditional' : 'sequence',
			label: flow.name || null,
			condition_expression: flow['bpmn:conditionExpression'] || null,
			sort_order: relations.length * 10,
		});
	}

	return { steps, relations };
}

function normalizeBpmnStructure(xml: string) {
	const parsed = xmlParser.parse(xml);
	const definitions = parsed['bpmn:definitions'];
	const process = toArray(definitions?.['bpmn:process'])[0];
	const nodes: Array<{ kind: string; name: string }> = [];
	const nodeNames = new Map<string, string>();

	const nodeTags = [
		'bpmn:startEvent',
		'bpmn:endEvent',
		'bpmn:task',
		'bpmn:userTask',
		'bpmn:serviceTask',
		'bpmn:exclusiveGateway',
		'bpmn:parallelGateway',
		'bpmn:intermediateCatchEvent',
	];

	for (const tag of nodeTags) {
		for (const node of toArray(process?.[tag])) {
			const name = node.name || node.id;
			nodes.push({ kind: tag.replace('bpmn:', ''), name });
			nodeNames.set(node.id, name);
		}
	}

	const flows = toArray(process?.['bpmn:sequenceFlow'])
		.map((flow) => ({
			source: nodeNames.get(flow.sourceRef) || flow.sourceRef,
			target: nodeNames.get(flow.targetRef) || flow.targetRef,
			label: flow.name || '',
		}))
		.sort((left, right) =>
			`${left.source}:${left.target}:${left.label}`.localeCompare(`${right.source}:${right.target}:${right.label}`),
		);

	return {
		nodes: nodes.sort((left, right) => `${left.kind}:${left.name}`.localeCompare(`${right.kind}:${right.name}`)),
		flows,
	};
}

export function compareBpmnStructures(originalXml: string, generatedXml: string): BpmnStructureComparison {
	const original = normalizeBpmnStructure(originalXml);
	const generated = normalizeBpmnStructure(generatedXml);
	const issues: string[] = [];

	if (JSON.stringify(original.nodes) !== JSON.stringify(generated.nodes)) {
		issues.push('Node structure differs after DSL regeneration.');
	}

	if (JSON.stringify(original.flows) !== JSON.stringify(generated.flows)) {
		issues.push('Sequence flow structure differs after DSL regeneration.');
	}

	return {
		matches: issues.length === 0,
		issues,
	};
}
