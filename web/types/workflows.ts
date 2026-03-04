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
	status: WorkflowStatus;
	task_id?: number | null;
	version: number;
	process_code?: string | null;
	sort?: number | null;
	parent_workflow_id?: number | null;
	/** @deprecated Use category_id + workflow_categories instead */
	level?: WorkflowLevel | null;
	category_id?: number | null;
	category?: WorkflowCategory | null;
	user_created?: string;
	date_created?: string;
	date_updated?: string;
}

export interface WorkflowCategory {
	id: number;
	name: string;
	code: string;
	level: 1 | 2 | 3;
	parent_id?: number | null;
	parent?: WorkflowCategory | null;
	sort?: number | null;
	status: string;
	description?: string | null;
	date_created?: string;
	date_updated?: string;
}
