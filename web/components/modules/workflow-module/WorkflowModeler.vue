<script setup lang="ts">
/**
 * Workflow Module M-002 — BPMN Modeler (full editor)
 * Module Protocol Standard compliant
 *
 * Usage:
 *   <ModulesWorkflowModuleWorkflowModeler :workflow-id="1" />
 *   <ModulesWorkflowModuleWorkflowModeler :workflow-id="1" height="700px" />
 */

import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css';

import { saveWorkflow } from '~/composables/useWorkflows';

const props = withDefaults(
	defineProps<{
		workflowId: number | string;
		height?: string;
	}>(),
	{ height: '600px' },
);

const emit = defineEmits<{
	'workflow-saved': [workflow: { id: number | string }];
	'annotation-added': [payload: { elementId: string; annotationText: string; workflowId: number | string }];
}>();

const workflowIdRef = computed(() => props.workflowId);
const { workflow, bpmnXml, dslAvailable, stepCount, loading, error } = useWorkflow(workflowIdRef);

const containerRef = ref<HTMLDivElement>();
const modelerError = ref<string>();
const saving = ref(false);
const dirty = ref(false);
const canUndo = ref(false);
const canRedo = ref(false);
let modeler: any = null;

async function initModeler(xml: string) {
	if (!containerRef.value || !xml) return;

	const { default: BpmnModeler } = await import('bpmn-js/lib/Modeler');

	if (modeler) {
		modeler.destroy();
	}

	modeler = new BpmnModeler({ container: containerRef.value });

	try {
		await modeler.importXML(xml);
		modeler.get('canvas').zoom('fit-viewport');
		modelerError.value = undefined;
		dirty.value = false;

		// Track changes + undo/redo state
		const eventBus = modeler.get('eventBus');
		const commandStack = modeler.get('commandStack');

		eventBus.on('commandStack.changed', () => {
			dirty.value = true;
			canUndo.value = commandStack.canUndo();
			canRedo.value = commandStack.canRedo();
		});

		// Detect text annotation additions
		eventBus.on('shape.added', (event: any) => {
			const element = event.element;

			if (element.type === 'bpmn:TextAnnotation') {
				// Defer to let BPMN modeler finalize the element
				nextTick(() => {
					const bo = element.businessObject;
					const text = bo?.text || '';

					if (text) {
						emit('annotation-added', {
							elementId: element.id,
							annotationText: text,
							workflowId: props.workflowId,
						});
					}
				});
			}
		});

		// Also detect annotation text changes (user edits after creation)
		eventBus.on('element.changed', (event: any) => {
			const element = event.element;

			if (element.type === 'bpmn:TextAnnotation') {
				const bo = element.businessObject;
				const text = bo?.text || '';

				if (text) {
					emit('annotation-added', {
						elementId: element.id,
						annotationText: text,
						workflowId: props.workflowId,
					});
				}
			}
		});
	} catch (err: any) {
		modelerError.value = err.message || 'Failed to load BPMN diagram';
	}
}

function handleUndo() {
	if (modeler) modeler.get('commandStack').undo();
}

function handleRedo() {
	if (modeler) modeler.get('commandStack').redo();
}

async function handleSave() {
	if (!modeler || saving.value) return;

	if (dslAvailable.value) {
		modelerError.value =
			'This workflow is governed by DSL. Submit a workflow change request instead of saving BPMN XML directly.';

		return;
	}

	saving.value = true;

	try {
		const { xml } = await modeler.saveXML({ format: true });
		await saveWorkflow(props.workflowId, xml);
		dirty.value = false;
		emit('workflow-saved', { id: props.workflowId });
	} catch (err: any) {
		modelerError.value = err.message || 'Failed to save workflow';
	} finally {
		saving.value = false;
	}
}

watch(bpmnXml, (xml) => {
	if (xml) initModeler(xml);
});

onMounted(() => {
	if (bpmnXml.value) initModeler(bpmnXml.value);
});

onBeforeUnmount(() => {
	if (modeler) {
		modeler.destroy();
		modeler = null;
	}
});
</script>

