<script setup lang="ts">
/**
 * Compact Approval Widget (M-002 GOV-UX)
 * Shows L2 checkpoint status + approve/reject buttons.
 * Max 80px height, no comment stream.
 */

import { readItems, createItem, updateItem } from '@directus/sdk';
import type { TaskCheckpoint, CheckpointStatus } from '~/types/checkpoints';

const props = defineProps<{
	taskId: number | string;
}>();

const L2_KEY = 'L2_user_approval';

const { data: l2Checkpoint, refresh, pending } = useAsyncData(
	`approval-widget-${props.taskId}`,
	async () => {
		const items = await useDirectus<TaskCheckpoint[]>(
			readItems('task_checkpoints', {
				filter: {
					task_id: { _eq: props.taskId },
					layer: { _eq: 'L2' },
					checkpoint_key: { _eq: L2_KEY },
				},
				fields: ['id', 'status', 'verified_by', 'date_updated'],
				limit: 1,
			}),
		);
		return items?.[0] || null;
	},
	{ watch: [() => props.taskId] },
);

const updating = ref(false);

const statusConfig: Record<string, { label: string; class: string }> = {
	pending: { label: 'Đang chờ', class: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
	passed: { label: 'Đã duyệt', class: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
	failed: { label: 'Từ chối', class: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' },
};

const currentStatus = computed(() => l2Checkpoint.value?.status || 'pending');

async function setStatus(status: CheckpointStatus) {
	updating.value = true;
	try {
		if (l2Checkpoint.value) {
			await useDirectus(updateItem('task_checkpoints', l2Checkpoint.value.id, { status, verified_by: 'user' }));
		} else {
			await useDirectus(
				createItem('task_checkpoints', {
					task_id: props.taskId,
					checkpoint_key: L2_KEY,
					layer: 'L2',
					status,
					verified_by: 'user',
				}),
			);
		}
		await refresh();
	} catch (err: any) {
		console.error('ApprovalWidget error:', err);
	} finally {
		updating.value = false;
	}
}
</script>

<template>
	<div class="flex items-center gap-3 rounded-lg bg-white px-4 py-2 shadow dark:bg-gray-800" style="max-height: 80px;">
		<span class="text-sm font-medium text-gray-700 dark:text-gray-300">Phê duyệt:</span>

		<span
			class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold"
			:class="statusConfig[currentStatus]?.class || statusConfig.pending.class"
		>
			{{ statusConfig[currentStatus]?.label || currentStatus }}
		</span>

		<div class="ml-auto flex gap-2">
			<button
				v-if="currentStatus !== 'passed'"
				class="inline-flex items-center rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60"
				:disabled="updating || pending"
				@click="setStatus('passed')"
			>
				Duyệt
			</button>
			<button
				v-if="currentStatus !== 'failed'"
				class="inline-flex items-center rounded-md bg-rose-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-rose-700 disabled:opacity-60"
				:disabled="updating || pending"
				@click="setStatus('failed')"
			>
				Từ chối
			</button>
			<button
				v-if="currentStatus !== 'pending' "
				class="inline-flex items-center rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
				:disabled="updating || pending"
				@click="setStatus('pending')"
			>
				Đặt lại
			</button>
		</div>
	</div>
</template>
