<script setup lang="ts">
import type { BreadcrumbItem } from '~/types/view-model-0032';

const route = useRoute();

// Parse slug path - can be array for catch-all routes
const slugParts = computed(() => {
	const slug = route.params.slug;
	if (Array.isArray(slug)) return slug;
	if (typeof slug === 'string') return slug.split('/').filter(Boolean);
	return [];
});

// Build full slug for lookup
const fullSlug = computed(() => slugParts.value.join('/'));

// State
const viewMode = ref<'details' | 'history'>('details');
const compareMode = ref(false);
const selectedBaseVersionId = ref<string>('');
const selectedTargetVersionId = ref<string>('');

// Fetch knowledge document by slug path
const {
	data: document,
	pending,
	error,
} = await useAsyncData(`knowledge-${fullSlug.value}`, async () => {
	// Query by full slug path (e.g., "ssot/constitution", "dev/blueprints/agency-os")
	return await useKnowledgeDetail(fullSlug.value);
});

// Fetch history when document is available
const versionGroupId = computed(() => document.value?.versionGroupId);
const { data: historyData, pending: historyPending } = await useKnowledgeHistory(versionGroupId.value || '');

// Log page view when document is loaded
watch(
	document,
	(doc) => {
		if (doc) {
			useAgentDataLogPageView({
				documentId: doc.id,
				zone: doc.zone,
				subZone: doc.subZone,
				topic: doc.topics?.[0],
				route: route.fullPath,
				language: doc.language,
			});
		}
	},
	{ immediate: true },
);

// Watch for history data to set default comparison values
watch(historyData, (versions) => {
	if (versions && versions.length >= 2) {
		selectedTargetVersionId.value = versions[0].id;
		selectedBaseVersionId.value = versions[1].id;
	} else if (versions && versions.length === 1) {
		selectedTargetVersionId.value = versions[0].id;
		selectedBaseVersionId.value = versions[0].id;
	}
});

// Comparison Content
const baseVersion = computed(() => historyData.value?.find((v) => v.id === selectedBaseVersionId.value));
const targetVersion = computed(() => historyData.value?.find((v) => v.id === selectedTargetVersionId.value));

