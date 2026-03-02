<script setup lang="ts">
/**
 * Workflow Module M-002 — BPMN Viewer
 * Module Protocol Standard compliant
 *
 * Usage:
 *   <ModulesWorkflowModuleWorkflowViewer :workflow-id="1" />
 *   <ModulesWorkflowModuleWorkflowViewer :workflow-id="1" height="600px" />
 */

import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css';

const props = withDefaults(
	defineProps<{
		workflowId: number | string;
		height?: string;
	}>(),
	{ height: '500px' },
);

const emit = defineEmits<{
	'workflow-loaded': [workflow: { id: number; title: string }];
}>();

const workflowIdRef = computed(() => props.workflowId);
const { workflow, bpmnXml, loading, error } = useWorkflow(workflowIdRef);

const containerRef = ref<HTMLDivElement>();
const viewerError = ref<string>();
let viewer: any = null;

async function renderDiagram(xml: string) {
	if (!containerRef.value || !xml) return;

	const { default: BpmnViewer } = await import('bpmn-js/lib/NavigatedViewer');

	if (viewer) {
		viewer.destroy();
	}

	viewer = new BpmnViewer({ container: containerRef.value });

	try {
		await viewer.importXML(xml);
		viewer.get('canvas').zoom('fit-viewport');
		viewerError.value = undefined;
	} catch (err: any) {
		viewerError.value = err.message || 'Failed to render BPMN diagram';
	}
}

watch(bpmnXml, (xml) => {
	if (xml) renderDiagram(xml);
});

watch(workflow, (wf) => {
	if (wf) emit('workflow-loaded', { id: wf.id, title: wf.title });
});

onMounted(() => {
	if (bpmnXml.value) renderDiagram(bpmnXml.value);
});

onBeforeUnmount(() => {
	if (viewer) {
		viewer.destroy();
		viewer = null;
	}
});
</script>

<template>
	<div class="rounded-lg bg-white shadow dark:bg-gray-800">
		<!-- Header -->
		<div class="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
			<div class="flex items-center justify-between">
				<h3 class="text-base font-semibold text-gray-900 dark:text-white">
					{{ workflow?.title || 'Workflow' }}
				</h3>
				<span
					v-if="workflow?.status"
					class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-400"
				>
					{{ workflow.status }}
				</span>
			</div>
		</div>

		<!-- Loading -->
		<div v-if="loading" class="flex items-center justify-center" :style="{ height }">
			<div class="text-center">
				<div class="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
				<p class="mt-2 text-sm text-gray-500">Loading workflow...</p>
			</div>
		</div>

		<!-- Error -->
		<div v-else-if="error || viewerError" class="p-4">
			<p class="text-sm text-red-600 dark:text-red-400">
				{{ viewerError || error?.message || 'Failed to load workflow' }}
			</p>
		</div>

		<!-- BPMN Canvas -->
		<ClientOnly>
			<div
				v-show="!loading && !error && bpmnXml"
				ref="containerRef"
				class="bpmn-container"
				:style="{ height }"
			/>
		</ClientOnly>
	</div>
</template>

<style scoped>
.bpmn-container {
	width: 100%;
}

.bpmn-container :deep(.bjs-powered-by) {
	display: none;
}
</style>
