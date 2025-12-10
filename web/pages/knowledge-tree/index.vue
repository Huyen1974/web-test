<script setup lang="ts">
import type { KnowledgeTreeNode, KnowledgeDocument } from '~/types';
import {
	useKnowledgeTreeLazy,
	createFolder,
	moveNode,
	useKnowledgeDocumentsList,
} from '~/composables/useKnowledgeTree';

definePageMeta({
	title: 'Knowledge Tree',
	description: 'Browse and manage knowledge documents in a hierarchical tree structure',
});

// Fetch root tree nodes
const {
	data: treeNodes,
	error,
	pending,
	refresh,
} = await useAsyncData('knowledge-tree', async () => {
	return await useKnowledgeTreeLazy();
});

// Selected node state
const selectedNode = ref<KnowledgeTreeNode | null>(null);

// Action states
const showCreateFolderDialog = ref(false);
const showMoveDialog = ref(false);
const createFolderParent = ref<KnowledgeTreeNode | null>(null);
const nodeToMove = ref<KnowledgeTreeNode | null>(null);
const actionPending = ref(false);
const actionError = ref<string | null>(null);
const actionSuccess = ref<string | null>(null);

// Create folder form
const newFolderName = ref('');

// Move dialog state
const availableFolders = ref<KnowledgeDocument[]>([]);
const selectedTargetFolder = ref<number | null>(null);

// Handle node selection
function handleSelectNode(node: KnowledgeTreeNode) {
	selectedNode.value = node;
}

// Handle create folder action
function handleCreateFolder(parentNode: KnowledgeTreeNode | null) {
	createFolderParent.value = parentNode;
	newFolderName.value = '';
	showCreateFolderDialog.value = true;
	actionError.value = null;
	actionSuccess.value = null;
}

// Submit create folder
async function submitCreateFolder() {
	if (!newFolderName.value.trim()) {
		actionError.value = 'Folder name is required';
		return;
	}

	actionPending.value = true;
	actionError.value = null;
	actionSuccess.value = null;

	try {
		await createFolder({
			title: newFolderName.value.trim(),
			parent_document_id: createFolderParent.value?.id || null,
		});

		actionSuccess.value = `Folder "${newFolderName.value}" created successfully!`;
		showCreateFolderDialog.value = false;
		newFolderName.value = '';
		await refresh();

		// Clear success message after 3 seconds
		setTimeout(() => {
			actionSuccess.value = null;
		}, 3000);
	} catch (err: any) {
		actionError.value = err.message || 'Failed to create folder';
	} finally {
		actionPending.value = false;
	}
}

// Handle move action
async function handleMoveNode(node: KnowledgeTreeNode) {
	nodeToMove.value = node;
	actionError.value = null;
	actionSuccess.value = null;

	// Load available folders for move target
	try {
		const allDocs = await useKnowledgeDocumentsList({ is_folder: true });
		// Exclude the node itself and its descendants
		availableFolders.value = (allDocs || []).filter((doc) => doc.id !== node.id);
		selectedTargetFolder.value = node.parentId || null;
		showMoveDialog.value = true;
	} catch (err: any) {
		actionError.value = 'Failed to load folders';
	}
}

// Submit move
async function submitMove() {
	if (!nodeToMove.value) return;

	actionPending.value = true;
	actionError.value = null;
	actionSuccess.value = null;

	try {
		await moveNode({
			id: nodeToMove.value.id,
			parent_document_id: selectedTargetFolder.value,
		});

		actionSuccess.value = `"${nodeToMove.value.title}" moved successfully!`;
		showMoveDialog.value = false;
		nodeToMove.value = null;
		await refresh();

		// Clear success message after 3 seconds
		setTimeout(() => {
			actionSuccess.value = null;
		}, 3000);
	} catch (err: any) {
		actionError.value = err.message || 'Failed to move node';
	} finally {
		actionPending.value = false;
	}
}

// Cancel dialogs
function cancelCreateFolder() {
	showCreateFolderDialog.value = false;
	newFolderName.value = '';
	actionError.value = null;
}

function cancelMove() {
	showMoveDialog.value = false;
	nodeToMove.value = null;
	actionError.value = null;
}
</script>

