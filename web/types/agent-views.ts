/**
 * Agent Views Types
 *
 * Types for the agent_views collection which stores GitHub-synced documentation.
 * Part of WEB-20 Phase 2 implementation.
 */

/** Raw Directus agent_views record */
export interface AgentView {
	id: number;
	source_id: string;
	title: string;
	content: string;
	summary?: string;
	permalink?: string;
	path?: string;
	sha?: string;
	doc_type?: string;
	last_synced?: string;
	status?: string;
	tags?: string[];
	is_global?: boolean;
}

/** Tree node for displaying docs in hierarchical structure */
export interface DocsTreeNode {
	id: string;
	name: string;
	path: string;
	isFolder: boolean;
	children: DocsTreeNode[];
	document?: AgentView;
}

/** Breadcrumb item for navigation */
export interface DocsBreadcrumb {
	name: string;
	path: string;
}
