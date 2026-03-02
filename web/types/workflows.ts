/**
 * Type definitions for workflows collection (M-002 WorkflowModule)
 * Schema created by dot-schema-workflows-ensure
 */

export type WorkflowStatus = 'draft' | 'active' | 'archived';

export interface Workflow {
	id: number;
	title: string;
	description?: string;
	bpmn_xml: string;
	status: WorkflowStatus;
	task_id?: number;
	version: number;
	user_created?: string;
	date_created?: string;
	date_updated?: string;
}
