/**
 * Composable for per-step checkpoint management (M-002 GOV-UX)
 * Each workflow step gets a single "step_complete" checkpoint (L0 layer).
 * Actor-agnostic: any user can tick the checkbox.
 */

import { readItems, createItem, updateItem } from '@directus/sdk';
import type { TaskCheckpoint, CheckpointStatus } from '~/types/checkpoints';

const STEP_CHECKPOINT_KEY = 'step_complete';

export function useStepCheckpoints(taskId: Ref<number | string>, stepIds: Ref<number[]>) {
	const key = computed(() => `step-checkpoints-${taskId.value}`);

	const {
		data: checkpoints,
		refresh,
		pending: loading,
	} = useAsyncData(
		key.value,
		async () => {
			if (!taskId.value || !stepIds.value.length) return [];
			return await useDirectus<TaskCheckpoint[]>(
				readItems('task_checkpoints', {
					filter: {
						task_id: { _eq: taskId.value },
						workflow_step_id: { _in: stepIds.value },
						checkpoint_key: { _eq: STEP_CHECKPOINT_KEY },
					},
					fields: ['id', 'task_id', 'checkpoint_key', 'layer', 'status', 'workflow_step_id', 'date_updated'],
					limit: -1,
				}),
			);
		},
		{ watch: [taskId, stepIds] },
	);

	const stepStatusMap = computed<Map<number, CheckpointStatus>>(() => {
		const map = new Map<number, CheckpointStatus>();
		for (const cp of checkpoints.value || []) {
			if (cp.workflow_step_id != null) {
				map.set(cp.workflow_step_id, cp.status);
			}
		}
		return map;
	});

	async function toggleStepComplete(stepId: number) {
		const existing = (checkpoints.value || []).find((c) => c.workflow_step_id === stepId);

		if (existing) {
			const newStatus: CheckpointStatus = existing.status === 'passed' ? 'pending' : 'passed';
			await useDirectus(updateItem('task_checkpoints', existing.id, { status: newStatus }));
		} else {
			await useDirectus(
				createItem('task_checkpoints', {
					task_id: taskId.value,
					checkpoint_key: STEP_CHECKPOINT_KEY,
					layer: 'L0',
					status: 'passed',
					workflow_step_id: stepId,
				}),
			);
		}

		await refresh();
	}

	return { stepStatusMap, toggleStepComplete, refresh, loading };
}
