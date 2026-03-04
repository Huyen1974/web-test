<script setup lang="ts">
/**
 * Workflow Module M-002 — BPMN Viewer (Enhanced)
 * Module Protocol Standard compliant
 *
 * Features: node coloring by type, fit-viewport, zoom controls, pan
 */

import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css';

const props = withDefaults(
	defineProps<{
		workflowId: number | string;
		height?: string;
	}>(),
	{ height: '600px' },
);

const emit = defineEmits<{
	'workflow-loaded': [workflow: { id: number; title: string }];
}>();

const workflowIdRef = computed(() => props.workflowId);
const { workflow, bpmnXml, dslSource, dslAvailable, stepCount, loading, error } = useWorkflow(workflowIdRef);

const containerRef = ref<HTMLDivElement>();
const viewerError = ref<string>();
let viewer: any = null;

function colorizeElements() {
	if (!viewer) return;
	const elementRegistry = viewer.get('elementRegistry');
	const canvas = viewer.get('canvas');

	elementRegistry.forEach((element: any) => {
		const bo = element.businessObject;
		if (!bo || !bo.$type) return;

		const type = bo.$type;
		let marker = '';

		if (type === 'bpmn:StartEvent') marker = 'bpmn-start';
		else if (type === 'bpmn:EndEvent') marker = 'bpmn-end';
		else if (type === 'bpmn:UserTask') marker = 'bpmn-user-task';
		else if (type === 'bpmn:ServiceTask') marker = 'bpmn-service-task';
		else if (type === 'bpmn:Task') marker = 'bpmn-task';
		else if (type === 'bpmn:ExclusiveGateway' || type === 'bpmn:ParallelGateway' || type === 'bpmn:InclusiveGateway') marker = 'bpmn-gateway';
		else if (type === 'bpmn:IntermediateCatchEvent' || type === 'bpmn:IntermediateThrowEvent') marker = 'bpmn-intermediate';

		if (marker) {
			canvas.addMarker(element.id, marker);
		}
	});
}

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
		colorizeElements();
		viewerError.value = undefined;
	} catch (err: any) {
		viewerError.value = err.message || 'Không thể hiển thị sơ đồ BPMN';
	}
}

function zoomIn() { viewer?.get('canvas')?.zoom(viewer.get('canvas').zoom() * 1.2); }
function zoomOut() { viewer?.get('canvas')?.zoom(viewer.get('canvas').zoom() / 1.2); }
function fitViewport() { viewer?.get('canvas')?.zoom('fit-viewport'); }

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
				<div class="flex items-center gap-3">
					<h3 class="text-base font-semibold text-gray-900 dark:text-white">
						{{ workflow?.title || 'Sơ đồ quy trình' }}
					</h3>
					<span
						v-if="dslAvailable"
						class="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
					>
						DSL SSOT
					</span>
				</div>
				<div class="flex items-center gap-1">
					<button
						class="rounded p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
						title="Thu nhỏ"
						@click="zoomOut"
					>
						<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" /></svg>
					</button>
					<button
						class="rounded p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
						title="Vừa màn hình"
						@click="fitViewport"
					>
						<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
					</button>
					<button
						class="rounded p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
						title="Phóng to"
						@click="zoomIn"
					>
						<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
					</button>
				</div>
			</div>
			<p v-if="dslAvailable" class="mt-1 text-xs text-gray-500 dark:text-gray-400">
				Nguồn: {{ dslSource === 'dsl' ? 'workflow_steps + relations' : 'BPMN cache' }} · {{ stepCount }} bước
			</p>
		</div>

		<!-- Loading -->
		<div v-if="loading" class="flex items-center justify-center" :style="{ height }">
			<div class="text-center">
				<div class="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
				<p class="mt-2 text-sm text-gray-500">Đang tải sơ đồ...</p>
			</div>
		</div>

		<!-- Error -->
		<div v-else-if="error || viewerError" class="p-4">
			<p class="text-sm text-red-600 dark:text-red-400">
				{{ viewerError || error?.message || 'Không tải được quy trình' }}
			</p>
		</div>

		<!-- BPMN Canvas -->
		<ClientOnly>
			<div v-show="!loading && !error && bpmnXml" ref="containerRef" class="bpmn-container" :style="{ height }" />
		</ClientOnly>

		<!-- Legend -->
		<div v-if="!loading && !error && bpmnXml" class="flex flex-wrap gap-3 border-t border-gray-200 px-4 py-2 text-xs dark:border-gray-700">
			<span class="flex items-center gap-1"><span class="inline-block h-3 w-3 rounded-full bg-emerald-500"></span> Bắt đầu</span>
			<span class="flex items-center gap-1"><span class="inline-block h-3 w-3 rounded-full bg-red-500"></span> Kết thúc</span>
			<span class="flex items-center gap-1"><span class="inline-block h-3 w-3 rounded-sm bg-blue-500"></span> Người dùng</span>
			<span class="flex items-center gap-1"><span class="inline-block h-3 w-3 rounded-sm bg-violet-500"></span> Hệ thống</span>
			<span class="flex items-center gap-1"><span class="inline-block h-3 w-3 rotate-45 bg-amber-500"></span> Quyết định</span>
			<span class="flex items-center gap-1"><span class="inline-block h-3 w-3 rounded-sm bg-sky-500"></span> Công việc</span>
		</div>
	</div>
