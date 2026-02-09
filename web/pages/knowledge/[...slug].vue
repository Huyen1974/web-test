<script setup lang="ts">
/**
 * Knowledge Document Detail Page — WEB-56
 *
 * ASSEMBLY ONLY - Reuses TypographyProse, BlockContainer, TypographyTitle
 * Data source: Agent Data /kb/get via server proxy /api/knowledge/{slug}
 */
import type { BreadcrumbItem } from '~/types/view-model-0032';
import { markdownToHtml } from '~/utils/markdown';

const route = useRoute();

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

// Fetch document from Agent Data via server proxy
const {
	data: document,
	pending,
	error,
} = await useAsyncData(`knowledge-${fullSlug.value}`, async () => {
	try {
		const data = await $fetch<{
			document_id: string;
			content: string;
			metadata: { title?: string; tags?: string[] };
			revision: number;
		}>(`/api/knowledge/${fullSlug.value}`);

		return {
			id: data.document_id,
			title: data.metadata?.title || data.document_id.split('/').pop()?.replace(/\.md$/, '') || fullSlug.value,
			content: data.content,
			tags: data.metadata?.tags || [],
			revision: data.revision,
			readTime: Math.ceil((data.content?.length || 0) / 1000),
		};
	} catch {
		return null;
	}
});

// Rendered markdown content
const renderedContent = computed(() => {
	if (!document.value?.content) return '';
	return markdownToHtml(document.value.content);
});

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
			<article v-else class="max-w-4xl mx-auto">
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
				</header>

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
		</div>
	</BlockContainer>
</template>
