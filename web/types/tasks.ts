/**
 * Type definitions for tasks + task_comments collections (P43 Super Session Task Manager)
 * Schema created by dot-schema-tasks-ensure
 */

import type { User } from './system';

/**
 * Task Status
 */
export type TaskStatus = 'draft' | 'active' | 'in_review' | 'completed' | 'archived';

export const TASK_STATUS = {
	DRAFT: 'draft',
	ACTIVE: 'active',
	IN_REVIEW: 'in_review',
	COMPLETED: 'completed',
	ARCHIVED: 'archived',
} as const;

/**
 * Task Priority
 */
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

/**
 * Agent types for comments
 */
export type AgentType = 'user' | 'claude' | 'claude_code' | 'claude_desktop' | 'gpt' | 'gemini' | 'codex' | 'system';

/**
 * Tab scopes for content and comments
 */
export type TabScope =
	| 'targets'
	| 'rules'
	| 'checklist'
	| 'plan'
	| 'planning'
	| 'prompt'
	| 'reports'
	| 'verify'
	| 'test'
	| 'general';

/**
 * Comment action types
 */
export type CommentAction = 'approve' | 'reject' | 'request_changes' | 'escalate';

/**
 * Task interface matching Directus schema
 */
export interface Task {
	id: number;
	name: string;
	description?: string;
	status: TaskStatus;
	priority?: TaskPriority;
	assigned_to?: string;
	deadline?: string;
	content_targets?: string;
	content_rules?: string;
	content_checklist?: string;
	content_plan?: string;
	content_prompt?: string;
	content_reports?: string;
	content_verify?: string;
	content_test?: string;
	task_type?: string;
	plan_document_path?: string;
	lead_ai?: string;
	critic_ai?: string;
	sort?: number;
	user_created?: string | User;
	date_created?: string;
	date_updated?: string;
	comments?: TaskComment[];
}

/**
 * Task Comment interface
 */
export interface TaskComment {
	id: number;
	task_id: number;
	tab_scope: TabScope;
	agent_type: AgentType;
	content: string;
	action?: CommentAction;
	user_created?: string | User;
	date_created?: string;
}

/**
 * Status display metadata
 */
export const TASK_STATUS_META: Record<TaskStatus, { label: string; color: string; icon: string }> = {
	draft: {
		label: 'Draft',
		color: 'gray',
		icon: 'i-heroicons-pencil-square',
	},
	active: {
		label: 'Active',
		color: 'blue',
		icon: 'i-heroicons-play-circle',
	},
	in_review: {
		label: 'In Review',
		color: 'yellow',
		icon: 'i-heroicons-eye',
	},
	completed: {
		label: 'Completed',
		color: 'green',
		icon: 'i-heroicons-check-circle',
	},
	archived: {
		label: 'Archived',
		color: 'gray',
		icon: 'i-heroicons-archive-box',
	},
};

/**
 * Tab configuration mapping tab names to content fields
 */
export const TAB_CONFIG: Array<{ key: TabScope; label: string; field: keyof Task }> = [
	{ key: 'targets', label: 'Targets', field: 'content_targets' },
	{ key: 'rules', label: 'Rules', field: 'content_rules' },
	{ key: 'checklist', label: 'Checklist', field: 'content_checklist' },
	{ key: 'plan', label: 'Plan', field: 'content_plan' },
	{ key: 'planning', label: 'Planning', field: 'content_plan' },
	{ key: 'prompt', label: 'Prompt', field: 'content_prompt' },
	{ key: 'reports', label: 'Reports', field: 'content_reports' },
	{ key: 'verify', label: 'Verify', field: 'content_verify' },
	{ key: 'test', label: 'Test', field: 'content_test' },
];

/**
 * Priority display metadata
 */
export const TASK_PRIORITY_META: Record<TaskPriority, { label: string; color: string }> = {
	low: { label: 'Low', color: 'gray' },
	medium: { label: 'Medium', color: 'blue' },
	high: { label: 'High', color: 'orange' },
	critical: { label: 'Critical', color: 'red' },
};

/**
 * Agent type display metadata
 */
export const AGENT_TYPE_META: Record<AgentType, { label: string; color: string; icon: string }> = {
	user: { label: 'User', color: 'purple', icon: 'i-heroicons-user' },
	claude: { label: 'Claude', color: 'orange', icon: 'i-heroicons-cpu-chip' },
	claude_code: { label: 'Claude Code', color: 'orange', icon: 'i-heroicons-command-line' },
	claude_desktop: { label: 'Claude Desktop', color: 'orange', icon: 'i-heroicons-computer-desktop' },
	gpt: { label: 'GPT', color: 'green', icon: 'i-heroicons-sparkles' },
	gemini: { label: 'Gemini', color: 'blue', icon: 'i-heroicons-bolt' },
	codex: { label: 'Codex', color: 'yellow', icon: 'i-heroicons-code-bracket' },
	system: { label: 'System', color: 'gray', icon: 'i-heroicons-cog-6-tooth' },
};

/**
 * Comment action display metadata
 */
export const COMMENT_ACTION_META: Record<CommentAction, { label: string; color: string }> = {
	approve: { label: 'Approved', color: 'green' },
	reject: { label: 'Rejected', color: 'red' },
	request_changes: { label: 'Changes Requested', color: 'yellow' },
	escalate: { label: 'Escalated', color: 'orange' },
};
