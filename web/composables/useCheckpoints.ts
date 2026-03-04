/**
 * Composable for managing task checkpoints (M-001 v2 — 3-tier checkpoint system)
 * Provides data access + progress calculation grouped by layer (L0/L1/L2)
 */

import { readItems, createItem, updateItem } from '@directus/sdk';
import type { TaskCheckpoint, CheckpointLayer, CheckpointStatus, LayerProgress } from '~/types/checkpoints';
import { LAYER_META } from '~/types/checkpoints';

/**
 * Fetch checkpoints for a task
 */
export async function useCheckpointsList(taskId: number | string) {
	return await useDirectus<TaskCheckpoint[]>(
		readItems('task_checkpoints', {
			filter: { task_id: { _eq: taskId } },
			fields: ['id', 'task_id', 'checkpoint_key', 'layer', 'status', 'verified_by', 'comment_id', 'workflow_step_id', 'date_created', 'date_updated'],
			sort: ['layer', 'checkpoint_key'],
			limit: 100,
		}),
	);
}

/**
 * Create a new checkpoint
 */
export async function createCheckpoint(data: {
	task_id: number | string;
	checkpoint_key: string;
	layer: CheckpointLayer;
	status?: CheckpointStatus;
	verified_by?: string;
}) {
	return await useDirectus<TaskCheckpoint>(
		createItem('task_checkpoints', {
			...data,
			status: data.status || 'pending',
		}),
	);
}

/**
 * Update a checkpoint's status
 */
export async function updateCheckpointStatus(id: number, status: CheckpointStatus, verifiedBy?: string) {
	const updates: Record<string, any> = { status };
	if (verifiedBy) updates.verified_by = verifiedBy;
	return await useDirectus<TaskCheckpoint>(updateItem('task_checkpoints', id, updates));
}

/**
 * Group checkpoints by layer and calculate progress
 */
function buildLayerProgress(checkpoints: TaskCheckpoint[]): LayerProgress[] {
	const layers: CheckpointLayer[] = ['L0', 'L1', 'L2'];

	return layers.map((layer) => {
		const items = checkpoints.filter((c) => c.layer === layer);
		const passed = items.filter((c) => c.status === 'passed').length;
		const failed = items.filter((c) => c.status === 'failed').length;
		const pending = items.filter((c) => c.status === 'pending' || c.status === 'skipped').length;
		const total = items.length;

		return {
			layer,
			label: LAYER_META[layer].label,
			total,
			passed,
			failed,
			pending,
			percent: total > 0 ? Math.round((passed / total) * 100) : 0,
			complete: total > 0 && passed === total,
			checkpoints: items,
		};
	});
}

/**
 * Reactive composable for checkpoint panel
 */
export function useCheckpoints(taskId: Ref<number | string>) {
	const key = computed(() => `checkpoints-${taskId.value}`);

	const {
		data: checkpoints,
		refresh,
		pending: loading,
		error,
	} = useAsyncData(
		key.value,
		async () => useCheckpointsList(taskId.value),
		{ watch: [taskId] },
	);

	const layers = computed<LayerProgress[]>(() => {
		return buildLayerProgress(checkpoints.value || []);
	});

	const overallProgress = computed(() => {
		const all = checkpoints.value || [];
		const total = all.length;
		const passed = all.filter((c) => c.status === 'passed').length;
		return {
			total,
			passed,
			percent: total > 0 ? Math.round((passed / total) * 100) : 0,
		};
	});

	return { checkpoints, layers, overallProgress, loading, error, refresh };
}
