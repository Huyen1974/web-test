<script setup lang="ts">
import type { BlueprintList } from '~/composables/useBlueprints';

const route = useRoute();
const router = useRouter();

// Search state
const searchQuery = ref((route.query.q as string) || '');
const isSearching = ref(false);

// Fetch blueprint documents
const { data, pending, error, refresh } = await useAsyncData(
	'blueprint-list',
	async () => {
		const query = route.query.q as string | undefined;

		// If search query exists, use Agent Data search
		if (query && query.trim()) {
			const results = await useAgentDataSearch(query, {
				language: 'vn',
			});

			// Filter to only blueprints
			const blueprintItems = results.items.filter(
				(item) => item.zone === 'Reference' || item.tags.includes('blueprint'),
			);

			// Log search event
			useAgentDataLogSearch({
				query,
				resultCount: blueprintItems.length,
				language: 'vn',
			});

			return {
				items: blueprintItems,
				total: blueprintItems.length,
				page: 1,
				pageSize: 20,
				language: 'vn' as const,
			};
		}

		// Otherwise, use regular Directus list
		return await useBlueprintList({
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
	title: 'Blueprints & Design Docs',
	description: 'Browse our technical blueprints and design documentation',
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
				<TypographyTitle>Blueprints & Design Docs</TypographyTitle>
				<p class="mt-2 text-gray-600 dark:text-gray-400">
					Technical blueprints, architecture documents, and design references
				</p>

				<!-- Search Box -->
				<div class="mt-6">
					<form class="flex gap-2" @submit.prevent="handleSearch">
						<div class="relative flex-1">
							<input
								v-model="searchQuery"
								type="text"
								placeholder="Search blueprints..."
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

			<!-- Loading State -->
			<div v-if="pending" class="flex items-center justify-center py-12">
				<div class="text-center">
					<div
						class="inline-block w-8 h-8 border-4 border-gray-300 rounded-full border-t-primary-600 animate-spin"
					></div>
					<p class="mt-4 text-gray-600 dark:text-gray-400">Loading blueprints...</p>
				</div>
			</div>

			<!-- Error State -->
			<div v-else-if="error" class="py-12">
				<div class="p-6 text-center border border-red-200 rounded-lg bg-red-50 dark:bg-red-900/20">
					<Icon name="heroicons:exclamation-triangle" class="w-12 h-12 mx-auto text-red-600" />
					<h3 class="mt-4 text-lg font-semibold text-red-900 dark:text-red-200">Failed to load blueprints</h3>
					<p class="mt-2 text-red-700 dark:text-red-300">
						There was an error loading the blueprint documents. Please try again later.
					</p>
				</div>
			</div>

			<!-- Empty State -->
			<div v-else-if="!data || data.items.length === 0" class="py-12">
				<div class="p-8 text-center border border-gray-200 rounded-lg bg-gray-50 dark:bg-gray-800">
					<Icon name="heroicons:document-chart-bar" class="w-16 h-16 mx-auto text-gray-400" />
					<h3 class="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">No blueprints found</h3>
					<p class="mt-2 text-gray-600 dark:text-gray-400">There are no blueprint documents available at this time.</p>
				</div>
			</div>

			<!-- Content -->
			<div v-else class="py-8">
				<!-- Blueprint Cards -->
				<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
					<NuxtLink
						v-for="item in data.items"
						:key="item.id"
						:to="`/blueprints/${item.slug || item.id}`"
						class="block p-6 transition-all border border-gray-200 rounded-lg hover:shadow-lg hover:border-primary-300 dark:border-gray-700 dark:hover:border-primary-700"
					>
						<!-- Icon & Zone Badge -->
						<div class="flex items-start justify-between mb-3">
							<Icon name="heroicons:document-chart-bar" class="w-8 h-8 text-primary-600" />
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
							<span
								v-if="item.tags.length > 3"
								class="px-2 py-0.5 text-xs rounded bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
							>
								+{{ item.tags.length - 3 }}
							</span>
						</div>
					</NuxtLink>
				</div>

				<!-- Pagination Info -->
				<div class="mt-8 text-sm text-center text-gray-600 dark:text-gray-400">
					Showing {{ data.items.length }} of {{ data.total }} blueprints
				</div>
			</div>
		</div>
	</BlockContainer>
</template>
