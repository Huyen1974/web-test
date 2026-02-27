/**
 * Comment Module M-001 — Type Definitions
 * Module Protocol Standard compliant
 */

import type { AgentType, CommentAction, TabScope } from '~/types/tasks';

/** Props interface for CommentModule entry point */
export interface CommentModuleProps {
	/** Directus task ID to load comments for */
	taskId: number | string;
	/** Filter comments by tab_scope. Omit to show all. */
	tabScope?: TabScope;
	/** Disable form and editing */
	readonly?: boolean;
	/** Section title */
	title?: string;
}

/** Agent display config for chat-style rendering */
export interface AgentDisplay {
	label: string;
	abbrev: string;
	emoji: string;
	color: string;
}

/** Map agent_type values to chat-style display */
export const AGENT_DISPLAY: Record<string, AgentDisplay> = {
	// AI
	claude_ai: { label: 'Claude AI', abbrev: 'CA', emoji: '🟣', color: 'purple' },
	gpt: { label: 'GPT', abbrev: 'G', emoji: '🟢', color: 'green' },
	gemini: { label: 'Gemini', abbrev: 'Ge', emoji: '🔵', color: 'blue' },
	// Agents
	claude_code: { label: 'Claude Code', abbrev: 'CC', emoji: '⚙️', color: 'orange' },
	codex: { label: 'Codex', abbrev: 'Cx', emoji: '🔧', color: 'yellow' },
	antigravity: { label: 'Antigravity', abbrev: 'AG', emoji: '🚀', color: 'pink' },
	// User + System
	user: { label: 'User', abbrev: 'U', emoji: '👤', color: 'gray' },
	system: { label: 'System', abbrev: 'S', emoji: '🤖', color: 'gray' },
};

/** Get agent display info with fallback for unknown types */
export function getAgentDisplay(agentType: string): AgentDisplay {
	return AGENT_DISPLAY[agentType] || { label: agentType || 'Unknown', abbrev: '?', emoji: '❓', color: 'gray' };
}

/** Action display config */
export interface ActionDisplay {
	label: string;
	emoji: string;
	color: string;
}

export const ACTION_DISPLAY: Record<string, ActionDisplay> = {
	approve: { label: 'Approved', emoji: '✅', color: 'green' },
	reject: { label: 'Rejected', emoji: '❌', color: 'red' },
	request_changes: { label: 'Changes Requested', emoji: '🔄', color: 'yellow' },
	escalate: { label: 'Escalated', emoji: '⚠️', color: 'orange' },
};

export function getActionDisplay(action: string): ActionDisplay | null {
	return ACTION_DISPLAY[action] || null;
}

/**
 * Tailwind-safe color class mapping
 * Full class strings so Tailwind purge can detect them
 */
export const COLOR_CLASSES: Record<string, { avatar: string; name: string; badge: string }> = {
	purple: {
		avatar: 'bg-purple-100 dark:bg-purple-900/30',
		name: 'text-purple-700 dark:text-purple-400',
		badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
	},
	orange: {
		avatar: 'bg-orange-100 dark:bg-orange-900/30',
		name: 'text-orange-700 dark:text-orange-400',
		badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
	},
	green: {
		avatar: 'bg-green-100 dark:bg-green-900/30',
		name: 'text-green-700 dark:text-green-400',
		badge: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
	},
	blue: {
		avatar: 'bg-blue-100 dark:bg-blue-900/30',
		name: 'text-blue-700 dark:text-blue-400',
		badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
	},
	yellow: {
		avatar: 'bg-yellow-100 dark:bg-yellow-900/30',
		name: 'text-yellow-700 dark:text-yellow-400',
		badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
	},
	pink: {
		avatar: 'bg-pink-100 dark:bg-pink-900/30',
		name: 'text-pink-700 dark:text-pink-400',
		badge: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
	},
	red: {
		avatar: 'bg-red-100 dark:bg-red-900/30',
		name: 'text-red-700 dark:text-red-400',
		badge: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
	},
	gray: {
		avatar: 'bg-gray-100 dark:bg-gray-800',
		name: 'text-gray-600 dark:text-gray-400',
		badge: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
	},
};

export function getColorClasses(color: string) {
	return COLOR_CLASSES[color] || COLOR_CLASSES.gray;
}
