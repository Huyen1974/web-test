import type { Workflow } from './workflows';

export type WorkflowStepType =
	| 'action'
	| 'agent_call'
	| 'condition'
	| 'wait_for_event'
	| 'human_checkpoint'
	| 'loop'
	| 'parallel';

export type WorkflowActorType =
	| 'user'
	| 'claude_ai'
	| 'claude_code'
	| 'gemini'
	| 'gpt'
	| 'system'
	| 'orchestrator'
	| 'codex';

export type WorkflowRelationType = 'sequence' | 'conditional' | 'parallel_fork' | 'parallel_join' | 'loop_back';

export type BlockCategory = 'review' | 'approval' | 'dispatch' | 'validation' | 'notification' | 'custom';

export type BlockStatus = 'draft' | 'active' | 'deprecated';

export type WorkflowChangeType = 'add_step' | 'modify_step' | 'remove_step' | 'reorder' | 'add_block' | 'restructure';

export type WorkflowChangeStatus =
	| 'draft'
	| 'ai_reviewing'
	| 'needs_clarification'
	| 'ready_for_approval'
	| 'approved'
	| 'rejected'
	| 'applied';

export interface WorkflowStep {
	id: number;
	workflow_id: number;
	step_key: string;
	step_type: WorkflowStepType;
	title: string;
	description?: string | null;
	actor_type?: WorkflowActorType | null;
	config?: Record<string, any> | null;
	position_x?: number | null;
	position_y?: number | null;
	block_id?: number | null;
	sort_order?: number;
	trigger_in_text?: string | null;
	trigger_out_text?: string | null;
	date_created?: string;
	date_updated?: string;
}

export interface WorkflowStepRelation {
	id: number;
	workflow_id: number;
	from_step_id: number;
	to_step_id: number;
	relation_type: WorkflowRelationType;
	condition_expression?: string | null;
	label?: string | null;
	sort_order?: number;
}

export interface BlockTemplateStep {
	template_key: string;
	step_type: WorkflowStepType;
	title: string;
	description?: string | null;
	actor_type?: WorkflowActorType | null;
	actor_param?: string | null;
	config?: Record<string, any> | null;
	position_x?: number | null;
	position_y?: number | null;
	sort_order?: number;
}

export interface BlockTemplateRelation {
	from_template_key: string;
	to_template_key: string;
	relation_type: WorkflowRelationType;
	condition_expression?: string | null;
	label?: string | null;
	sort_order?: number;
}

export interface BlockLibraryItem {
	id: number;
	block_key: string;
	title: string;
	description?: string | null;
	category: BlockCategory;
	template_steps: BlockTemplateStep[];
	template_relations: BlockTemplateRelation[];
	input_params?: Record<string, any> | null;
	version: number;
	status: BlockStatus;
	date_created?: string;
}

export interface WorkflowStepDraft extends Omit<WorkflowStep, 'id' | 'workflow_id' | 'date_created' | 'date_updated'> {
	existing_id?: number;
	source_bpmn_id?: string;
}

export interface WorkflowStepPatch {
	step_id?: number;
	step_key?: string;
	changes: Partial<WorkflowStepDraft>;
}

export interface WorkflowStepSelector {
	step_id?: number;
	step_key?: string;
}

export interface WorkflowRelationDraft {
	relation_id?: number;
	from_step_id?: number;
	to_step_id?: number;
	from_step_key?: string;
	to_step_key?: string;
	relation_type: WorkflowRelationType;
	condition_expression?: string | null;
	label?: string | null;
	sort_order?: number;
}

export interface WorkflowRelationPatch {
	relation_id?: number;
	from_step_key?: string;
	to_step_key?: string;
	changes: Partial<WorkflowRelationDraft>;
}

export interface WorkflowRelationSelector {
	relation_id?: number;
	from_step_key?: string;
	to_step_key?: string;
}

export interface WorkflowDslDiff {
	change_type: WorkflowChangeType;
	workflow_id: number;
	preview_summary: string[];
	create_steps?: WorkflowStepDraft[];
	update_steps?: WorkflowStepPatch[];
	delete_steps?: WorkflowStepSelector[];
	create_relations?: WorkflowRelationDraft[];
	update_relations?: WorkflowRelationPatch[];
	delete_relations?: WorkflowRelationSelector[];
	metadata?: Record<string, any>;
}

export interface SchemaWarning {
	code: string;
	severity: 'info' | 'warning' | 'error';
	message: string;
	step_keys?: string[];
	details?: Record<string, any>;
}

export interface WorkflowChangeRequest {
	id: number;
	workflow_id: number;
	change_type: WorkflowChangeType;
	title: string;
	description?: string | null;
	position_context?: string | null;
	suggested_actor_type?: WorkflowActorType | null;
	suggested_block_id?: number | null;
	status: WorkflowChangeStatus;
	schema_warnings?: SchemaWarning[] | null;
	dsl_diff?: WorkflowDslDiff | null;
	approved_by?: string | null;
	applied_at?: string | null;
	task_id?: number | null;
	date_created?: string;
}

export interface WorkflowRuntimePayload {
	workflow: Workflow;
	bpmnXml: string;
	source: 'dsl' | 'bpmn_cache';
	dslAvailable: boolean;
	stepCount: number;
	relationCount: number;
}
