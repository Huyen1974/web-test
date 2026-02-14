<script setup lang="ts">
/**
 * Knowledge Document Detail Page — WEB-56 + WEB-56B + WEB-62
 *
 * ASSEMBLY ONLY - Reuses TypographyProse, BlockContainer, TypographyTitle,
 * DocsTreeView, buildDocsTree (sidebar same as index.vue)
 * Data source: Directus knowledge_documents collection (via SDK)
 * Standard features: Share, Print, TOC, Embed (all inline, no new components)
 */
import { readItems } from '@directus/sdk';
import type { BreadcrumbItem } from '~/types/view-model-0032';
import type { DocsTreeNode } from '~/types/agent-views';
import { buildDocsTree, filterDocsByTitle } from '~/composables/useAgentViews';
import { markdownToHtml } from '~/utils/markdown';

const route = useRoute();
const toast = useToast();

// Readable folder labels
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

// Mobile sidebar state
const sidebarOpen = ref(false);

// Search state
const searchQuery = ref('');

// Fetch doc list for sidebar tree (same query as index.vue)
const { data: sidebarData } = await useAsyncData('knowledge-directus', async () => {
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

	// Extract folder labels from README items
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

	const mapped = docs.map((item: any) => ({
		id: item.file_path || item.slug,
		source_id: item.file_path || item.slug,
		title: item.title || item.file_path?.split('/').pop()?.replace(/\.md$/, '') || item.slug,
		path: item.file_path || item.slug,
		tags: item.tags,
	}));

	return { docs: mapped, folderLabels };
});

const sidebarDocs = computed(() => sidebarData.value?.docs || []);
const folderLabelsMap = computed(() => sidebarData.value?.folderLabels || FOLDER_LABELS);

// Build tree with readable folder labels
const docsTree = computed(() => {
	if (!sidebarDocs.value.length) return [];
	const tree = buildDocsTree(sidebarDocs.value);
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
				node.name = node.name
					.split('-')
					.map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
					.join(' ');
			}
			applyFolderLabels(node.children, labels);
		}
	}
}

// Search filtering
const filteredDocs = computed(() => {
	if (!sidebarDocs.value.length) return [];
	return filterDocsByTitle(sidebarDocs.value, searchQuery.value);
});

// Clean URL helper: strip "docs/" or "knowledge/" prefix and ".md" suffix
function cleanUrl(docId: string): string {
	let clean = docId;
	if (clean.startsWith('docs/')) clean = clean.slice(5);
	if (clean.startsWith('knowledge/')) clean = clean.slice(10);
	clean = clean.replace(/\.md$/, '');
	return clean;
}

// Navigate to another document from sidebar
function selectSidebarDoc(node: DocsTreeNode) {
	if (node.isFolder) return;
	const docId = node.document?.source_id || node.path;
	sidebarOpen.value = false;
	navigateTo(`/knowledge/${cleanUrl(docId)}`);
}

// Navigate from search result
function selectSearchResult(doc: any) {
	sidebarOpen.value = false;
	navigateTo(`/knowledge/${cleanUrl(doc.source_id || '')}`);
}

// Parse slug path
const slugParts = computed(() => {
	const slug = route.params.slug;
	if (Array.isArray(slug)) return slug;
	if (typeof slug === 'string') return slug.split('/').filter(Boolean);
	return [];
});

const fullSlug = computed(() => slugParts.value.join('/'));

// Document code generator
function docCode(docId: string): string {
	let hash = 0;
	for (let i = 0; i < docId.length; i++) {
		hash = ((hash << 5) - hash + docId.charCodeAt(i)) | 0;
	}
	return 'KB-' + Math.abs(hash).toString(16).slice(0, 4).toUpperCase().padStart(4, '0');
}