<template>
	<div class="rounded-lg bg-white shadow dark:bg-gray-800">
		<!-- Header -->
		<div class="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
			<div class="flex items-center justify-between">
				<h3 class="text-base font-semibold text-gray-900 dark:text-white">
					{{ workflow?.title || 'Workflow Editor' }}
				</h3>
				<div class="flex items-center gap-2">
					<button
						:disabled="!canUndo"
						class="rounded px-2 py-1 text-xs text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30 dark:text-gray-400 dark:hover:bg-gray-700"
						title="Undo (Ctrl+Z)"
						@click="handleUndo"
					>
						Undo
					</button>
					<button
						:disabled="!canRedo"
						class="rounded px-2 py-1 text-xs text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30 dark:text-gray-400 dark:hover:bg-gray-700"
						title="Redo (Ctrl+Y)"
						@click="handleRedo"
					>
						Redo
					</button>
					<span v-if="dirty" class="text-xs text-amber-600 dark:text-amber-400">Unsaved changes</span>
					<button
						:disabled="dslAvailable || !dirty || saving"
						class="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
						@click="handleSave"
					>
						{{ saving ? 'Saving...' : 'Save' }}
					</button>
				</div>
			</div>
			<p v-if="dslAvailable" class="mt-2 text-xs text-amber-600 dark:text-amber-400">
				Workflow is running in DSL governance mode. {{ stepCount }} DSL steps loaded; BPMN edits are view-only until a
				WCR is approved.
			</p>
		</div>

		<!-- Loading -->
		<div v-if="loading" class="flex items-center justify-center" :style="{ height }">
			<div class="text-center">
				<div class="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
				<p class="mt-2 text-sm text-gray-500">Loading editor...</p>
			</div>
		</div>

		<!-- Error -->
		<div v-else-if="error || modelerError" class="p-4">
			<p class="text-sm text-red-600 dark:text-red-400">
				{{ modelerError || error?.message || 'Failed to load workflow' }}
			</p>
		</div>

		<!-- BPMN Modeler Canvas -->
		<ClientOnly>
			<div
				v-show="!loading && !error && bpmnXml"
				ref="containerRef"
				class="bpmn-modeler-container"
				:style="{ height }"
			/>
		</ClientOnly>
	</div>
</template>

<style scoped>
.bpmn-modeler-container {
	width: 100%;
}

.bpmn-modeler-container :deep(.bjs-powered-by) {
	display: none;
}

/* Dark mode: palette sidebar */
:root.dark .bpmn-modeler-container :deep(.djs-palette) {
	background: #1f2937;
	border-color: #374151;
}

:root.dark .bpmn-modeler-container :deep(.djs-palette .entry:hover) {
	background: #374151;
}

/* Dark mode: context pad (element actions popup) */
:root.dark .bpmn-modeler-container :deep(.djs-context-pad) {
	background: #1f2937;
	border-color: #374151;
}

:root.dark .bpmn-modeler-container :deep(.djs-context-pad .entry:hover) {
	background: #374151;
}

/* Dark mode: popup menu (element type selector) */
:root.dark .bpmn-modeler-container :deep(.djs-popup) {
	background: #1f2937;
	border-color: #374151;
	color: #e5e7eb;
}

:root.dark .bpmn-modeler-container :deep(.djs-popup .entry:hover) {
	background: #374151;
}

/* Dark mode: direct editing overlay */
:root.dark .bpmn-modeler-container :deep(.djs-direct-editing-parent) {
	background: #1f2937;
	color: #e5e7eb;
	border-color: #3b82f6;
}

/* Dark mode: canvas background */
:root.dark .bpmn-modeler-container :deep(.bjs-container) {
	background: #111827;
}

/* Dark mode: SVG elements */
:root.dark .bpmn-modeler-container :deep(.djs-element .djs-visual > :is(rect, circle, polygon, path)) {
	stroke: #9ca3af;
}

:root.dark .bpmn-modeler-container :deep(.djs-element .djs-visual text) {
	fill: #e5e7eb;
}
</style>
