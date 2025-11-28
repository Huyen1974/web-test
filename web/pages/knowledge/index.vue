<script setup lang="ts">
import type { KnowledgeList } from '~/types/view-model-0032';

const route = useRoute();

// Fetch knowledge documents
const { data, pending, error } = await useAsyncData(
	'knowledge-list',
	async () => {
		const zone = route.query.zone as string | undefined;
		const subZone = route.query.subZone as string | undefined;
		const topic = route.query.topic as string | undefined;

		return await useKnowledgeList({
			zone,
			subZone,
			topic,
			language: 'vn',
		});
	},
	{
		watch: [() => route.query],
	},
);

// Compute metadata
const metadata = computed(() => ({
	title: 'Knowledge Hub',
	description: 'Browse our knowledge base and documentation',
}));

// Page Title
useHead({
	title: metadata.value.title,
});

// SEO Meta
useServerSeoMeta({
	title: metadata.value.title,
	description: metadata.value.description,
	ogTitle: metadata.value.title,
	ogDescription: metadata.value.description,
});
</script>

<template>
	<BlockContainer>
		<div class="py-8">
			<!-- Header -->
			<header class="pb-6 border-b border-gray-300 dark:border-gray-700">
				<TypographyTitle>Knowledge Hub</TypographyTitle>
				<p class="mt-2 text-gray-600 dark:text-gray-400">
					Browse our knowledge base, guides, and documentation
				</p>
			</header>

			<!-- Loading State -->
			<div v-if="pending" class="flex items-center justify-center py-12">
				<div class="text-center">
					<div
						class="inline-block w-8 h-8 border-4 border-gray-300 rounded-full border-t-primary-600 animate-spin"
					></div>
					<p class="mt-4 text-gray-600 dark:text-gray-400">Loading knowledge base...</p>
				</div>
			</div>

			<!-- Error State -->
			<div v-else-if="error" class="py-12">
				<div class="p-6 text-center border border-red-200 rounded-lg bg-red-50 dark:bg-red-900/20">
					<Icon name="heroicons:exclamation-triangle" class="w-12 h-12 mx-auto text-red-600" />
					<h3 class="mt-4 text-lg font-semibold text-red-900 dark:text-red-200">
						Failed to load knowledge base
					</h3>
					<p class="mt-2 text-red-700 dark:text-red-300">
						There was an error loading the knowledge documents. Please try again later.
					</p>
				</div>
			</div>

			<!-- Empty State -->
			<div v-else-if="!data || data.items.length === 0" class="py-12">
				<div class="p-8 text-center border border-gray-200 rounded-lg bg-gray-50 dark:bg-gray-800">
					<Icon name="heroicons:document-text" class="w-16 h-16 mx-auto text-gray-400" />
					<h3 class="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">No documents found</h3>
					<p class="mt-2 text-gray-600 dark:text-gray-400">
						There are no knowledge documents available at this time.
					</p>
				</div>
			</div>

			<!-- Content -->
			<div v-else class="py-8">
				<!-- Filters (if applied) -->
				<div v-if="data.zone || data.subZone || data.topic" class="mb-6">
					<div class="flex flex-wrap gap-2">
						<span class="text-sm text-gray-600 dark:text-gray-400">Filtered by:</span>
						<span v-if="data.zone" class="px-3 py-1 text-sm rounded-full bg-primary-100 text-primary-800">
							Zone: {{ data.zone }}
						</span>
						<span
							v-if="data.subZone"
							class="px-3 py-1 text-sm rounded-full bg-primary-100 text-primary-800"
						>
							SubZone: {{ data.subZone }}
						</span>
						<span v-if="data.topic" class="px-3 py-1 text-sm rounded-full bg-primary-100 text-primary-800">
							Topic: {{ data.topic }}
						</span>
					</div>
				</div>

				<!-- Document Cards -->
				<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
					<NuxtLink
						v-for="item in data.items"
						:key="item.id"
						:to="`/knowledge/${item.slug || item.id}`"
						class="block p-6 transition-shadow border border-gray-200 rounded-lg hover:shadow-lg dark:border-gray-700"
					>
						<!-- Zone Badge -->
						<div class="mb-3">
							<span class="px-2 py-1 text-xs font-semibold rounded bg-primary-100 text-primary-800">
								{{ item.zone }}
							</span>
						</div>

						<!-- Title -->
						<h3 class="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
							{{ item.title }}
						</h3>

						<!-- Summary -->
						<p v-if="item.summary" class="mb-4 text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
							{{ item.summary }}
						</p>

						<!-- Meta -->
						<div class="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
							<span v-if="item.publishedAt">
								{{ new Date(item.publishedAt).toLocaleDateString() }}
							</span>
							<span v-if="item.subZone" class="flex items-center gap-1">
								<Icon name="heroicons:folder" class="w-3 h-3" />
								{{ item.subZone }}
							</span>
						</div>

						<!-- Tags -->
						<div v-if="item.tags && item.tags.length > 0" class="flex flex-wrap gap-1 mt-3">
							<span
								v-for="tag in item.tags.slice(0, 3)"
								:key="tag"
								class="px-2 py-0.5 text-xs rounded bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
							>
								{{ tag }}
							</span>
						</div>
					</NuxtLink>
				</div>

				<!-- Pagination Info -->
				<div class="mt-8 text-sm text-center text-gray-600 dark:text-gray-400">
					Showing {{ data.items.length }} of {{ data.total }} documents
				</div>
			</div>
		</div>
	</BlockContainer>
</template>
