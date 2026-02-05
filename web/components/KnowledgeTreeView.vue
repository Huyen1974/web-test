<script setup lang="ts">
import type { KnowledgeTreeNode } from '~/composables/useKnowledge';

interface Props {
	nodes: KnowledgeTreeNode[];
	level?: number;
	selectedPath?: string;
}

const props = withDefaults(defineProps<Props>(), {
	level: 0,
	selectedPath: '',
});

const emit = defineEmits<{
	select: [node: KnowledgeTreeNode];
}>();

// Track expanded folders
const expandedFolders = ref<Set<string>>(new Set());

// Auto-expand folders containing the selected document
watch(
	() => props.selectedPath,
	(newPath) => {
		if (!newPath) return;

		// Expand all parent folders of the selected path
		const parts = newPath.split('/');
		let currentPath = '';
		for (let i = 0; i < parts.length - 1; i++) {
			currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i];
			expandedFolders.value.add(currentPath);
		}
	},
	{ immediate: true },
);

// Auto-expand top-level folders on mount
onMounted(() => {
	// Expand first level folders by default for better UX
	for (const node of props.nodes) {
		if (node.isFolder) {
			expandedFolders.value.add(node.path);
		}
	}
});

function toggleFolder(node: KnowledgeTreeNode) {
	if (expandedFolders.value.has(node.path)) {
		expandedFolders.value.delete(node.path);
	} else {
		expandedFolders.value.add(node.path);
	}
}

function handleClick(node: KnowledgeTreeNode) {
	if (node.isFolder) {
		toggleFolder(node);
	} else {
		emit('select', node);
	}
}

function isExpanded(path: string): boolean {
	return expandedFolders.value.has(path);
}

function isSelected(node: KnowledgeTreeNode): boolean {
	return !node.isFolder && node.path === props.selectedPath;
}

function countDocuments(node: KnowledgeTreeNode): number {
	if (!node.isFolder) return 1;
	let count = 0;
	for (const child of node.children) {
		count += countDocuments(child);
	}
	return count;
}
</script>

<template>
	<ul :class="level === 0 ? 'space-y-0.5' : 'ml-3 mt-0.5 space-y-0.5 border-l border-gray-200 dark:border-gray-700 pl-2'">
		<li v-for="node in nodes" :key="node.id">
			<!-- Folder Node -->
			<button
				v-if="node.isFolder"
				class="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
				@click="handleClick(node)"
			>
				<!-- Expand/Collapse Icon -->
				<div class="flex-shrink-0 w-4 h-4 flex items-center justify-center">
					<Icon
						name="heroicons:chevron-right"
						class="w-3 h-3 text-gray-500 transition-transform"
						:class="{ 'rotate-90': isExpanded(node.path) }"
					/>
				</div>

				<!-- Folder Icon -->
				<Icon
					:name="isExpanded(node.path) ? 'heroicons:folder-open' : 'heroicons:folder'"
					class="w-4 h-4 flex-shrink-0"
					:class="isExpanded(node.path) ? 'text-yellow-500' : 'text-yellow-600'"
				/>

				<!-- Name -->
				<span class="flex-1 text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
					{{ node.name }}
				</span>

				<!-- Document count -->
				<span class="text-xs text-gray-400 flex-shrink-0">
					{{ countDocuments(node) }}
				</span>
			</button>

			<!-- Document Node -->
			<NuxtLink
				v-else
				:to="`/knowledge/${node.slug}`"
				class="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors"
				:class="[
					isSelected(node)
						? 'bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-200'
						: 'hover:bg-gray-100 dark:hover:bg-gray-700',
				]"
			>
				<!-- Spacer for alignment -->
				<div class="flex-shrink-0 w-4 h-4"></div>

				<!-- Document Icon -->
				<Icon
					name="heroicons:document-text"
					class="w-4 h-4 flex-shrink-0 text-blue-500"
				/>

				<!-- Name -->
				<span
					class="flex-1 text-sm truncate"
					:class="isSelected(node) ? 'font-medium' : 'text-gray-700 dark:text-gray-300'"
				>
					{{ node.name }}
				</span>
			</NuxtLink>

			<!-- Children (recursive) -->
			<KnowledgeTreeView
				v-if="node.isFolder && isExpanded(node.path) && node.children.length > 0"
				:nodes="node.children"
				:level="level + 1"
				:selected-path="selectedPath"
				@select="(n) => emit('select', n)"
			/>
		</li>
	</ul>
</template>
