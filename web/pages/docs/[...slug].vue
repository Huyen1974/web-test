<script setup lang="ts">
import type { AgentView, DocsBreadcrumb } from '~/types/agent-views';
import { useAgentViewsList, buildBreadcrumbs, findDocBySlug } from '~/composables/useAgentViews';
import { markdownToHtml } from '~/utils/markdown';

const route = useRoute();
const router = useRouter();

// Get slug from route params
const slug = computed(() => {
	const params = route.params.slug;
	if (Array.isArray(params)) {
		return params.join('/');
	}
	return params || '';
});

// Fetch all documents and find the matching one
const { data: documents, pending, error } = await useAsyncData('docs-all', () => useAgentViewsList());

// Find the document matching the slug
const document = computed<AgentView | null>(() => {
	if (!documents.value || !slug.value) return null;
	return findDocBySlug(documents.value, slug.value) || null;
});

// Breadcrumbs for navigation
const breadcrumbs = computed<DocsBreadcrumb[]>(() => {
	if (!document.value?.source_id) return [{ name: 'Docs', path: '' }];
	return buildBreadcrumbs(document.value.source_id);
});

// Rendered markdown content
const renderedContent = computed(() => {
	if (!document.value?.content) return '';
	return markdownToHtml(document.value.content);
});

// 404 handling
if (!pending.value && !document.value && slug.value) {
	throw createError({
		statusCode: 404,
		statusMessage: `Document not found: ${slug.value}`,
	});
}

// Navigate to breadcrumb
function navigateBreadcrumb(crumb: DocsBreadcrumb, index: number) {
	if (index === 0) {
		router.push('/docs');
	} else if (index < breadcrumbs.value.length - 1) {
		// Navigate to parent folder - for now just go to docs index
		router.push('/docs');
	}
}

// SEO
useHead({
	title: computed(() => document.value?.title || 'Document'),
});

useServerSeoMeta({
	title: () => document.value?.title || 'Document',
	description: () => document.value?.summary || 'Documentation page',
	ogTitle: () => document.value?.title || 'Document',
	ogDescription: () => document.value?.summary || 'Documentation page',
});
</script>

<template>
	<BlockContainer>
		<div class="py-8">
			<!-- Loading State -->
			<div v-if="pending" class="flex items-center justify-center py-24">
				<div class="text-center">
					<div class="inline-block w-8 h-8 border-4 border-gray-300 rounded-full border-t-primary-600 animate-spin"></div>
					<p class="mt-4 text-gray-600 dark:text-gray-400">Loading document...</p>
				</div>
			</div>

			<!-- Error State -->
			<div v-else-if="error" class="py-24">
				<div class="max-w-md mx-auto p-6 text-center border border-red-200 rounded-lg bg-red-50 dark:bg-red-900/20">
					<Icon name="heroicons:exclamation-triangle" class="w-12 h-12 mx-auto text-red-600" />
					<h3 class="mt-4 text-lg font-semibold text-red-900 dark:text-red-200">Failed to load document</h3>
					<p class="mt-2 text-red-700 dark:text-red-300">{{ error.message }}</p>
					<NuxtLink to="/docs" class="mt-4 inline-block text-primary-600 hover:text-primary-800">
						&larr; Back to Documentation
					</NuxtLink>
				</div>
			</div>

			<!-- Document Not Found -->
			<div v-else-if="!document" class="py-24">
				<div class="max-w-md mx-auto p-6 text-center border border-gray-200 rounded-lg bg-gray-50 dark:bg-gray-800">
					<Icon name="heroicons:document-magnifying-glass" class="w-12 h-12 mx-auto text-gray-400" />
					<h3 class="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">Document not found</h3>
					<p class="mt-2 text-gray-600 dark:text-gray-400">
						The document "{{ slug }}" could not be found.
					</p>
					<NuxtLink to="/docs" class="mt-4 inline-block text-primary-600 hover:text-primary-800">
						&larr; Back to Documentation
					</NuxtLink>
				</div>
			</div>

			<!-- Document View -->
			<div v-else class="max-w-4xl mx-auto">
				<!-- Breadcrumbs -->
				<nav class="mb-6">
					<ol class="flex items-center flex-wrap gap-1 text-sm">
						<li v-for="(crumb, index) in breadcrumbs" :key="crumb.path" class="flex items-center">
							<span v-if="index > 0" class="mx-2 text-gray-400">/</span>
							<button
								v-if="index < breadcrumbs.length - 1"
								class="text-primary-600 hover:text-primary-800 dark:text-primary-400"
								@click="navigateBreadcrumb(crumb, index)"
							>
								{{ crumb.name }}
							</button>
							<span v-else class="text-gray-600 dark:text-gray-400">
								{{ crumb.name }}
							</span>
						</li>
					</ol>
				</nav>

				<!-- Document Header -->
				<header class="mb-8">
					<h1 class="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">
						{{ document.title }}
					</h1>
					<div class="mt-3 flex items-center flex-wrap gap-4 text-sm text-gray-500">
						<span v-if="document.last_synced" class="flex items-center gap-1">
							<Icon name="heroicons:clock" class="w-4 h-4" />
							{{ new Date(document.last_synced).toLocaleDateString() }}
						</span>
						<span v-if="document.sha" class="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
							{{ document.sha.slice(0, 7) }}
						</span>
					</div>
					<p v-if="document.summary" class="mt-4 text-lg text-gray-600 dark:text-gray-400">
						{{ document.summary }}
					</p>
				</header>

				<!-- Document Content -->
				<article class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 lg:p-10">
					<TypographyProse :content="renderedContent" size="md" />
				</article>

				<!-- Document Footer -->
				<footer class="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
					<div class="flex items-center justify-between flex-wrap gap-4">
						<NuxtLink to="/docs" class="text-sm text-primary-600 hover:text-primary-800 flex items-center gap-1">
							<Icon name="heroicons:arrow-left" class="w-4 h-4" />
							All Documentation
						</NuxtLink>
						<a
							v-if="document.path"
							:href="`https://github.com/Huyen1974/web-test/blob/main/${document.path}`"
							target="_blank"
							rel="noopener noreferrer"
							class="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
						>
							<Icon name="heroicons:arrow-top-right-on-square" class="w-4 h-4" />
							Edit on GitHub
						</a>
					</div>
				</footer>
			</div>
		</div>
	</BlockContainer>
</template>
