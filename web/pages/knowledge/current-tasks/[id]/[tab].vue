<script setup lang="ts">
import { markdownToHtml } from '~/utils/markdown';
import type { Task, TabScope } from '~/types/tasks';
import { TAB_CONFIG } from '~/types/tasks';

const route = useRoute();
const taskId = route.params.id as string;
const tabKey = computed(() => route.params.tab as TabScope);

// Get task from parent layout (with safe defaults)
const task = inject<Ref<Task | null>>('task', ref(null));

// Find current tab config
const currentTab = computed(() => TAB_CONFIG.find((t) => t.key === tabKey.value));

// Get markdown content for current tab
const tabContent = computed(() => {
	if (!task?.value || !currentTab.value) return '';
	return (task.value[currentTab.value.field] as string) || '';
});

const renderedContent = computed(() => {
	if (!tabContent.value) return '';
	try {
		return markdownToHtml(tabContent.value);
	} catch {
		return `<pre>${tabContent.value}</pre>`;
	}
});
</script>

<template>
	<div class="space-y-6">
		<!-- Tab Content -->
		<div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
			<h2 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
				{{ currentTab?.label || tabKey }}
			</h2>

			<div v-if="renderedContent">
				<TypographyProse :content="renderedContent" size="sm" />
			</div>
			<div v-else class="py-8 text-center text-gray-400 dark:text-gray-500">
				<p>No content for this tab yet.</p>
			</div>
		</div>

		<!-- Feedback Stream — reusable CommentModule -->
		<ModulesCommentModuleCommentModule :task-id="taskId" :tab-scope="tabKey" title="Feedback" />
	</div>
</template>
