<script setup lang="ts">
/**
 * Comment Module M-001 — CommentThread
 * Chat-style message thread with emoji avatars, agent labels, timestamps
 */
import type { TaskComment } from '~/types/tasks';
import { getAgentDisplay, getActionDisplay, getColorClasses } from './types';

const props = defineProps<{
	comments: TaskComment[];
	pending?: boolean;
}>();

const threadEl = ref<HTMLElement | null>(null);

// Reverse: API returns newest-first, chat shows newest at bottom
const orderedComments = computed(() => {
	if (!props.comments?.length) return [];
	return [...props.comments].reverse();
});

function formatTime(dateStr?: string): string {
	if (!dateStr) return '';
	const date = new Date(dateStr);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffMin = Math.floor(diffMs / 60000);
	if (diffMin < 1) return 'just now';
	if (diffMin < 60) return `${diffMin}m ago`;
	const diffHr = Math.floor(diffMin / 60);
	if (diffHr < 24) return `${diffHr}h ago`;
	return date.toLocaleDateString();
}

function scrollToBottom() {
	nextTick(() => {
		if (threadEl.value) {
			threadEl.value.scrollTop = threadEl.value.scrollHeight;
		}
	});
}

watch(() => props.comments?.length, () => scrollToBottom());
onMounted(() => scrollToBottom());
</script>

<template>
	<div ref="threadEl" class="max-h-[500px] space-y-3 overflow-y-auto p-1">
		<!-- Loading -->
		<div v-if="pending" class="flex items-center justify-center py-6">
			<span class="inline-block h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
			<span class="ml-2 text-sm text-gray-400">Loading...</span>
		</div>

		<!-- Empty -->
		<div v-else-if="!orderedComments.length" class="py-8 text-center">
			<slot name="empty">
				<p class="text-sm text-gray-400 dark:text-gray-500">No messages yet. Start the conversation.</p>
			</slot>
		</div>

		<!-- Chat Messages -->
		<div
			v-for="comment in orderedComments"
			:key="comment.id"
			class="flex items-start gap-3"
		>
			<!-- Emoji Avatar -->
			<div
				class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-base"
				:class="getColorClasses(getAgentDisplay(comment.agent_type).color).avatar"
			>
				{{ getAgentDisplay(comment.agent_type).emoji }}
			</div>

			<!-- Message Body -->
			<div class="min-w-0 flex-1">
				<!-- Header: agent name, time, action badge -->
				<div class="flex flex-wrap items-center gap-2">
					<span
						class="text-sm font-semibold"
						:class="getColorClasses(getAgentDisplay(comment.agent_type).color).name"
					>
						{{ getAgentDisplay(comment.agent_type).label }}
					</span>
					<span class="text-xs text-gray-400">{{ formatTime(comment.date_created) }}</span>
					<span
						v-if="comment.action && getActionDisplay(comment.action)"
						class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
						:class="getColorClasses(getActionDisplay(comment.action)!.color).badge"
					>
						{{ getActionDisplay(comment.action)!.emoji }} {{ getActionDisplay(comment.action)!.label }}
					</span>
				</div>

				<!-- Content -->
				<p class="mt-1 whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
					{{ comment.content }}
				</p>
			</div>
		</div>
	</div>
</template>
