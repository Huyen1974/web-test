/**
 * Type definitions for workflows collection (M-002 WorkflowModule)
 * Schema created by dot-schema-workflows-ensure
 */

export type WorkflowStatus = 'draft' | 'active' | 'archived';
export type WorkflowLevel = 1 | 2 | 3;

export interface Workflow {
	id: number;
	title: string;
	description?: string | null;
	bpmn_xml: string;
	status: WorkflowStatus;
	task_id?: number | null;
	version: number;
	process_code?: string | null;
	sort?: number | null;
	parent_workflow_id?: number | null;
	level?: WorkflowLevel | null;
	user_created?: string;
	date_created?: string;
	date_updated?: string;
}
