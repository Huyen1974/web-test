<script setup lang="ts">
import type { KnowledgeCard, BreadcrumbItem } from '~/types/view-model-0032';

const route = useRoute();
const identifier = route.params.id as string;

// Fetch knowledge document
const {
	data: document,
	pending,
	error,
} = await useAsyncData(`knowledge-${identifier}`, async () => {
	return await useKnowledgeDetail(identifier);
});

// Build breadcrumb
const breadcrumb = computed<BreadcrumbItem[]>(() => {
	if (!document.value) return [];

	return [
		{ label: 'Knowledge', slug: '/knowledge', type: 'zone' },
		{ label: document.value.zone, slug: `/knowledge?zone=${document.value.zone}`, type: 'zone' },
		{
			label: document.value.subZone,
			slug: `/knowledge?zone=${document.value.zone}&subZone=${document.value.subZone}`,
			type: 'subzone',
		},
		{ label: document.value.title, slug: '', type: 'document' },
	];
});

// Compute metadata
const metadata = computed(() => ({
	title: document.value?.title || 'Knowledge Document',
	description: document.value?.summary || 'Knowledge base document',
}));

// Page Title
useHead({
	title: () => metadata.value.title,
});

// SEO Meta
useServerSeoMeta({
	title: () => metadata.value.title,
	description: () => metadata.value.description,
	ogTitle: () => metadata.value.title,
	ogDescription: () => metadata.value.description,
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

			<!-- Content -->
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
							<Icon v-if="index < breadcrumb.length - 1" name="heroicons:chevron-right" class="w-4 h-4 text-gray-400" />
						</li>
					</ol>
				</nav>

				<!-- Header -->
				<header class="pb-6 mb-6 border-b border-gray-300 dark:border-gray-700">
					<!-- Zone Badge -->
					<div class="mb-3">
						<span class="px-3 py-1 text-sm font-semibold rounded bg-primary-100 text-primary-800">
							{{ document.zone }}
						</span>
					</div>

					<!-- Title -->
					<TypographyTitle>{{ document.title }}</TypographyTitle>

					<!-- Summary -->
					<p v-if="document.summary" class="mt-4 text-lg text-gray-600 dark:text-gray-400">
						{{ document.summary }}
					</p>

					<!-- Meta -->
					<div class="flex flex-wrap items-center gap-4 mt-4 text-sm text-gray-500 dark:text-gray-500">
						<span v-if="document.publishedAt" class="flex items-center gap-1">
							<Icon name="heroicons:calendar" class="w-4 h-4" />
							{{ new Date(document.publishedAt).toLocaleDateString() }}
						</span>
						<span v-if="document.readTime" class="flex items-center gap-1">
							<Icon name="heroicons:clock" class="w-4 h-4" />
							{{ document.readTime }} min read
						</span>
						<span v-if="document.language" class="flex items-center gap-1">
							<Icon name="heroicons:language" class="w-4 h-4" />
							{{ document.language.toUpperCase() }}
						</span>
						<span v-if="document.version" class="flex items-center gap-1">
							<Icon name="heroicons:document-duplicate" class="w-4 h-4" />
							v{{ document.version }}
						</span>
					</div>

					<!-- Topics -->
					<div v-if="document.topics && document.topics.length > 0" class="flex flex-wrap gap-2 mt-4">
						<span
							v-for="topic in document.topics"
							:key="topic"
							class="px-3 py-1 text-sm rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
						>
							{{ topic }}
						</span>
					</div>
				</header>

				<!-- Content Body -->
				<div class="prose prose-gray dark:prose-invert max-w-none">
					<!-- Note: In a real implementation, you would render the markdown/HTML content here -->
					<!-- For now, showing a placeholder since we don't have content rendering setup -->
					<div class="p-6 border border-gray-200 rounded-lg bg-gray-50 dark:bg-gray-800">
						<p class="text-gray-600 dark:text-gray-400">
							<Icon name="heroicons:information-circle" class="inline-block w-5 h-5 mr-1" />
							Content rendering will be implemented with the actual document content from Directus.
						</p>
						<p class="mt-2 text-sm text-gray-500 dark:text-gray-500">Document ID: {{ document.id }}</p>
					</div>
				</div>

				<!-- Footer -->
				<footer class="pt-6 mt-8 border-t border-gray-300 dark:border-gray-700">
					<NuxtLink to="/knowledge" class="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700">
						<Icon name="heroicons:arrow-left" class="w-4 h-4" />
						Back to Knowledge Hub
					</NuxtLink>
				</footer>
			</article>
		</div>
	</BlockContainer>
</template>
