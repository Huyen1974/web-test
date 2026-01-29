<script setup lang="ts">
import type { AgentView, DocsTreeNode, DocsBreadcrumb } from '~/types/agent-views';
import {
	useAgentViewsList,
	buildDocsTree,
	buildBreadcrumbs,
	filterDocsByTitle,
	findDocBySlug,
} from '~/composables/useAgentViews';
import { markdownToHtml } from '~/utils/markdown';

definePageMeta({
	title: 'Documentation',
	description: 'Browse documentation and guides',
});

const route = useRoute();
const router = useRouter();

// Search state
const searchQuery = ref('');

// Mobile sidebar state
const sidebarOpen = ref(false);

// Selected document state
const selectedDoc = ref<AgentView | null>(null);
const selectedPath = ref('');

// Fetch all documents
const { data: documents, pending, error } = await useAsyncData('docs-list', () => useAgentViewsList());

// Build tree from documents
const docsTree = computed(() => {
	if (!documents.value) return [];
	return buildDocsTree(documents.value);
});

// Filter documents for search
const filteredDocs = computed(() => {
	if (!documents.value) return [];
	return filterDocsByTitle(documents.value, searchQuery.value);
});

// Breadcrumbs for selected document
const breadcrumbs = computed(() => {
	return buildBreadcrumbs(selectedPath.value);
});

// Handle document selection from tree
function selectDocument(node: DocsTreeNode) {
	if (node.isFolder) {
		// Toggle folder expansion handled by tree component
		return;
	}

	if (node.document) {
		selectedDoc.value = node.document;
		selectedPath.value = node.path;
		// Close mobile sidebar
		sidebarOpen.value = false;
		// Update URL without navigation
		router.replace({ query: { doc: node.document.source_id } });
	}
}

// Handle breadcrumb click
function navigateBreadcrumb(crumb: DocsBreadcrumb) {
	if (!crumb.path) {
		// Root - clear selection
		selectedDoc.value = null;
		selectedPath.value = '';
		router.replace({ query: {} });
	}
}

// Rendered markdown content
const renderedContent = computed(() => {
	if (!selectedDoc.value?.content) return '';
	return markdownToHtml(selectedDoc.value.content);
});

// Initialize from URL query
onMounted(() => {
	const docQuery = route.query.doc as string;
	if (docQuery && documents.value) {
		const doc = findDocBySlug(documents.value, docQuery);
		if (doc) {
			selectedDoc.value = doc;
			selectedPath.value = doc.source_id || '';
		}
	}
});

// Watch for query changes
watch(
	() => route.query.doc,
	(newDoc) => {
		if (newDoc && documents.value) {
			const doc = findDocBySlug(documents.value, newDoc as string);
			if (doc) {
				selectedDoc.value = doc;
				selectedPath.value = doc.source_id || '';
			}
		}
	},
);

// SEO
useHead({
	title: computed(() => selectedDoc.value?.title || 'Documentation'),
});

useServerSeoMeta({
	title: 'Documentation',
	description: 'Browse documentation and guides',
	ogTitle: 'Documentation',
	ogDescription: 'Browse documentation and guides',
});
</script>

