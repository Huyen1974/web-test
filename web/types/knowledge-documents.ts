/**
 * Type definitions for knowledge_documents collection (E1 Growth Zone)
 * Enhanced types for tree/folder display (E1-05)
 * Based on E1-01 schema migration with parent_document_id relation
 */

import type { User } from './system';

/**
 * Knowledge Document Status
 */
export type KnowledgeDocumentStatus = 'draft' | 'published' | 'archived';

/**
 * Knowledge Document (from schema)
 * Represents a knowledge base article or folder
 */
export interface KnowledgeDocument {
	id: number;
	title: string;
	slug?: string;
	content?: string;
	status?: KnowledgeDocumentStatus;
	parent_document_id?: number | null; // Folder/tree structure (E1-01)
	is_folder?: boolean; // Optional flag to mark as folder vs document
	user_created?: string | User;
	date_created?: string;
	user_updated?: string | User;
	date_updated?: string;
}

/**
 * Knowledge Document with related data (view model)
 * Includes parent and user details
 */
export interface KnowledgeDocumentView extends KnowledgeDocument {
	parent_document?: KnowledgeDocument;
	user_created?: User;
	user_updated?: User;
}

/**
 * Tree Node for UI rendering
 * Represents a node in the hierarchical tree structure
 */
export interface KnowledgeTreeNode {
	id: number;
	title: string;
	slug?: string;
	isFolder: boolean;
	parentId?: number | null;
	status?: KnowledgeDocumentStatus;
	children?: KnowledgeTreeNode[];
	hasChildren?: boolean; // For lazy loading
	isExpanded?: boolean; // UI state
	isLoading?: boolean; // UI loading state
}

/**
 * Filter options for knowledge documents
 */
export interface KnowledgeDocumentFilters {
	parent_document_id?: number | null; // Filter by parent (null = root)
	status?: KnowledgeDocumentStatus | KnowledgeDocumentStatus[];
	is_folder?: boolean;
	search?: string; // Search in title/content
}

/**
 * Payload for creating a new folder
 */
export interface CreateFolderPayload {
	title: string;
	parent_document_id?: number | null;
	is_folder?: boolean;
}

/**
 * Payload for moving a document/folder
 */
export interface MoveNodePayload {
	id: number;
	parent_document_id?: number | null;
}

/**
 * Helper: Check if document is a folder
 * A document is considered a folder if:
 * 1. is_folder flag is true, OR
 * 2. It has no content and serves as a container
 */
export function isFolder(doc: KnowledgeDocument): boolean {
	if (doc.is_folder !== undefined) {
		return doc.is_folder;
	}

	// Infer: documents with no content are likely folders
	return !doc.content || doc.content.trim() === '';
}

/**
 * Helper: Check if document is at root level
 */
export function isRootDocument(doc: KnowledgeDocument): boolean {
	return !doc.parent_document_id;
}

/**
 * Helper: Convert KnowledgeDocument to TreeNode
 */
export function toTreeNode(doc: KnowledgeDocument, hasChildren = false): KnowledgeTreeNode {
	return {
		id: doc.id,
		title: doc.title,
		slug: doc.slug,
		isFolder: isFolder(doc),
		parentId: doc.parent_document_id,
		status: doc.status,
		hasChildren,
		isExpanded: false,
		isLoading: false,
	};
}

/**
 * Helper: Build tree from flat list
 * Converts flat array of documents into hierarchical tree structure
 */
export function buildTree(documents: KnowledgeDocument[]): KnowledgeTreeNode[] {
	const nodeMap = new Map<number, KnowledgeTreeNode>();
	const rootNodes: KnowledgeTreeNode[] = [];

	// First pass: create all nodes
	documents.forEach((doc) => {
		const node = toTreeNode(doc);
		nodeMap.set(doc.id, node);
	});

	// Second pass: build hierarchy
	documents.forEach((doc) => {
		const node = nodeMap.get(doc.id);
		if (!node) return;

		if (doc.parent_document_id) {
			const parent = nodeMap.get(doc.parent_document_id);

			if (parent) {
				if (!parent.children) {
					parent.children = [];
				}

				parent.children.push(node);
				parent.hasChildren = true;
			}
		} else {
			rootNodes.push(node);
		}
	});

	return rootNodes;
}

/**
 * Helper: Sort nodes (folders first, then alphabetically)
 */
export function sortTreeNodes(nodes: KnowledgeTreeNode[]): KnowledgeTreeNode[] {
	return nodes.sort((a, b) => {
		// Folders first
		if (a.isFolder && !b.isFolder) return -1;
		if (!a.isFolder && b.isFolder) return 1;
		// Then alphabetically
		return a.title.localeCompare(b.title);
	});
}
