<script setup lang="ts">
/**
 * Comment Module M-001 — Entry Point
 * Module Protocol Standard compliant
 *
 * Usage:
 *   <!-- Flat list (backward compatible) -->
 *   <ModulesCommentModuleCommentModule :task-id="4" />
 *
 *   <!-- Fixed tab scope -->
 *   <ModulesCommentModuleCommentModule :task-id="4" tab-scope="planning" />
 *
 *   <!-- Inline tab bar -->
 *   <ModulesCommentModuleCommentModule :task-id="4" :tabs="TAB_DEFINITIONS" default-tab="targets" />
 *
 *   <!-- Custom subset of tabs -->
 *   <ModulesCommentModuleCommentModule :task-id="4" :tabs="[{ key: 'planning', label: 'Planning' }]" />
 *
 * Slots (v2 readiness):
 *   #header  — Override title area
 *   #empty   — Override empty state
 *   #input   — Override input area
 */
import type { AgentType, CommentAction, TabScope } from '~/types/tasks';
import type { CommentModuleProps } from './types';
import { useComments } from './composables/useComments';

const props = withDefaults(defineProps<CommentModuleProps>(), {
	tabScope: undefined,
	readonly: false,
	title: 'Discussion',
	tabs: undefined,
	defaultTab: undefined,
});

const emit = defineEmits<{
	'comment-added': [comment: any];
}>();

// Internal active tab state (only used when tabs prop is provided)
const activeTab = ref<string>(props.defaultTab || props.tabs?.[0]?.key || '');

// Effective tab scope: tabs mode uses internal state, otherwise uses prop
const effectiveTabScope = computed<TabScope | undefined>(() => {
	if (props.tabs?.length) return activeTab.value as TabScope;
	return props.tabScope;
});

// Convert to refs for composable
const taskIdRef = computed(() => props.taskId);

const { comments, refresh, pending, addComment } = useComments(taskIdRef, effectiveTabScope);

async function handleSubmit(payload: { agent_type: AgentType; content: string; action?: CommentAction }) {
	const created = await addComment(payload);
	emit('comment-added', created);
}

function selectTab(key: string) {
	activeTab.value = key;
}
</script>

<template>
	<div class="rounded-lg bg-white shadow dark:bg-gray-800">
		<!-- Header -->
		<div class="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
			<slot name="header">
				<div class="flex items-center justify-between">
					<h3 class="text-base font-semibold text-gray-900 dark:text-white">
						{{ title }}
					</h3>
					<span
						v-if="comments?.length"
						class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-400"
					>
						{{ comments.length }}
					</span>
				</div>
			</slot>
		</div>

		<!-- Tab Bar (only when tabs prop is provided) -->
		<div v-if="tabs?.length" class="border-b border-gray-200 dark:border-gray-700">
			<nav class="flex overflow-x-auto px-4" aria-label="Comment tabs">
				<button
					v-for="tab in tabs"
					:key="tab.key"
					class="flex-shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors"
					:class="activeTab === tab.key
						? 'border-blue-500 text-blue-600 dark:text-blue-400'
						: 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'"
					@click="selectTab(tab.key)"
				>
					<span v-if="tab.icon" class="mr-1">{{ tab.icon }}</span>
					{{ tab.label }}
				</button>
			</nav>
		</div>

		<!-- Thread -->
		<div class="px-4 py-3">
			<ModulesCommentModuleCommentThread
				:comments="comments || []"
				:pending="pending"
			>
				<template #empty>
					<slot name="empty">
						<p class="text-sm text-gray-400">No messages yet.</p>
					</slot>
				</template>
			</ModulesCommentModuleCommentThread>
		</div>

		<!-- Input -->
		<div v-if="!readonly" class="px-4 pb-4">
			<slot name="input">
				<ModulesCommentModuleCommentInput @submit="handleSubmit" />
			</slot>
		</div>
	</div>
</template>
