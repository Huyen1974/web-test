<script setup lang="ts">
import type { TaxonomyTree } from '~/composables/useTaxonomyTree';

const props = defineProps<{
	tree: TaxonomyTree;
	currentZone?: string;
	currentTopic?: string;
}>();

// Expanded state for categories and zones
const expandedCategories = ref<Set<string>>(new Set());
const expandedZones = ref<Set<string>>(new Set());

// Auto-expand category/zone if a zone/topic is active
watchEffect(() => {
	if (props.currentZone) {
		// Find and expand the category containing this zone
		const category = props.tree.categories.find((cat) => cat.zones.some((z) => z.zone === props.currentZone));

		if (category) {
			expandedCategories.value.add(category.category);

			// Also expand the zone if a topic is selected
			if (props.currentTopic) {
				expandedZones.value.add(props.currentZone);
			}
		}
	}
});

// Toggle functions
const toggleCategory = (categoryName: string) => {
	if (expandedCategories.value.has(categoryName)) {
		expandedCategories.value.delete(categoryName);
	} else {
		expandedCategories.value.add(categoryName);
	}
};

const toggleZone = (zoneKey: string) => {
	if (expandedZones.value.has(zoneKey)) {
		expandedZones.value.delete(zoneKey);
	} else {
		expandedZones.value.add(zoneKey);
	}
};

const isCategoryExpanded = (categoryName: string) => expandedCategories.value.has(categoryName);
const isZoneExpanded = (zoneKey: string) => expandedZones.value.has(zoneKey);
</script>

<template>
	<nav class="knowledge-taxonomy-menu" aria-label="Knowledge taxonomy navigation">
		<!-- Error state -->
		<div v-if="tree.hasError" class="p-4 bg-yellow-50 border border-yellow-200 rounded-md mb-4">
			<div class="flex items-start">
				<Icon name="heroicons:exclamation-triangle" class="w-5 h-5 text-yellow-600 mt-0.5 mr-2" />
				<div class="text-sm text-yellow-800">
					<p class="font-medium">Unable to load taxonomy</p>
					<p class="text-xs mt-1">Showing empty navigation. The knowledge list may still work.</p>
				</div>
			</div>
		</div>

		<!-- Empty state -->
		<div v-else-if="tree.categories.length === 0" class="p-4 text-sm text-gray-500">
			<Icon name="heroicons:document-text" class="w-8 h-8 text-gray-300 mx-auto mb-2" />
			<p class="text-center">No knowledge documents available yet</p>
		</div>

		<!-- Taxonomy tree -->
		<div v-else class="taxonomy-tree">
			<!-- Total count -->
			<div class="p-3 bg-gray-50 border-b border-gray-200">
				<div class="text-xs font-medium text-gray-500 uppercase tracking-wide">Knowledge Base</div>
				<div class="text-sm text-gray-700 mt-1">{{ tree.totalDocuments }} documents</div>
			</div>

			<!-- Categories -->
			<div class="divide-y divide-gray-100">
				<div v-for="category in tree.categories" :key="category.category" class="category-section">
					<!-- Category header -->
					<button
						type="button"
						class="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
						:class="{ 'bg-gray-50': isCategoryExpanded(category.category) }"
						@click="toggleCategory(category.category)"
					>
						<div class="flex items-center space-x-2 flex-1">
							<Icon :name="category.icon" class="w-5 h-5 text-gray-600" />
							<span class="text-sm font-medium text-gray-900">{{ category.displayName }}</span>
							<span class="text-xs text-gray-500">({{ category.documentCount }})</span>
						</div>
						<Icon
							name="heroicons:chevron-right"
							class="w-4 h-4 text-gray-400 transition-transform"
							:class="{ 'rotate-90': isCategoryExpanded(category.category) }"
						/>
					</button>

					<!-- Zones (when category expanded) -->
					<div v-if="isCategoryExpanded(category.category)" class="bg-gray-50">
						<div v-for="zone in category.zones" :key="zone.zone" class="zone-section border-l-2 border-gray-200 ml-4">
							<!-- Zone header -->
							<button
								type="button"
								class="w-full flex items-center justify-between p-2 pl-3 hover:bg-white transition-colors"
								:class="{
									'bg-white': isZoneExpanded(zone.zone),
									'bg-primary-50 border-l-2 border-primary-500': currentZone === zone.zone && !currentTopic,
								}"
								@click="toggleZone(zone.zone)"
							>
								<NuxtLink
									:to="`/knowledge?zone=${encodeURIComponent(zone.zone)}`"
									class="flex items-center space-x-2 flex-1 min-w-0"
									:class="{ 'font-semibold text-primary-700': currentZone === zone.zone && !currentTopic }"
									@click.stop
								>
									<span class="text-sm truncate">{{ zone.zone }}</span>
									<span class="text-xs text-gray-500 shrink-0">({{ zone.documentCount }})</span>
								</NuxtLink>
								<Icon
									name="heroicons:chevron-right"
									class="w-3 h-3 text-gray-400 transition-transform shrink-0"
									:class="{ 'rotate-90': isZoneExpanded(zone.zone) }"
								/>
							</button>

							<!-- Topics (when zone expanded) -->
							<div v-if="isZoneExpanded(zone.zone)" class="bg-white">
								<NuxtLink
									v-for="topic in zone.topics"
									:key="topic.topic"
									:to="`/knowledge?zone=${encodeURIComponent(zone.zone)}&topic=${encodeURIComponent(topic.topic)}`"
									class="block p-2 pl-6 text-sm hover:bg-gray-50 transition-colors"
									:class="{
										'bg-primary-50 text-primary-700 font-medium border-l-2 border-primary-500':
											currentZone === zone.zone && currentTopic === topic.topic,
										'text-gray-700': currentZone !== zone.zone || currentTopic !== topic.topic,
									}"
								>
									<div class="flex items-center justify-between">
										<span class="truncate">{{ topic.topic }}</span>
										<span class="text-xs text-gray-500 ml-2 shrink-0">({{ topic.documentCount }})</span>
									</div>
								</NuxtLink>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</nav>
</template>

<style scoped>
.knowledge-taxonomy-menu {
	@apply border border-gray-200 rounded-lg overflow-hidden bg-white;
}

.taxonomy-tree {
	@apply max-h-[calc(100vh-12rem)] overflow-y-auto;
}

/* Smooth scrollbar */
.taxonomy-tree::-webkit-scrollbar {
	@apply w-2;
}

.taxonomy-tree::-webkit-scrollbar-track {
	@apply bg-gray-100;
}

.taxonomy-tree::-webkit-scrollbar-thumb {
	@apply bg-gray-300 rounded;
}

.taxonomy-tree::-webkit-scrollbar-thumb:hover {
	@apply bg-gray-400;
}
</style>