// Fetch document from Directus knowledge_documents
const {
	data: document,
	pending,
	error,
} = await useAsyncData(`knowledge-${fullSlug.value}`, async () => {
	try {
		// Try multiple file_path variants to match Directus records
		// Records may use docs/ prefix (old), knowledge/ prefix (new), or bare path
		const variants = [
			`docs/${fullSlug.value}.md`,
			`docs/${fullSlug.value}`,
			`knowledge/${fullSlug.value}.md`,
			`knowledge/${fullSlug.value}`,
			`${fullSlug.value}.md`,
			fullSlug.value,
		];

		for (const fp of variants) {
			const items = await useDirectus(
				readItems('knowledge_documents', {
					filter: {
						file_path: { _eq: fp },
						status: { _eq: 'published' },
						is_current_version: { _eq: true },
					},
					limit: 1,
					fields: ['*'],
				}),
			);

			if (items?.length) {
				const doc = items[0] as any;
				return {
					id: doc.file_path || doc.slug,
					title: doc.title || doc.file_path?.split('/').pop()?.replace(/\.md$/, '') || fullSlug.value,
					content: doc.content,
					tags: doc.tags || [],
					revision: doc.version_number || 1,
					readTime: Math.ceil((doc.content?.length || 0) / 1000),
				};
			}
		}

		// Fallback: try matching by slug
		const slugVariant = fullSlug.value.replace(/\//g, '-');
		const bySlug = await useDirectus(
			readItems('knowledge_documents', {
				filter: {
					slug: { _eq: slugVariant },
					status: { _eq: 'published' },
					is_current_version: { _eq: true },
				},
				limit: 1,
				fields: ['*'],
			}),
		);

		if (bySlug?.length) {
			const doc = bySlug[0] as any;
			return {
				id: doc.file_path || doc.slug,
				title: doc.title || fullSlug.value,
				content: doc.content,
				tags: doc.tags || [],
				revision: doc.version_number || 1,
				readTime: Math.ceil((doc.content?.length || 0) / 1000),
			};
		}

		return null;
	} catch {
		return null;
	}
});

// Rendered markdown content with heading IDs for TOC anchoring
const renderedContent = computed(() => {
	if (!document.value?.content) return '';
	let html = markdownToHtml(document.value.content);
	// Add id attributes to headings for TOC anchor links
	html = html.replace(/<(h[1-4])>(.*?)<\/h[1-4]>/g, (_match, tag, text) => {
		const id = text.replace(/<[^>]*>/g, '').trim().toLowerCase()
			.replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
		return `<${tag} id="${id}">${text}</${tag}>`;
	});
	return html;
});

// Table of Contents — extract headings from raw markdown
const tableOfContents = computed(() => {
	if (!document.value?.content) return [];
	const headingRegex = /^(#{1,4})\s+(.+)$/gm;
	const headings: { level: number; text: string; id: string }[] = [];
	let match;
	while ((match = headingRegex.exec(document.value.content)) !== null) {
		const text = match[2].replace(/[*_`\[\]]/g, '').trim();
		const id = text.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
		headings.push({ level: match[1].length, text, id });
	}
	return headings;
});

// TOC visibility toggle
const showToc = ref(false);

// Share — Web Share API with clipboard fallback
async function shareDocument() {
	const url = window.location.href;
	const title = document.value?.title || 'Knowledge Document';

	if (navigator.share) {
		try {
			await navigator.share({ title, url });
			return;
		} catch {
			// User cancelled or API failed — fall through to clipboard
		}
	}

	// Fallback: copy URL to clipboard
	try {
		await navigator.clipboard.writeText(url);
		toast.add({
			title: 'Link Copied',
			description: 'Document URL has been copied to your clipboard.',
			icon: 'material-symbols:content-copy-outline',
			color: 'green',
			timeout: 3000,
		});
	} catch {
		toast.add({
			title: 'Copy Failed',
			description: 'Could not copy the link. Please copy it from the address bar.',
			icon: 'heroicons:exclamation-triangle',
			color: 'red',
			timeout: 3000,
		});
	}
}

// Print — native browser print
function printDocument() {
	window.print();
}

// Embed — generate iframe code and copy
const showEmbed = ref(false);
const embedCode = computed(() => {
	if (!import.meta.client) return '';
	return `<iframe src="${window.location.href}" width="100%" height="600" frameborder="0" title="${document.value?.title || 'Knowledge Document'}"></iframe>`;
});

async function copyEmbedCode() {
	try {
		await navigator.clipboard.writeText(embedCode.value);
		toast.add({
			title: 'Embed Code Copied',
			description: 'The embed code has been copied to your clipboard.',
			icon: 'material-symbols:content-copy-outline',
			color: 'green',
			timeout: 3000,
		});
	} catch {
		toast.add({
			title: 'Copy Failed',
			description: 'Could not copy the embed code.',
			icon: 'heroicons:exclamation-triangle',
			color: 'red',
			timeout: 3000,
		});
	}
}

// Build SEO-friendly breadcrumb from slug path
const breadcrumb = computed<BreadcrumbItem[]>(() => {
	const parts = slugParts.value;
	const items: BreadcrumbItem[] = [{ label: 'Knowledge', slug: '/knowledge', type: 'zone' }];

	let currentPath = '/knowledge';
	for (let i = 0; i < parts.length; i++) {
		const part = parts[i];
		const isLast = i === parts.length - 1;
		currentPath += `/${part}`;

		// Format label
		let label: string;
		if (isLast && document.value?.title) {
			label = document.value.title;
		} else if (FOLDER_LABELS[part]) {
			label = FOLDER_LABELS[part];
		} else {
			label = part
				.split('-')
				.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
				.join(' ');
		}

		items.push({
			label,
			slug: isLast ? '' : currentPath,
			type: isLast ? 'document' : i === 0 ? 'zone' : 'subzone',
		});
	}

	return items;
});

// SEO
useHead({
	title: () => document.value?.title || 'Knowledge Document',
});

useServerSeoMeta({
	title: () => document.value?.title || 'Knowledge Document',
	description: () => `Knowledge base document - ${document.value?.title || fullSlug.value}`,
	ogTitle: () => document.value?.title || 'Knowledge Document',
	ogDescription: () => `Knowledge base document - ${document.value?.title || fullSlug.value}`,
});
</script>

<template>
	<BlockContainer>
		<div class="py-8">
			<!-- Mobile sidebar toggle -->
			<div class="lg:hidden mb-6">
				<button
					class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
					@click="sidebarOpen = !sidebarOpen"
				>
					<Icon :name="sidebarOpen ? 'heroicons:x-mark' : 'heroicons:bars-3'" class="w-5 h-5" />
					{{ sidebarOpen ? 'Close' : 'Browse Contents' }}
				</button>
			</div>

			<!-- Two-column layout (same grid as index.vue) -->
			<div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
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

						<!-- Search Box -->
						<div class="mb-4">
							<div class="relative">
								<input
									v-model="searchQuery"
									type="text"
									placeholder="Search..."
									class="w-full px-3 py-1.5 pr-8 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600"
								/>
								<Icon
									name="heroicons:magnifying-glass"
									class="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
								/>
							</div>
						</div>

						<!-- Search Results -->
						<div v-if="searchQuery.trim()">
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

						<!-- Tree View -->
						<DocsTreeView v-else :nodes="docsTree" @select="selectSidebarDoc" />
					</div>
				</aside>

				<!-- Main content area -->
				<main class="lg:col-span-3">
			<!-- Loading State -->
			<div v-if="pending" class="flex items-center justify-center py-12">
				<div class="text-center">
					<div
						class="inline-block w-8 h-8 border-4 border-gray-300 rounded-full border-t-primary-600 animate-spin"
					></div>
					<p class="mt-4 text-gray-600 dark:text-gray-400">Loading document...</p>
				</div>
			</div>

			<!-- Error State -->
			<div v-else-if="error || !document" class="py-12">
				<div class="p-6 text-center border border-red-200 rounded-lg bg-red-50 dark:bg-red-900/20">
					<Icon name="heroicons:exclamation-triangle" class="w-12 h-12 mx-auto text-red-600" />
					<h3 class="mt-4 text-lg font-semibold text-red-900 dark:text-red-200">Document not found</h3>
					<p class="mt-2 text-red-700 dark:text-red-300">
						The requested document could not be found or is not available.
					</p>
					<NuxtLink
						to="/knowledge"
						class="inline-block px-4 py-2 mt-4 text-sm font-medium text-white rounded-lg bg-primary-600 hover:bg-primary-700"
					>
						Back to Knowledge Hub
					</NuxtLink>
				</div>
			</div>

			<!-- Document View -->
			<article v-else>
				<!-- Breadcrumb -->
				<nav class="mb-6" aria-label="Breadcrumb">
					<ol class="flex flex-wrap items-center gap-2 text-sm">
						<li v-for="(item, index) in breadcrumb" :key="index" class="flex items-center gap-2">
							<NuxtLink
								v-if="item.slug && index < breadcrumb.length - 1"
								:to="item.slug"
								class="text-primary-600 hover:text-primary-700"
							>
								{{ item.label }}
							</NuxtLink>
							<span v-else class="text-gray-600 dark:text-gray-400">{{ item.label }}</span>
							<Icon
								v-if="index < breadcrumb.length - 1"
								name="heroicons:chevron-right"
								class="w-4 h-4 text-gray-400"
							/>
						</li>
					</ol>
				</nav>

				<!-- Header -->
				<header class="pb-6 mb-6 border-b border-gray-300 dark:border-gray-700">
					<!-- Document Code Badge -->
					<div class="flex items-center gap-2 mb-3">
						<span
							class="px-2 py-0.5 text-xs font-mono font-semibold rounded bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
						>
							{{ docCode(document.id) }}
						</span>
						<span
							v-if="document.revision > 1"
							class="px-2 py-0.5 text-xs font-semibold rounded bg-blue-100 text-blue-800"
						>
							rev {{ document.revision }}
						</span>
					</div>

					<!-- Title -->
					<TypographyTitle>{{ document.title }}</TypographyTitle>

					<!-- Meta -->
					<div class="flex flex-wrap items-center gap-4 mt-4 text-sm text-gray-500 dark:text-gray-500">
						<span v-if="document.readTime" class="flex items-center gap-1">
							<Icon name="heroicons:clock" class="w-4 h-4" />
							{{ document.readTime }} min read
						</span>
						<span v-if="document.revision" class="flex items-center gap-1">
							<Icon name="heroicons:document-duplicate" class="w-4 h-4" />
							Revision {{ document.revision }}
						</span>
					</div>

					<!-- Tags -->
					<div v-if="document.tags && document.tags.length > 0" class="flex flex-wrap gap-2 mt-4">
						<span
							v-for="tag in document.tags"
							:key="tag"
							class="px-3 py-1 text-sm rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
						>
							{{ tag }}
						</span>
					</div>

					<!-- Toolbar: Share, Print, TOC, Embed -->
					<div class="flex flex-wrap items-center gap-2 mt-4 print:hidden">
						<button
							class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg text-gray-600 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
							@click="shareDocument"
						>
							<Icon name="heroicons:share" class="w-4 h-4" />
							Share
						</button>
						<button
							class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg text-gray-600 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
							@click="printDocument"
						>
							<Icon name="heroicons:printer" class="w-4 h-4" />
							Print
						</button>
						<button
							v-if="tableOfContents.length > 0"
							class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors"
							:class="showToc
								? 'text-primary-700 bg-primary-100 dark:text-primary-300 dark:bg-primary-900/30'
								: 'text-gray-600 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600'"
							@click="showToc = !showToc"
						>
							<Icon name="heroicons:list-bullet" class="w-4 h-4" />
							Contents
						</button>
						<button
							class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors"
							:class="showEmbed
								? 'text-primary-700 bg-primary-100 dark:text-primary-300 dark:bg-primary-900/30'
								: 'text-gray-600 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600'"
							@click="showEmbed = !showEmbed"
						>
							<Icon name="heroicons:code-bracket" class="w-4 h-4" />
							Embed
						</button>
					</div>

					<!-- Embed Code Panel -->
					<div
						v-if="showEmbed"
						class="mt-3 p-3 rounded-lg bg-gray-50 border border-gray-200 dark:bg-gray-800 dark:border-gray-700 print:hidden"
					>
						<div class="flex items-center justify-between mb-2">
							<span class="text-xs font-medium text-gray-500 dark:text-gray-400">Embed Code</span>
							<button
								class="text-xs text-primary-600 hover:text-primary-700 font-medium"
								@click="copyEmbedCode"
							>
								Copy
							</button>
						</div>
						<textarea
							readonly
							:value="embedCode"
							class="w-full h-16 p-2 text-xs font-mono bg-white border border-gray-300 rounded dark:bg-gray-900 dark:border-gray-600 dark:text-gray-300 resize-none"
							@focus="($event.target as HTMLTextAreaElement).select()"
						/>
					</div>
				</header>

				<!-- Table of Contents -->
				<nav
					v-if="showToc && tableOfContents.length > 0"
					class="mb-6 p-4 rounded-lg bg-gray-50 border border-gray-200 dark:bg-gray-800 dark:border-gray-700 print:hidden"
					aria-label="Table of Contents"
				>
					<h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Table of Contents</h3>
					<ul class="space-y-1.5">
						<li
							v-for="heading in tableOfContents"
							:key="heading.id"
							:style="{ paddingLeft: `${(heading.level - 1) * 16}px` }"
						>
							<a
								:href="`#${heading.id}`"
								class="text-sm text-gray-600 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 transition-colors"
							>
								{{ heading.text }}
							</a>
						</li>
					</ul>
				</nav>

				<!-- Document Content -->
				<div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 lg:p-10">
					<TypographyProse :content="renderedContent" size="md" />
				</div>

				<!-- Footer -->
				<footer class="pt-6 mt-8 border-t border-gray-300 dark:border-gray-700">
					<div class="flex items-center justify-between flex-wrap gap-4">
						<NuxtLink
							to="/knowledge"
							class="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700"
						>
							<Icon name="heroicons:arrow-left" class="w-4 h-4" />
							Back to Knowledge Hub
						</NuxtLink>
						<span class="text-xs text-gray-400 font-mono">
							{{ document.id }}
						</span>
					</div>
				</footer>
			</article>
				</main>
			</div>
		</div>
	</BlockContainer>
</template>

<style scoped>
@media print {
	:deep(header nav),
	:deep(footer),
	:deep(.print\\:hidden) {
		display: none !important;
	}
}
</style>