</template>

<style scoped>
.bpmn-container {
	width: 100%;
}

.bpmn-container :deep(.bjs-powered-by) {
	display: none;
}

/* ─── Node coloring by type ─── */

/* Start Event: green */
.bpmn-container :deep(.bpmn-start .djs-visual > circle) {
	stroke: #059669 !important;
	stroke-width: 3px !important;
	fill: #d1fae5 !important;
}

/* End Event: red */
.bpmn-container :deep(.bpmn-end .djs-visual > circle) {
	stroke: #dc2626 !important;
	stroke-width: 4px !important;
	fill: #fee2e2 !important;
}

/* User Task: blue */
.bpmn-container :deep(.bpmn-user-task .djs-visual > rect) {
	stroke: #2563eb !important;
	stroke-width: 2px !important;
	fill: #dbeafe !important;
}

/* Service Task: violet */
.bpmn-container :deep(.bpmn-service-task .djs-visual > rect) {
	stroke: #7c3aed !important;
	stroke-width: 2px !important;
	fill: #ede9fe !important;
}

/* Generic Task: sky */
.bpmn-container :deep(.bpmn-task .djs-visual > rect) {
	stroke: #0284c7 !important;
	stroke-width: 2px !important;
	fill: #e0f2fe !important;
}

/* Gateway: amber */
.bpmn-container :deep(.bpmn-gateway .djs-visual > polygon) {
	stroke: #d97706 !important;
	stroke-width: 2px !important;
	fill: #fef3c7 !important;
}

/* Intermediate Event: orange */
.bpmn-container :deep(.bpmn-intermediate .djs-visual > circle) {
	stroke: #ea580c !important;
	stroke-width: 2px !important;
	fill: #ffedd5 !important;
}

/* Labels: larger, readable */
.bpmn-container :deep(.djs-element .djs-visual text) {
	font-size: 13px !important;
	font-family: 'Inter', system-ui, sans-serif !important;
}

/* Sequence flow arrows */
.bpmn-container :deep(.djs-connection .djs-visual > path) {
	stroke: #6b7280 !important;
	stroke-width: 1.5px !important;
}

.bpmn-container :deep(.djs-connection .djs-visual > path[marker-end]) {
	stroke: #374151 !important;
}

/* ─── Dark mode overrides ─── */
:root.dark .bpmn-container :deep(.bjs-container) {
	background: #111827;
}

:root.dark .bpmn-container :deep(.bpmn-start .djs-visual > circle) {
	fill: #064e3b !important;
	stroke: #34d399 !important;
}

:root.dark .bpmn-container :deep(.bpmn-end .djs-visual > circle) {
	fill: #450a0a !important;
	stroke: #f87171 !important;
}

:root.dark .bpmn-container :deep(.bpmn-user-task .djs-visual > rect) {
	fill: #1e3a5f !important;
	stroke: #60a5fa !important;
}

:root.dark .bpmn-container :deep(.bpmn-service-task .djs-visual > rect) {
	fill: #2e1065 !important;
	stroke: #a78bfa !important;
}

:root.dark .bpmn-container :deep(.bpmn-task .djs-visual > rect) {
	fill: #0c4a6e !important;
	stroke: #38bdf8 !important;
}

:root.dark .bpmn-container :deep(.bpmn-gateway .djs-visual > polygon) {
	fill: #451a03 !important;
	stroke: #fbbf24 !important;
}

:root.dark .bpmn-container :deep(.bpmn-intermediate .djs-visual > circle) {
	fill: #431407 !important;
	stroke: #fb923c !important;
}

:root.dark .bpmn-container :deep(.djs-element .djs-visual text) {
	fill: #e5e7eb !important;
}

:root.dark .bpmn-container :deep(.djs-connection .djs-visual > path) {
	stroke: #9ca3af !important;
}
</style>