// Build SEO-friendly breadcrumb from slug path
const breadcrumb = computed<BreadcrumbItem[]>(() => {
	const parts = slugParts.value;
	const items: BreadcrumbItem[] = [{ label: 'Knowledge', slug: '/knowledge', type: 'zone' }];

	// Build path-based breadcrumbs
	let currentPath = '/knowledge';
	for (let i = 0; i < parts.length; i++) {
		const part = parts[i];
		const isLast = i === parts.length - 1;
		currentPath += `/${part}`;

		// Format label (convert kebab-case to Title Case)
		const label = isLast && document.value?.title
			? document.value.title
			: part
					.split('-')
					.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
					.join(' ');

		items.push({
			label,
			slug: isLast ? '' : currentPath,
			type: isLast ? 'document' : i === 0 ? 'zone' : 'subzone',
		});
	}

	return items;
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
					<!-- Zone & Status Badges -->
					<div class="flex items-center gap-2 mb-3">
						<span class="px-3 py-1 text-sm font-semibold rounded bg-primary-100 text-primary-800">
							{{ document.zone }}
						</span>
						<!-- Workflow Status Badge -->
						<span
							v-if="document.workflowStatus"
							:class="{
								'px-3 py-1 text-sm font-semibold rounded': true,
								'bg-green-100 text-green-800': document.workflowStatus === 'published',
								'bg-blue-100 text-blue-800': document.workflowStatus === 'approved',
								'bg-yellow-100 text-yellow-800': document.workflowStatus === 'under_review',
								'bg-gray-100 text-gray-800':
									document.workflowStatus === 'draft' || document.workflowStatus === 'archived',
							}"
						>
							{{ document.workflowStatus.replace('_', ' ') }}
						</span>
						<!-- Visibility Badge (WEB-49) -->
						<span
							v-if="document.visibility && document.visibility !== 'public'"
							:class="{
								'px-3 py-1 text-sm font-semibold rounded': true,
								'bg-orange-100 text-orange-800': document.visibility === 'internal',
								'bg-red-100 text-red-800': document.visibility === 'restricted',
							}"
						>
							{{ document.visibility }}
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
						<!-- Version Number -->
						<span v-if="document.versionNumber" class="flex items-center gap-1">
							<Icon name="heroicons:document-duplicate" class="w-4 h-4" />
							v{{ document.versionNumber }}
							<span
								v-if="document.isCurrentVersion"
								class="px-1.5 py-0.5 text-xs font-semibold rounded bg-green-100 text-green-800"
							>
								current
							</span>
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

					<!-- View Mode Tabs -->
					<div class="flex items-center gap-4 mt-8 border-b border-gray-200 dark:border-gray-700">
						<button
							class="px-4 py-2 text-sm font-medium border-b-2 transition-colors duration-200"
							:class="
								viewMode === 'details'
									? 'border-primary-600 text-primary-600'
									: 'border-transparent text-gray-500 hover:text-gray-700'
							"
							@click="viewMode = 'details'"
						>
							<Icon name="heroicons:document-text" class="w-4 h-4 inline mr-1" />
							Details
						</button>
						<button
							class="px-4 py-2 text-sm font-medium border-b-2 transition-colors duration-200"
							:class="
								viewMode === 'history'
									? 'border-primary-600 text-primary-600'
									: 'border-transparent text-gray-500 hover:text-gray-700'
							"
							@click="viewMode = 'history'"
						>
							<Icon name="heroicons:clock" class="w-4 h-4 inline mr-1" />
							Version History
						</button>
					</div>
				</header>

				<!-- Content Body -->
				<div v-if="viewMode === 'details'" class="prose prose-gray dark:prose-invert max-w-none">
					<!-- Render markdown content if available -->
					<div v-if="document.content" v-html="document.content"></div>
					<!-- Placeholder if no content -->
					<div v-else class="p-6 border border-gray-200 rounded-lg bg-gray-50 dark:bg-gray-800">
						<p class="text-gray-600 dark:text-gray-400">
							<Icon name="heroicons:information-circle" class="inline-block w-5 h-5 mr-1" />
							Content will be displayed here when available.
						</p>
						<p class="mt-2 text-sm text-gray-500 dark:text-gray-500">Document ID: {{ document.id }}</p>
					</div>
				</div>

				<!-- History Body -->
				<div v-else class="space-y-8">
					<div v-if="historyPending" class="text-center py-8">
						<div
							class="inline-block w-8 h-8 border-4 border-gray-300 rounded-full border-t-primary-600 animate-spin"
						></div>
						<p class="mt-2 text-sm text-gray-500">Loading history...</p>
					</div>
					<div v-else-if="!historyData || historyData.length === 0" class="text-center py-8 text-gray-500">
						No version history available.
					</div>
					<div v-else>
						<!-- Comparison Controls -->
						<div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mb-6">
							<h3 class="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center justify-between">
								<span>Compare Versions</span>
								<button
									class="text-xs text-primary-600 hover:text-primary-700 underline"
									@click="compareMode = !compareMode"
								>
									{{ compareMode ? 'Hide Comparison' : 'Show Diff' }}
								</button>
							</h3>
							<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label class="block text-xs text-gray-500 mb-1">Base Version (Older)</label>
									<select
										v-model="selectedBaseVersionId"
										class="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
									>
										<option v-for="ver in historyData" :key="ver.id" :value="ver.id">
											v{{ ver.versionNumber }} - {{ new Date(ver.publishedAt).toLocaleDateString() }} ({{
												ver.workflowStatus
											}})
										</option>
									</select>
								</div>
								<div>
									<label class="block text-xs text-gray-500 mb-1">Target Version (Newer)</label>
									<select
										v-model="selectedTargetVersionId"
										class="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
									>
										<option v-for="ver in historyData" :key="ver.id" :value="ver.id">
											v{{ ver.versionNumber }} - {{ new Date(ver.publishedAt).toLocaleDateString() }} ({{
												ver.workflowStatus
											}})
										</option>
									</select>
								</div>
							</div>

							<!-- Diff Component -->
							<div v-if="compareMode && baseVersion && targetVersion" class="mt-6">
								<h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Difference</h4>
								<KnowledgeDiff
									v-if="baseVersion.summary !== targetVersion.summary"
									:old-text="baseVersion.summary || ''"
									:new-text="targetVersion.summary || ''"
									old-label="Base (Summary)"
									new-label="Target (Summary)"
									class="mb-4"
								/>

								<KnowledgeDiff
									v-if="baseVersion.content !== targetVersion.content"
									:old-text="baseVersion.content || ''"
									:new-text="targetVersion.content || ''"
									old-label="Base (Content)"
									new-label="Target (Content)"
									class="mb-4"
								/>

								<div
									v-if="baseVersion.summary === targetVersion.summary && baseVersion.content === targetVersion.content"
									class="text-sm text-gray-500 italic"
								>
									No textual differences detected in Summary or Content.
								</div>
							</div>
						</div>

						<!-- Version List -->
						<div class="overflow-hidden border border-gray-200 dark:border-gray-700 rounded-lg">
							<table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
								<thead class="bg-gray-50 dark:bg-gray-800">
									<tr>
										<th
											scope="col"
											class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
										>
											Version
										</th>
										<th
											scope="col"
											class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
										>
											Workflow
										</th>
										<th
											scope="col"
											class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
										>
											Date
										</th>
										<th
											scope="col"
											class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
										>
											Status
										</th>
									</tr>
								</thead>
								<tbody class="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
									<tr
										v-for="ver in historyData"
										:key="ver.id"
										class="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
									>
										<td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
											v{{ ver.versionNumber }}
										</td>
										<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
											{{ ver.workflowStatus }}
										</td>
										<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
											{{ new Date(ver.publishedAt).toLocaleDateString() }}
										</td>
										<td class="px-6 py-4 whitespace-nowrap text-sm">
											<span
												v-if="ver.isCurrentVersion"
												class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800"
											>
												Current
											</span>
											<span v-else class="text-gray-400 text-xs">History</span>
										</td>
									</tr>
								</tbody>
							</table>
						</div>
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
