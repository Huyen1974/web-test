import { readItems } from '@directus/sdk';
import type { AgentView, DocsTreeNode, DocsBreadcrumb } from '~/types/agent-views';

/**
 * Build tree structure from flat list of documents based on path field.
 *
 * Example paths:
 * - "docs/README.md" → root file
 * - "docs/architecture/BUSINESS_OS.md" → nested in architecture folder
 * - "docs/plans/Q2/roadmap.md" → nested in plans/Q2 folder
 */
export function buildDocsTree(documents: AgentView[]): DocsTreeNode[] {
	const root: DocsTreeNode[] = [];
	const folderMap = new Map<string, DocsTreeNode>();

	// Sort documents by path for consistent ordering
	const sortedDocs = [...documents].sort((a, b) => (a.path || '').localeCompare(b.path || ''));

	for (const doc of sortedDocs) {
		const path = doc.path || doc.source_id || '';
		// Remove "docs/" prefix if present
		const relativePath = path.startsWith('docs/') ? path.slice(5) : path;
		const parts = relativePath.split('/');

		// Build folder hierarchy
		let currentPath = '';
		let parentChildren = root;

		for (let i = 0; i < parts.length - 1; i++) {
			const folderName = parts[i];
			currentPath = currentPath ? `${currentPath}/${folderName}` : folderName;

			if (!folderMap.has(currentPath)) {
				const folderNode: DocsTreeNode = {
					id: `folder:${currentPath}`,
					name: folderName,
					path: currentPath,
					isFolder: true,
					children: [],
				};
				folderMap.set(currentPath, folderNode);
				parentChildren.push(folderNode);
			}

			parentChildren = folderMap.get(currentPath)!.children;
		}

		// Add document to the appropriate parent
		const fileName = parts[parts.length - 1];
		const docNode: DocsTreeNode = {
			id: `doc:${doc.id}`,
			name: fileName.replace(/\.md$/, ''),
			path: relativePath,
			isFolder: false,
			children: [],
			document: doc,
		};
		parentChildren.push(docNode);
	}

	// Sort children: folders first, then files, alphabetically
	const sortChildren = (nodes: DocsTreeNode[]) => {
		nodes.sort((a, b) => {
			if (a.isFolder && !b.isFolder) return -1;
			if (!a.isFolder && b.isFolder) return 1;
			return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
		});
		for (const node of nodes) {
			if (node.children.length > 0) {
				sortChildren(node.children);
			}
		}
	};

	sortChildren(root);
	return root;
}

/**
 * Generate breadcrumb from path
 */
export function buildBreadcrumbs(path: string): DocsBreadcrumb[] {
	const breadcrumbs: DocsBreadcrumb[] = [{ name: 'Docs', path: '' }];

	if (!path) return breadcrumbs;

	const parts = path.split('/');
	let currentPath = '';

	for (const part of parts) {
		currentPath = currentPath ? `${currentPath}/${part}` : part;
		breadcrumbs.push({
			name: part.replace(/\.md$/, ''),
			path: currentPath,
		});
	}

	return breadcrumbs;
}

/**
 * Find a document by source_id (relative path)
 */
export function findDocBySourceId(documents: AgentView[], sourceId: string): AgentView | undefined {
	return documents.find((doc) => doc.source_id === sourceId);
}

/**
 * Find a document by slug (URL path without /docs/ prefix)
 */
export function findDocBySlug(documents: AgentView[], slug: string): AgentView | undefined {
	// Try exact match on source_id first
	const exactMatch = documents.find((doc) => {
		const docSlug = (doc.source_id || '').replace(/\.md$/, '').toLowerCase();
		return docSlug === slug.toLowerCase();
	});

	if (exactMatch) return exactMatch;

	// Try permalink match
	return documents.find((doc) => {
		const permalink = (doc.permalink || '').replace('/docs/', '').toLowerCase();
		return permalink === slug.toLowerCase();
	});
}

/**
 * Fetch all agent_views documents
 */
export async function useAgentViewsList(): Promise<AgentView[]> {
	try {
		const items = await useDirectus(
			readItems('agent_views', {
				filter: {
					status: { _eq: 'published' },
				},
				sort: ['path'],
				limit: -1,
				fields: ['id', 'source_id', 'title', 'content', 'summary', 'permalink', 'path', 'sha', 'doc_type', 'last_synced', 'status', 'tags'],
			}),
		);
		return (items || []) as AgentView[];
	} catch (error) {
		console.error('Failed to fetch agent_views:', error);
		return [];
	}
}

/**
 * Fetch single document by ID
 */
export async function useAgentViewDetail(id: number): Promise<AgentView | null> {
	try {
		const items = await useDirectus(
			readItems('agent_views', {
				filter: {
					id: { _eq: id },
				},
				limit: 1,
				fields: ['*'],
			}),
		);
		return items?.[0] || null;
	} catch (error) {
		console.error('Failed to fetch agent_view detail:', error);
		return null;
	}
}

/**
 * Filter documents by title search
 */
export function filterDocsByTitle(documents: AgentView[], query: string): AgentView[] {
	if (!query.trim()) return documents;

	const lowerQuery = query.toLowerCase();
	return documents.filter((doc) => doc.title?.toLowerCase().includes(lowerQuery) || doc.summary?.toLowerCase().includes(lowerQuery));
}
