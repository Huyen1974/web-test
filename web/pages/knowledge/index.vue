<script setup lang="ts">
/**
 * Knowledge Hub Index Page — WEB-56 + WEB-62
 *
 * ASSEMBLY ONLY - Reuses DocsTreeView, TypographyProse, buildDocsTree
 * Data source: Directus knowledge_documents collection (via SDK)
 */
import { readItems } from '@directus/sdk';
import type { DocsTreeNode } from '~/types/agent-views';
import { buildDocsTree, filterDocsByTitle } from '~/composables/useAgentViews';

definePageMeta({
	title: 'Knowledge Hub',
	description: 'Browse knowledge base and documentation',
});

// Readable folder labels extracted from README.md titles + fallback map
const FOLDER_LABELS: Record<string, string> = {
	foundation: 'Foundation',
	plans: 'Plans',
	operations: 'Operations',
	'context-packs': 'Context Packs',
	playbooks: 'Playbooks',
	status: 'Status',
	templates: 'Templates',
	discussions: 'Discussions',
	archive: 'Archive',
};

// Search state
const searchQuery = ref('');
// Mobile sidebar state
const sidebarOpen = ref(false);

// Document code generator (deterministic hash from document_id)
function docCode(docId: string): string {
	let hash = 0;
	for (let i = 0; i < docId.length; i++) {
		hash = ((hash << 5) - hash + docId.charCodeAt(i)) | 0;
	}
	return 'KB-' + Math.abs(hash).toString(16).slice(0, 4).toUpperCase().padStart(4, '0');
}

// Fetch from Directus knowledge_documents collection
const {
	data: documents,
	pending,
	error,
} = await useAsyncData('knowledge-directus', async () => {
	const items = await useDirectus(
		readItems('knowledge_documents', {
			filter: {
				status: { _eq: 'published' },
				is_current_version: { _eq: true },
			},
			fields: ['id', 'title', 'slug', 'file_path', 'source_id', 'tags', 'category', 'is_folder'],
			sort: ['title'],
			limit: -1,
		}),
	);

	const allItems = items || [];

	// Extract folder labels from README items before filtering
	const folderLabels: Record<string, string> = { ...FOLDER_LABELS };
	for (const item of allItems) {
		if (item.file_path?.endsWith('/README.md') && item.title && item.title !== 'check') {
			const parentPath = item.file_path.replace(/\/README\.md$/, '');
			const folderName = parentPath.split('/').pop();
			if (folderName) {
				folderLabels[folderName] = item.title;
			}
		}
	}

	// Filter to actual documents only
	const docs = allItems.filter((item: any) => {
		if (!item.file_path) return false;
		if (item.title === 'check') return false;
		if (item.file_path.endsWith('/README.md')) return false;
		if (item.is_folder) return false;
		const hasMd = item.file_path.endsWith('.md');
		const hasTags = item.tags && item.tags.length > 0;
		return hasMd || hasTags;
	});

	// Map to AgentView-like structure for buildDocsTree compatibility
	const mapped = docs.map((item: any) => ({
		id: item.file_path || item.slug,
		source_id: item.file_path || item.slug,
		title: item.title || item.file_path?.split('/').pop()?.replace(/\.md$/, '') || item.slug,
		path: item.file_path || item.slug,
		tags: item.tags,
	}));

	return { docs: mapped, folderLabels };
});

// Extract docs and folder labels from the response
const docsList = computed(() => documents.value?.docs || []);
const folderLabelsMap = computed(() => documents.value?.folderLabels || FOLDER_LABELS);

// Build tree with readable folder labels
const docsTree = computed(() => {
	if (!docsList.value.length) return [];
	const tree = buildDocsTree(docsList.value);
	applyFolderLabels(tree, folderLabelsMap.value);
	return tree;
});

function applyFolderLabels(nodes: DocsTreeNode[], labels: Record<string, string>) {
	for (const node of nodes) {
		if (node.isFolder) {
			const folderName = node.name.toLowerCase();
			if (labels[folderName]) {
				node.name = labels[folderName];
			} else if (labels[node.name]) {
				node.name = labels[node.name];
			} else {
				// Capitalize: "my-folder" → "My Folder"
				node.name = node.name
					.split('-')
					.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
					.join(' ');
			}
			applyFolderLabels(node.children, labels);
		}
	}
}

// Count total documents (leaf nodes only)
const totalDocs = computed(() => docsList.value.length);

// Search filtering
const filteredDocs = computed(() => {
	if (!docsList.value.length) return [];
	return filterDocsByTitle(docsList.value, searchQuery.value);
});

// Navigate to document detail page (clean SEO URL)
function selectDocument(node: DocsTreeNode) {
	if (node.isFolder) return;
	const docId = node.document?.source_id || node.path;
	navigateTo(`/knowledge/${cleanUrl(docId)}`);
}

