<script setup lang="ts">
import * as Diff from 'diff';
import { computed } from 'vue';

const props = defineProps({
	oldText: {
		type: String,
		default: '',
	},
	newText: {
		type: String,
		default: '',
	},
	oldLabel: {
		type: String,
		default: 'Previous',
	},
	newLabel: {
		type: String,
		default: 'Current',
	},
	mode: {
		type: String as PropType<'words' | 'lines' | 'chars'>,
		default: 'words',
	},
});

const diffParts = computed(() => {
	// If texts are identical, return one part with no changes
	if (props.oldText === props.newText) {
		return [{ value: props.newText, count: 0, added: undefined, removed: undefined }];
	}

	if (props.mode === 'lines') {
		return Diff.diffLines(props.oldText, props.newText);
	} else if (props.mode === 'chars') {
		return Diff.diffChars(props.oldText, props.newText);
	}

	// Default to words
	return Diff.diffWords(props.oldText, props.newText);
});

const hasChanges = computed(() => {
	return props.oldText !== props.newText;
});
</script>

<template>
	<div class="knowledge-diff border rounded-lg overflow-hidden bg-white dark:bg-gray-800">
		<!-- Header -->
		<div
			class="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600"
		>
			<div class="flex items-center gap-4 text-sm">
				<div class="flex items-center gap-2">
					<span class="w-3 h-3 bg-red-100 border border-red-200 rounded-sm"></span>
					<span class="text-gray-600 dark:text-gray-300">{{ oldLabel }}</span>
				</div>
				<div class="flex items-center gap-2">
					<span class="w-3 h-3 bg-green-100 border border-green-200 rounded-sm"></span>
					<span class="text-gray-600 dark:text-gray-300">{{ newLabel }}</span>
				</div>
			</div>
			<div v-if="!hasChanges" class="text-xs text-gray-500 italic">No changes detected</div>
		</div>

		<!-- Diff Content -->
		<div class="p-4 font-mono text-sm leading-relaxed whitespace-pre-wrap break-words">
			<template v-for="(part, index) in diffParts" :key="index">
				<span
					v-if="part.added"
					class="bg-green-100 text-green-900 dark:bg-green-900/30 dark:text-green-100 px-0.5 rounded-sm decoration-clone"
				>
					{{ part.value }}
				</span>
				<span
					v-else-if="part.removed"
					class="bg-red-100 text-red-900 dark:bg-red-900/30 dark:text-red-100 line-through decoration-red-500 px-0.5 rounded-sm opacity-70 decoration-clone"
				>
					{{ part.value }}
				</span>
				<span v-else class="text-gray-800 dark:text-gray-200">{{ part.value }}</span>
			</template>
		</div>
	</div>
</template>