<template>
	<div class="container mx-auto px-4 py-8">
		<!-- Header -->
		<div class="mb-8 flex items-center justify-between">
			<div>
				<h1 class="text-3xl font-bold text-gray-900 dark:text-white">Knowledge Tree</h1>
				<p class="mt-2 text-gray-600 dark:text-gray-400">
					Browse and manage your knowledge base in a hierarchical structure
				</p>
			</div>
			<div class="flex gap-3">
				<button
					class="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
					@click="handleCreateFolder(null)"
				>
					+ New Root Folder
				</button>
				<button
					class="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
					@click="refresh()"
				>
					Refresh
				</button>
			</div>
		</div>

		<!-- Success/Error Messages -->
		<div
			v-if="actionSuccess"
			class="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-4"
		>
			<p class="text-green-800 dark:text-green-200">✓ {{ actionSuccess }}</p>
		</div>

		<div
			v-if="actionError"
			class="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4"
		>
			<p class="text-red-800 dark:text-red-200">✗ {{ actionError }}</p>
		</div>

		<!-- Main Content -->
		<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
			<!-- Tree Panel -->
			<div class="lg:col-span-2">
				<div class="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
					<h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Document Tree</h2>

					<!-- Loading state -->
					<div v-if="pending" class="text-center py-12">
						<div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
						<p class="mt-2 text-gray-600 dark:text-gray-400">Loading tree...</p>
					</div>

					<!-- Error state -->
					<div
						v-else-if="error"
						class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4"
					>
						<p class="text-red-800 dark:text-red-200">Error loading tree: {{ error.message }}</p>
					</div>

					<!-- Empty state -->
					<div v-else-if="!treeNodes || treeNodes.length === 0" class="text-center py-12">
						<div class="text-gray-400 dark:text-gray-600 mb-4">
							<svg class="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
								/>
							</svg>
						</div>
						<h3 class="text-lg font-medium text-gray-900 dark:text-white">No documents yet</h3>
						<p class="mt-1 text-gray-500 dark:text-gray-400">Create your first folder to get started.</p>
					</div>

					<!-- Tree -->
					<div v-else class="overflow-auto max-h-[600px]">
						<KnowledgeTree
							:nodes="treeNodes"
							@select-node="handleSelectNode"
							@create-folder="handleCreateFolder"
							@move-node="handleMoveNode"
							@refresh="refresh"
						/>
					</div>
				</div>
			</div>

			<!-- Detail Panel -->
			<div class="lg:col-span-1">
				<div class="bg-white dark:bg-gray-800 shadow rounded-lg p-6 sticky top-4">
					<h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Details</h2>

					<div v-if="selectedNode" class="space-y-4">
						<div>
							<h3 class="text-base font-medium text-gray-900 dark:text-white">{{ selectedNode.title }}</h3>
							<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
								{{ selectedNode.isFolder ? 'Folder' : 'Document' }}
							</p>
						</div>

						<div v-if="selectedNode.slug">
							<dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Slug</dt>
							<dd class="mt-1 text-sm text-gray-900 dark:text-white">{{ selectedNode.slug }}</dd>
						</div>

						<div v-if="selectedNode.status">
							<dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Status</dt>
							<dd class="mt-1">
								<span
									class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
									:class="{
										'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400':
											selectedNode.status === 'published',
										'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400':
											selectedNode.status === 'draft',
										'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400':
											selectedNode.status === 'archived',
									}"
								>
									{{ selectedNode.status }}
								</span>
							</dd>
						</div>

						<div class="pt-4 border-t border-gray-200 dark:border-gray-700">
							<a
								v-if="!selectedNode.isFolder && selectedNode.slug"
								:href="`/knowledge/${selectedNode.slug}`"
								target="_blank"
								class="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 w-full justify-center"
							>
								View Document
								<svg class="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
									/>
								</svg>
							</a>
						</div>
					</div>

					<div v-else class="text-center py-8 text-gray-500 dark:text-gray-400">
						<p class="text-sm">Select a node to view details</p>
					</div>
				</div>
			</div>
		</div>

		<!-- Create Folder Dialog -->
		<div
			v-if="showCreateFolderDialog"
			class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50"
			@click.self="cancelCreateFolder"
		>
			<div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
				<h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Create New Folder</h3>

				<div class="mb-4">
					<label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
						Folder Name
						<span class="text-red-500">*</span>
					</label>
					<input
						v-model="newFolderName"
						type="text"
						class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-purple-500 focus:ring-purple-500"
						placeholder="Enter folder name"
						:disabled="actionPending"
						@keyup.enter="submitCreateFolder"
					/>
				</div>

				<div v-if="createFolderParent" class="mb-4 text-sm text-gray-600 dark:text-gray-400">
					<p>
						Parent:
						<span class="font-medium">{{ createFolderParent.title }}</span>
					</p>
				</div>

				<div class="flex gap-3 justify-end">
					<button
						class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
						:disabled="actionPending"
						@click="cancelCreateFolder"
					>
						Cancel
					</button>
					<button
						class="px-4 py-2 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
						:disabled="actionPending || !newFolderName.trim()"
						@click="submitCreateFolder"
					>
						{{ actionPending ? 'Creating...' : 'Create Folder' }}
					</button>
				</div>
			</div>
		</div>

		<!-- Move Dialog -->
		<div
			v-if="showMoveDialog"
			class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50"
			@click.self="cancelMove"
		>
			<div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
				<h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Move "{{ nodeToMove?.title }}"</h3>

				<div class="mb-4">
					<label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Target Folder</label>
					<select
						v-model="selectedTargetFolder"
						class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-purple-500 focus:ring-purple-500"
						:disabled="actionPending"
					>
						<option :value="null">Root (No parent)</option>
						<option v-for="folder in availableFolders" :key="folder.id" :value="folder.id">
							{{ folder.title }}
						</option>
					</select>
				</div>

				<div class="flex gap-3 justify-end">
					<button
						class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
						:disabled="actionPending"
						@click="cancelMove"
					>
						Cancel
					</button>
					<button
						class="px-4 py-2 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
						:disabled="actionPending"
						@click="submitMove"
					>
						{{ actionPending ? 'Moving...' : 'Move' }}
					</button>
				</div>
			</div>
		</div>
	</div>
</template>