// Navigate from search result
function selectSearchResult(doc: any) {
	navigateTo(`/knowledge/${cleanUrl(doc.source_id || '')}`);
}

// Clean URL: strip "docs/" or "knowledge/" prefix and ".md" suffix
function cleanUrl(docId: string): string {
	let clean = docId;
	if (clean.startsWith('docs/')) clean = clean.slice(5);
	if (clean.startsWith('knowledge/')) clean = clean.slice(10);
	clean = clean.replace(/\.md$/, '');
	return clean;
}

// SEO
useHead({ title: 'Knowledge Hub' });
useServerSeoMeta({
	title: 'Knowledge Hub',
	description: 'Browse knowledge base and documentation',
	ogTitle: 'Knowledge Hub',
	ogDescription: 'Browse knowledge base and documentation',
});
</script>

<template>
	<BlockContainer>
		<div class="py-8">
			<!-- Header -->
			<header class="pb-6 border-b border-gray-300 dark:border-gray-700">
				<TypographyTitle>Knowledge Hub</TypographyTitle>
				<p class="mt-2 text-gray-600 dark:text-gray-400">
					Browse knowledge base and documentation
				</p>

				<!-- Search Box -->
				<div class="mt-6 max-w-md">
					<div class="relative">
						<input
							v-model="searchQuery"
							type="text"
							placeholder="Search knowledge..."
							class="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600"
						/>
						<Icon
							name="heroicons:magnifying-glass"
							class="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
						/>
					</div>
				</div>
			</header>

			<!-- Mobile sidebar toggle -->
			<div class="lg:hidden mt-6">
				<button
					class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
					@click="sidebarOpen = !sidebarOpen"
				>
					<Icon :name="sidebarOpen ? 'heroicons:x-mark' : 'heroicons:bars-3'" class="w-5 h-5" />
					{{ sidebarOpen ? 'Close' : 'Browse Contents' }}
				</button>
			</div>

			<!-- Two-column layout -->
			<div class="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-8">
				<!-- Left sidebar: Tree Navigation -->
				<aside class="lg:col-span-1" :class="{ 'hidden lg:block': !sidebarOpen }">
					<div
						class="sticky top-4 max-h-[calc(100vh-8rem)] overflow-auto bg-white dark:bg-gray-900 lg:bg-transparent rounded-lg p-4 lg:p-0 border border-gray-200 dark:border-gray-700 lg:border-0"
					>
						<h2
							class="text-sm font-semibold text-gray-900 dark:text-white mb-4 uppercase tracking-wider"
						>
							Contents
						</h2>

						<!-- Loading State -->
						<div v-if="pending" class="text-center py-8">
							<div
								class="inline-block w-6 h-6 border-2 border-gray-300 rounded-full border-t-primary-600 animate-spin"
							></div>
						</div>

						<!-- Error State -->
						<div v-else-if="error" class="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
							<p class="text-sm text-red-600 dark:text-red-400">Failed to load documents</p>
						</div>

						<!-- Search Results -->
						<div v-else-if="searchQuery.trim()">
							<p class="text-xs text-gray-500 mb-3">{{ filteredDocs.length }} results</p>
							<ul class="space-y-1">
								<li v-for="doc in filteredDocs" :key="doc.id">
									<button
										class="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
										@click="selectSearchResult(doc)"
									>
										<span class="text-sm font-medium text-gray-900 dark:text-white">{{
											doc.title
										}}</span>
										<span class="block text-xs text-gray-500 truncate">{{
											docCode(doc.source_id)
										}}</span>
									</button>
								</li>
							</ul>
						</div>

						<!-- Tree View (reusing DocsTreeView component) -->
						<DocsTreeView v-else :nodes="docsTree" @select="selectDocument" />
					</div>
				</aside>

				<!-- Main content area -->
				<main class="lg:col-span-3">
					<!-- Welcome state (no document selected - index page) -->
					<div class="text-center py-16">
						<Icon name="heroicons:book-open" class="w-16 h-16 mx-auto text-gray-400" />
						<h3 class="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
							Knowledge Hub
						</h3>
						<p class="mt-2 text-gray-600 dark:text-gray-400">
							Select a document from the navigation to view its content
						</p>

						<!-- Quick Stats -->
						<div v-if="docsList.length" class="mt-8 grid grid-cols-2 gap-4 max-w-xs mx-auto">
							<div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
								<p class="text-2xl font-bold text-primary-600">{{ totalDocs }}</p>
								<p class="text-sm text-gray-600 dark:text-gray-400">Documents</p>
							</div>
							<div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
								<p class="text-2xl font-bold text-primary-600">{{ docsTree.length }}</p>
								<p class="text-sm text-gray-600 dark:text-gray-400">Sections</p>
							</div>
						</div>
					</div>
				</main>
			</div>
		</div>
	</BlockContainer>
</template>
