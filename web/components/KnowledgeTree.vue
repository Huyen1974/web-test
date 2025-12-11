<script setup lang="ts">
import type { KnowledgeTreeNode } from '~/types';
import { loadNodeChildren } from '~/composables/useKnowledgeTree';

interface Props {
	nodes: KnowledgeTreeNode[];
	level?: number;
}

const props = withDefaults(defineProps<Props>(), {
	level: 0,
});

const emit = defineEmits<{
	selectNode: [node: KnowledgeTreeNode];
	createFolder: [parentNode: KnowledgeTreeNode | null];
	moveNode: [node: KnowledgeTreeNode];
	refresh: [];
}>();

// Track expanded nodes (local state)
const expandedNodes = ref<Set<number>>(new Set());
const loadingNodes = ref<Set<number>>(new Set());
const nodeChildren = ref<Map<number, KnowledgeTreeNode[]>>(new Map());

// Toggle expand/collapse
async function toggleNode(node: KnowledgeTreeNode) {
	if (!node.hasChildren) {
		emit('selectNode', node);
		return;
	}

	if (expandedNodes.value.has(node.id)) {
		// Collapse
		expandedNodes.value.delete(node.id);
	} else {
		// Expand - load children if not already loaded
		if (!nodeChildren.value.has(node.id)) {
			loadingNodes.value.add(node.id);

			try {
				const children = await loadNodeChildren(node.id);
				nodeChildren.value.set(node.id, children);
			} catch {
				// Failed to load children - silently fail and keep collapsed
			} finally {
				loadingNodes.value.delete(node.id);
			}
		}

		expandedNodes.value.add(node.id);
	}
}

// Check if node is expanded
function isExpanded(nodeId: number): boolean {
	return expandedNodes.value.has(nodeId);
}

// Check if node is loading
function isLoading(nodeId: number): boolean {
	return loadingNodes.value.has(nodeId);
}

// Get children for a node
function getChildren(nodeId: number): KnowledgeTreeNode[] {
	return nodeChildren.value.get(nodeId) || [];
}

// Handle node click
function handleNodeClick(node: KnowledgeTreeNode) {
	emit('selectNode', node);
}

// Handle create folder
function handleCreateFolder(parentNode: KnowledgeTreeNode | null) {
	emit('createFolder', parentNode);
}

// Handle move
function handleMove(node: KnowledgeTreeNode) {
	emit('moveNode', node);
}

// Expose refresh function to parent
function refreshNode(nodeId: number) {
	nodeChildren.value.delete(nodeId);

	if (expandedNodes.value.has(nodeId)) {
		expandedNodes.value.delete(nodeId);
		// Re-expand to reload
		const node = findNodeById(props.nodes, nodeId);

		if (node) {
			toggleNode(node);
		}
	}
}

// Helper to find node by ID
function findNodeById(nodes: KnowledgeTreeNode[], id: number): KnowledgeTreeNode | null {
	for (const node of nodes) {
		if (node.id === id) return node;

		if (node.children) {
			const found = findNodeById(node.children, id);
			if (found) return found;
		}
	}

	return null;
}

defineExpose({
	refreshNode,
});
</script>

<template>
	<ul :class="level === 0 ? 'space-y-1' : 'ml-4 mt-1 space-y-1 border-l-2 border-gray-200 dark:border-gray-700 pl-2'">
		<li v-for="node in nodes" :key="node.id" class="group">
			<!-- Node Row -->
			<div
				class="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
				@click="toggleNode(node)"
			>
				<!-- Expand/Collapse Icon -->
				<div class="flex-shrink-0 w-4 h-4 flex items-center justify-center">
					<svg
						v-if="node.hasChildren && !isLoading(node.id)"
						class="w-4 h-4 text-gray-500 transition-transform"
						:class="{ 'rotate-90': isExpanded(node.id) }"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
					<div
						v-else-if="isLoading(node.id)"
						class="inline-block animate-spin rounded-full h-3 w-3 border-b-2 border-purple-600"
					></div>
				</div>

				<!-- Folder/Document Icon -->
				<div class="flex-shrink-0">
					<svg
						v-if="node.isFolder"
						class="w-5 h-5"
						:class="isExpanded(node.id) ? 'text-yellow-500' : 'text-yellow-600'"
						fill="currentColor"
						viewBox="0 0 20 20"
					>
						<path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
					</svg>
					<svg v-else class="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
						/>
					</svg>
				</div>

				<!-- Title -->
				<div class="flex-1 min-w-0" @click.stop="handleNodeClick(node)">
					<span class="text-sm font-medium text-gray-900 dark:text-white truncate">{{ node.title }}</span>
					<span v-if="node.status === 'draft'" class="ml-2 text-xs text-gray-500 dark:text-gray-400">(draft)</span>
				</div>

				<!-- Actions (shown on hover) -->
				<div class="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
					<!-- New Folder -->
					<button
						v-if="node.isFolder"
						class="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
						title="New Folder"
						@click.stop="handleCreateFolder(node)"
					>
						<svg class="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
						</svg>
					</button>

					<!-- Move -->
					<button
						class="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
						title="Move"
						@click.stop="handleMove(node)"
					>
						<svg class="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M8 7h12M8 12h12m-12 5h12m-12-9v14M4 7h1m-1 5h1m-1 5h1"
							/>
						</svg>
					</button>
				</div>
			</div>

			<!-- Children (recursively rendered) -->
			<KnowledgeTree
				v-if="isExpanded(node.id) && node.hasChildren"
				:nodes="getChildren(node.id)"
				:level="level + 1"
				@select-node="(n) => emit('selectNode', n)"
				@create-folder="(n) => emit('createFolder', n)"
				@move-node="(n) => emit('moveNode', n)"
				@refresh="emit('refresh')"
			/>
		</li>
	</ul>
</template>
