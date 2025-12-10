/**
 * Composable for managing knowledge_documents tree (E1-05 Folder Tree)
 * Provides data access layer for knowledge document tree operations
 */

import { readItems, readItem, updateItem, createItem } from '@directus/sdk';
import type {
	KnowledgeDocument,
	KnowledgeDocumentView,
	KnowledgeDocumentFilters,
	CreateFolderPayload,
	MoveNodePayload,
	KnowledgeTreeNode,
} from '~/types';
import { buildTree, sortTreeNodes, toTreeNode } from '~/types/knowledge-documents';

/**
 * Fetch root-level knowledge documents (no parent)
 */
export async function useKnowledgeTreeRoot() {
	const directusFilter: Record<string, any> = {
		parent_document_id: { _null: true },
	};

	return await useDirectus<KnowledgeDocument[]>(
		readItems('knowledge_documents', {
			fields: ['id', 'title', 'slug', 'status', 'is_folder', 'parent_document_id', 'date_created', 'date_updated'],
			filter: directusFilter,
			sort: ['title'],
			limit: 100,
		}),
	);
}

/**
 * Fetch children of a specific parent document
 */
export async function useKnowledgeChildren(parentId: number) {
	const directusFilter: Record<string, any> = {
		parent_document_id: { _eq: parentId },
	};

	return await useDirectus<KnowledgeDocument[]>(
		readItems('knowledge_documents', {
			fields: ['id', 'title', 'slug', 'status', 'is_folder', 'parent_document_id', 'date_created', 'date_updated'],
			filter: directusFilter,
			sort: ['title'],
			limit: 100,
		}),
	);
}

/**
 * Fetch all knowledge documents (for building full tree)
 * Use with caution - may be slow for large datasets
 */
export async function useKnowledgeDocumentsList(filters?: KnowledgeDocumentFilters) {
	const directusFilter: Record<string, any> = {};

	// Apply parent filter
	if (filters?.parent_document_id !== undefined) {
		if (filters.parent_document_id === null) {
			directusFilter.parent_document_id = { _null: true };
		} else {
			directusFilter.parent_document_id = { _eq: filters.parent_document_id };
		}
	}

	// Apply status filter
	if (filters?.status) {
		if (Array.isArray(filters.status)) {
			directusFilter.status = { _in: filters.status };
		} else {
			directusFilter.status = { _eq: filters.status };
		}
	}

	// Apply is_folder filter
	if (filters?.is_folder !== undefined) {
		directusFilter.is_folder = { _eq: filters.is_folder };
	}

	// Apply search filter
	if (filters?.search) {
		directusFilter._or = [{ title: { _contains: filters.search } }, { content: { _contains: filters.search } }];
	}

	return await useDirectus<KnowledgeDocument[]>(
		readItems('knowledge_documents', {
			fields: [
				'id',
				'title',
				'slug',
				'status',
				'is_folder',
				'content',
				'parent_document_id',
				'date_created',
				'date_updated',
			],
			filter: Object.keys(directusFilter).length > 0 ? directusFilter : undefined,
			sort: ['title'],
			limit: 500, // Increased for full tree
		}),
	);
}

/**
 * Fetch a single knowledge document by ID
 */
export async function useKnowledgeDocumentDetail(id: number) {
	return await useDirectus<KnowledgeDocumentView>(
		readItem('knowledge_documents', id, {
			fields: [
				'*',
				{
					parent_document: ['id', 'title', 'slug'],
					user_created: ['id', 'first_name', 'last_name', 'email'],
					user_updated: ['id', 'first_name', 'last_name', 'email'],
				},
			],
		}),
	);
}

/**
 * Create a new folder (knowledge document marked as folder)
 */
export async function createFolder(payload: CreateFolderPayload): Promise<KnowledgeDocument> {
	const data: Partial<KnowledgeDocument> = {
		title: payload.title,
		is_folder: true,
		status: 'published', // Folders are published by default
		parent_document_id: payload.parent_document_id || null,
	};

	return await useDirectus<KnowledgeDocument>(createItem('knowledge_documents', data));
}

/**
 * Move a document/folder to a new parent
 */
export async function moveNode(payload: MoveNodePayload): Promise<KnowledgeDocument> {
	const updates: Partial<KnowledgeDocument> = {
		parent_document_id: payload.parent_document_id || null,
	};

	return await useDirectus<KnowledgeDocument>(updateItem('knowledge_documents', payload.id, updates));
}

/**
 * Update knowledge document fields
 */
export async function updateKnowledgeDocument(
	id: number,
	updates: Partial<KnowledgeDocument>,
): Promise<KnowledgeDocument> {
	return await useDirectus<KnowledgeDocument>(updateItem('knowledge_documents', id, updates));
}

/**
 * Helper: Load tree with lazy loading support
 * Fetches root nodes and returns them as tree nodes with hasChildren flag
 */
export async function useKnowledgeTreeLazy(): Promise<KnowledgeTreeNode[]> {
	const rootDocs = await useKnowledgeTreeRoot();

	if (!rootDocs) return [];

	// Convert to tree nodes and check if each has children
	const treeNodes: KnowledgeTreeNode[] = [];

	for (const doc of rootDocs) {
		// Check if this document has children
		const children = await useDirectus<number>(
			readItems('knowledge_documents', {
				filter: { parent_document_id: { _eq: doc.id } },
				aggregate: { count: '*' },
			}) as any,
		);

		const hasChildren = typeof children === 'number' ? children > 0 : false;
		treeNodes.push(toTreeNode(doc, hasChildren));
	}

	return sortTreeNodes(treeNodes);
}

/**
 * Helper: Load children for a specific node (lazy loading)
 */
export async function loadNodeChildren(parentId: number): Promise<KnowledgeTreeNode[]> {
	const children = await useKnowledgeChildren(parentId);

	if (!children) return [];

	// Convert to tree nodes and check if each has children
	const treeNodes: KnowledgeTreeNode[] = [];

	for (const doc of children) {
		// Check if this document has children
		const grandchildren = await useDirectus<number>(
			readItems('knowledge_documents', {
				filter: { parent_document_id: { _eq: doc.id } },
				aggregate: { count: '*' },
			}) as any,
		);

		const hasChildren = typeof grandchildren === 'number' ? grandchildren > 0 : false;
		treeNodes.push(toTreeNode(doc, hasChildren));
	}

	return sortTreeNodes(treeNodes);
}

/**
 * Helper: Build full tree (not lazy - loads everything)
 * Use only for small datasets or when full tree is needed
 */
export async function useKnowledgeTreeFull(): Promise<KnowledgeTreeNode[]> {
	const allDocs = await useKnowledgeDocumentsList();

	if (!allDocs) return [];

	const tree = buildTree(allDocs);
	return sortTreeNodes(tree);
}