<template>
	<BlockContainer>
		<div class="py-8">
			<!-- Header -->
			<header class="pb-6 border-b border-gray-300 dark:border-gray-700">
				<TypographyTitle>Documentation</TypographyTitle>
				<p class="mt-2 text-gray-600 dark:text-gray-400">
					Browse documentation synced from GitHub
				</p>

				<!-- Search Box -->
				<div class="mt-6 max-w-md">
					<div class="relative">
						<input
							v-model="searchQuery"
							type="text"
							placeholder="Search docs..."
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
				<aside
					class="lg:col-span-1"
					:class="{ 'hidden lg:block': !sidebarOpen }"
				>
					<div class="sticky top-4 max-h-[calc(100vh-8rem)] overflow-auto bg-white dark:bg-gray-900 lg:bg-transparent rounded-lg p-4 lg:p-0 border border-gray-200 dark:border-gray-700 lg:border-0">
						<h2 class="text-sm font-semibold text-gray-900 dark:text-white mb-4 uppercase tracking-wider">
							Contents
						</h2>

						<!-- Loading State -->
						<div v-if="pending" class="text-center py-8">
							<div class="inline-block w-6 h-6 border-2 border-gray-300 rounded-full border-t-primary-600 animate-spin"></div>
						</div>

						<!-- Error State -->
						<div v-else-if="error" class="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
							<p class="text-sm text-red-600 dark:text-red-400">Failed to load docs</p>
						</div>

						<!-- Search Results -->
						<div v-else-if="searchQuery.trim()">
							<p class="text-xs text-gray-500 mb-3">{{ filteredDocs.length }} results</p>
							<ul class="space-y-1">
								<li v-for="doc in filteredDocs" :key="doc.id">
									<button
										class="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
										:class="{ 'bg-primary-100 dark:bg-primary-900/30': selectedDoc?.id === doc.id }"
										@click="selectedDoc = doc; selectedPath = doc.source_id || ''"
									>
										<span class="text-sm font-medium text-gray-900 dark:text-white">{{ doc.title }}</span>
										<span class="block text-xs text-gray-500 truncate">{{ doc.source_id }}</span>
									</button>
								</li>
							</ul>
						</div>

						<!-- Tree View -->
						<DocsTreeView
							v-else
							:nodes="docsTree"
							:selected-path="selectedPath"
							@select="selectDocument"
						/>
					</div>
				</aside>

				<!-- Main content area -->
				<main class="lg:col-span-3">
					<!-- No selection state -->
					<div v-if="!selectedDoc" class="text-center py-16">
						<Icon name="heroicons:document-text" class="w-16 h-16 mx-auto text-gray-400" />
						<h3 class="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
							Select a document
						</h3>
						<p class="mt-2 text-gray-600 dark:text-gray-400">
							Choose a document from the navigation to view its content
						</p>

						<!-- Quick Stats -->
						<div v-if="documents" class="mt-8 grid grid-cols-2 gap-4 max-w-xs mx-auto">
							<div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
								<p class="text-2xl font-bold text-primary-600">{{ documents.length }}</p>
								<p class="text-sm text-gray-600 dark:text-gray-400">Documents</p>
							</div>
							<div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
								<p class="text-2xl font-bold text-primary-600">{{ docsTree.length }}</p>
								<p class="text-sm text-gray-600 dark:text-gray-400">Sections</p>
							</div>
						</div>
					</div>

					<!-- Document view -->
					<div v-else>
						<!-- Breadcrumbs -->
						<nav class="mb-6">
							<ol class="flex items-center space-x-2 text-sm">
								<li v-for="(crumb, index) in breadcrumbs" :key="crumb.path">
									<div class="flex items-center">
										<span v-if="index > 0" class="mx-2 text-gray-400">/</span>
										<button
											v-if="index < breadcrumbs.length - 1"
											class="text-primary-600 hover:text-primary-800 dark:text-primary-400"
											@click="navigateBreadcrumb(crumb)"
										>
											{{ crumb.name }}
										</button>
										<span v-else class="text-gray-600 dark:text-gray-400">
											{{ crumb.name }}
										</span>
									</div>
								</li>
							</ol>
						</nav>

						<!-- Document Header -->
						<header class="mb-8">
							<h1 class="text-3xl font-bold text-gray-900 dark:text-white">
								{{ selectedDoc.title }}
							</h1>
							<div class="mt-2 flex items-center gap-4 text-sm text-gray-500">
								<span v-if="selectedDoc.last_synced">
									Last synced: {{ new Date(selectedDoc.last_synced).toLocaleDateString() }}
								</span>
								<span v-if="selectedDoc.sha" class="font-mono text-xs">
									{{ selectedDoc.sha.slice(0, 7) }}
								</span>
							</div>
						</header>

						<!-- Document Content -->
						<article class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 lg:p-8">
							<TypographyProse :content="renderedContent" size="md" />
						</article>

						<!-- Document Footer -->
						<footer class="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
							<div class="flex items-center justify-between text-sm text-gray-500">
								<span>Source: {{ selectedDoc.source_id }}</span>
								<a
									v-if="selectedDoc.path"
									:href="`https://github.com/Huyen1974/web-test/blob/main/${selectedDoc.path}`"
									target="_blank"
									rel="noopener noreferrer"
									class="flex items-center gap-1 text-primary-600 hover:text-primary-800"
								>
									<Icon name="heroicons:arrow-top-right-on-square" class="w-4 h-4" />
									View on GitHub
								</a>
							</div>
						</footer>
					</div>
				</main>
			</div>
		</div>
	</BlockContainer>
</template>
