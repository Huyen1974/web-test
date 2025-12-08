<script setup lang="ts">
import type { KnowledgeList } from '~/types/view-model-0032';

const route = useRoute();
const router = useRouter();
const config = useRuntimeConfig();

// Check if Agent Data is enabled
const agentDataEnabled = computed(() => !!config.public.agentData?.enabled && !!config.public.agentData?.baseUrl);

// Search state
const searchQuery = ref((route.query.q as string) || '');
const isSearching = ref(false);

// Fetch taxonomy tree (Task 0037)
const { data: taxonomyTree } = await useAsyncData('taxonomy-tree', () => useTaxonomyTree(), {
	// Cache for 5 minutes
	getCachedData: (key) => {
		const cached = useNuxtApp().payload.data[key] || useNuxtApp().static.data[key];
		if (!cached) return;
		const expiresAt = cached._expires;

		if (expiresAt && Date.now() < expiresAt) {
			return cached;
		}
	},
});

// Fetch knowledge documents
const { data, pending, error, refresh } = await useAsyncData(
	'knowledge-list',
	async () => {
		const zone = route.query.zone as string | undefined;
		const subZone = route.query.subZone as string | undefined;
		const topic = route.query.topic as string | undefined;
		const query = route.query.q as string | undefined;
		const trimmedQuery = (query || '').trim();

		// Case 3: Agent Data enabled AND search query exists → Use Agent Data search
		if (agentDataEnabled.value && trimmedQuery) {
			const results = await useAgentDataSearch(trimmedQuery, {
				zone,
				subZone,
				topic,
				language: 'vn',
			});

			// Log search event
			useAgentDataLogSearch({
				query: trimmedQuery,
				zone,
				subZone,
				topic,
				resultCount: results.total,
				language: 'vn',
			});

			return {
				items: results.items,
				total: results.total,
				page: 1,
				pageSize: 20,
				zone,
				subZone,
				topic,
				language: 'vn' as const,
			};
		}

		// Case 1 & 2: Agent Data disabled OR no search query → Use Directus list
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

// Search handler
const handleSearch = async () => {
	if (!searchQuery.value.trim()) {
		// Clear search
		await router.push({ query: { ...route.query, q: undefined } });
		return;
	}

	isSearching.value = true;

	try {
		await router.push({
			query: {
				...route.query,
				q: searchQuery.value.trim(),
			},
		});
	} finally {
		isSearching.value = false;
	}
};

// Clear search handler
const clearSearch = async () => {
	searchQuery.value = '';
	await router.push({ query: { ...route.query, q: undefined } });
};

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
				<p class="mt-2 text-gray-600 dark:text-gray-400">Browse our knowledge base, guides, and documentation</p>

				<!-- Search Box -->
				<div class="mt-6">
					<form class="flex gap-2" @submit.prevent="handleSearch">
						<div class="relative flex-1">
							<input
								v-model="searchQuery"
								type="text"
								placeholder="Search knowledge base..."
								class="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600"
								:disabled="isSearching"
							/>
							<button
								v-if="searchQuery"
								type="button"
								class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
								@click="clearSearch"
							>
								<Icon name="heroicons:x-mark" class="w-5 h-5" />
							</button>
						</div>
						<button
							type="submit"
							:disabled="isSearching || !searchQuery.trim()"
							class="px-6 py-2 font-medium text-white rounded-lg bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							<Icon v-if="isSearching" name="heroicons:arrow-path" class="w-5 h-5 animate-spin" />
							<Icon v-else name="heroicons:magnifying-glass" class="w-5 h-5" />
						</button>
					</form>

					<!-- Search Results Info -->
					<div v-if="route.query.q && data" class="mt-3">
						<p class="text-sm text-gray-600 dark:text-gray-400">
							<span class="font-medium">{{ data.total }}</span>
							results for
							<span class="font-medium">"{{ route.query.q }}"</span>
						</p>
					</div>
				</div>
			</header>

			<!-- Two-column layout: Taxonomy Menu + Content -->
			<div class="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-8">
				<!-- Left sidebar: Taxonomy Menu (Task 0037) -->
				<aside class="lg:col-span-1">
					<div class="sticky top-4">
						<KnowledgeTaxonomyMenu
							v-if="taxonomyTree"
							:tree="taxonomyTree"
							:current-zone="(route.query.zone as string) || undefined"
							:current-topic="(route.query.topic as string) || undefined"
						/>
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
							<p class="mt-4 text-gray-600 dark:text-gray-400">Loading knowledge base...</p>
						</div>
					</div>

					<!-- Error State -->
					<div v-else-if="error" class="py-12">
						<div class="p-6 text-center border border-red-200 rounded-lg bg-red-50 dark:bg-red-900/20">
							<Icon name="heroicons:exclamation-triangle" class="w-12 h-12 mx-auto text-red-600" />
							<h3 class="mt-4 text-lg font-semibold text-red-900 dark:text-red-200">Failed to load knowledge base</h3>
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
								<span v-if="data.subZone" class="px-3 py-1 text-sm rounded-full bg-primary-100 text-primary-800">
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
								<!-- Zone & Status Badges -->
								<div class="flex items-center justify-between mb-3">
									<span class="px-2 py-1 text-xs font-semibold rounded bg-primary-100 text-primary-800">
										{{ item.zone }}
									</span>
									<div class="flex items-center gap-2">
										<!-- Workflow Status Badge (Task 0047C) -->
										<span
											v-if="item.workflowStatus"
											:class="{
												'px-2 py-1 text-xs font-semibold rounded': true,
												'bg-green-100 text-green-800': item.workflowStatus === 'published',
												'bg-blue-100 text-blue-800': item.workflowStatus === 'approved',
												'bg-yellow-100 text-yellow-800': item.workflowStatus === 'under_review',
												'bg-gray-100 text-gray-800':
													item.workflowStatus === 'draft' || item.workflowStatus === 'archived',
											}"
										>
											{{ item.workflowStatus.replace('_', ' ') }}
										</span>
										<!-- Version Number (Task 0047C) -->
										<span
											v-if="item.versionNumber"
											class="px-2 py-1 text-xs font-semibold rounded bg-purple-100 text-purple-800"
										>
											v{{ item.versionNumber }}
										</span>
									</div>
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
				</main>
			</div>
		</div>
	</BlockContainer>
</template>
