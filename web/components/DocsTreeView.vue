<script setup lang="ts">
import type { DocsTreeNode } from '~/types/agent-views';

interface Props {
	nodes: DocsTreeNode[];
	level?: number;
	selectedPath?: string;
}

const props = withDefaults(defineProps<Props>(), {
	level: 0,
	selectedPath: '',
});

const emit = defineEmits<{
	select: [node: DocsTreeNode];
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

function toggleFolder(node: DocsTreeNode) {
	if (expandedFolders.value.has(node.path)) {
		expandedFolders.value.delete(node.path);
	} else {
		expandedFolders.value.add(node.path);
	}
}

function handleClick(node: DocsTreeNode) {
	if (node.isFolder) {
		toggleFolder(node);
	} else {
		emit('select', node);
	}
}

function isExpanded(path: string): boolean {
	return expandedFolders.value.has(path);
}

function isSelected(node: DocsTreeNode): boolean {
	return !node.isFolder && node.path === props.selectedPath;
}
</script>

<template>
	<ul :class="level === 0 ? 'space-y-0.5' : 'ml-3 mt-0.5 space-y-0.5 border-l border-gray-200 dark:border-gray-700 pl-2'">
		<li v-for="node in nodes" :key="node.id">
			<!-- Node Row -->
			<button
				class="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors"
				:class="[
					isSelected(node)
						? 'bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-200'
						: 'hover:bg-gray-100 dark:hover:bg-gray-700',
				]"
				@click="handleClick(node)"
			>
				<!-- Expand/Collapse Icon for folders -->
				<div class="flex-shrink-0 w-4 h-4 flex items-center justify-center">
					<svg
						v-if="node.isFolder"
						class="w-3 h-3 text-gray-500 transition-transform"
						:class="{ 'rotate-90': isExpanded(node.path) }"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
				</div>

				<!-- Folder/Document Icon -->
				<div class="flex-shrink-0">
					<svg
						v-if="node.isFolder"
						class="w-4 h-4"
						:class="isExpanded(node.path) ? 'text-yellow-500' : 'text-yellow-600'"
						fill="currentColor"
						viewBox="0 0 20 20"
					>
						<path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
					</svg>
					<svg v-else class="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
						/>
					</svg>
				</div>

				<!-- Name -->
				<span
					class="flex-1 text-sm truncate"
					:class="isSelected(node) ? 'font-medium' : 'text-gray-700 dark:text-gray-300'"
				>
					{{ node.name }}
				</span>

				<!-- Document indicator -->
				<span
					v-if="node.isFolder && node.children.length > 0"
					class="text-xs text-gray-400"
				>
					{{ node.children.length }}
				</span>
			</button>

			<!-- Children (recursive) -->
			<DocsTreeView
				v-if="node.isFolder && isExpanded(node.path) && node.children.length > 0"
				:nodes="node.children"
				:level="level + 1"
				:selected-path="selectedPath"
				@select="(n) => emit('select', n)"
			/>
		</li>
	</ul>
</template>
