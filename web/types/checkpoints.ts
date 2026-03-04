/**
 * Type definitions for task_checkpoints collection (M-001 v2 Checkpoint 3 tầng)
 * Schema created by dot-schema-checkpoints-ensure
 */

export type CheckpointLayer = 'L0' | 'L1' | 'L2';
export type CheckpointStatus = 'pending' | 'passed' | 'failed' | 'skipped';

export interface TaskCheckpoint {
	id: number;
	task_id: number;
	checkpoint_key: string;
	layer: CheckpointLayer;
	status: CheckpointStatus;
	verified_by?: string;
	comment_id?: number;
	workflow_step_id?: number | null;
	date_created?: string;
	date_updated?: string;
}

export interface LayerProgress {
	layer: CheckpointLayer;
	label: string;
	total: number;
	passed: number;
	failed: number;
	pending: number;
	percent: number;
	complete: boolean;
	checkpoints: TaskCheckpoint[];
}

export const LAYER_META: Record<CheckpointLayer, { label: string; color: string }> = {
	L0: { label: 'L0 System', color: 'blue' },
	L1: { label: 'L1 AI Review', color: 'purple' },
	L2: { label: 'L2 User Approval', color: 'green' },
};
