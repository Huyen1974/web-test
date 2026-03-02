<script setup lang="ts">
/**
 * CheckpointPanel — 3-tier checkpoint progress display (M-001 v2)
 *
 * Tiers: L0 System | L1 AI Review | L2 User Approval
 * L2 is locked when L1 is not complete.
 */
import type { CheckpointStatus } from '~/types/checkpoints';
import { LAYER_META } from '~/types/checkpoints';
import { useCheckpoints, updateCheckpointStatus } from '~/composables/useCheckpoints';

const props = defineProps<{
	taskId: number | string;
}>();

const emit = defineEmits<{
	'checkpoint-updated': [];
}>();

const taskIdRef = computed(() => props.taskId);
const { layers, overallProgress, loading, error, refresh } = useCheckpoints(taskIdRef);

// L2 locked when L1 is not complete
const l1Complete = computed(() => {
	const l1 = layers.value.find((l) => l.layer === 'L1');
	return l1 ? l1.complete : false;
});

// Status icon map
const STATUS_ICON: Record<CheckpointStatus, { icon: string; class: string }> = {
	passed: { icon: '\u2713', class: 'text-green-600 dark:text-green-400' },
	failed: { icon: '\u2717', class: 'text-red-600 dark:text-red-400' },
	pending: { icon: '\u25CB', class: 'text-gray-400 dark:text-gray-500' },
	skipped: { icon: '\u2212', class: 'text-gray-300 dark:text-gray-600' },
};

// Layer color map for progress bars
const LAYER_BAR_COLORS: Record<string, { bg: string; fill: string }> = {
	blue: { bg: 'bg-blue-100 dark:bg-blue-900/30', fill: 'bg-blue-500' },
	purple: { bg: 'bg-purple-100 dark:bg-purple-900/30', fill: 'bg-purple-500' },
	green: { bg: 'bg-green-100 dark:bg-green-900/30', fill: 'bg-green-500' },
};

function barColor(layer: string) {
	const color = LAYER_META[layer as keyof typeof LAYER_META]?.color || 'blue';
	return LAYER_BAR_COLORS[color] || LAYER_BAR_COLORS.blue;
}

function isLayerLocked(layer: string): boolean {
	return layer === 'L2' && !l1Complete.value;
}

async function toggleCheckpoint(checkpointId: number, currentStatus: CheckpointStatus) {
	const next: CheckpointStatus = currentStatus === 'passed' ? 'pending' : 'passed';
	await updateCheckpointStatus(checkpointId, next);
	await refresh();
	emit('checkpoint-updated');
}
</script>

<template>
	<div class="space-y-4">
		<!-- Overall progress -->
		<div class="flex items-center justify-between">
			<span class="text-sm font-medium text-gray-700 dark:text-gray-300">
				Checkpoints
			</span>
			<span class="text-xs text-gray-500 dark:text-gray-400">
				{{ overallProgress.passed }}/{{ overallProgress.total }} passed
				({{ overallProgress.percent }}%)
			</span>
		</div>

		<!-- Loading -->
		<div v-if="loading" class="flex items-center justify-center py-4">
			<span class="inline-block h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
			<span class="ml-2 text-sm text-gray-400">Loading checkpoints...</span>
		</div>

		<!-- Error -->
		<div
			v-else-if="error"
			class="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
		>
			Failed to load checkpoints.
		</div>

		<!-- Empty -->
		<div v-else-if="overallProgress.total === 0" class="py-4 text-center text-sm text-gray-400 dark:text-gray-500">
			No checkpoints defined for this task.
		</div>

		<!-- Layer tiers -->
		<div v-else class="space-y-3">
			<div
				v-for="lp in layers"
				:key="lp.layer"
				class="rounded-lg border border-gray-200 p-3 dark:border-gray-700"
				:class="{ 'opacity-50': isLayerLocked(lp.layer) }"
			>
				<!-- Layer header -->
				<div class="mb-2 flex items-center justify-between">
					<span class="text-sm font-semibold text-gray-800 dark:text-gray-200">
						{{ lp.label }}
					</span>
					<div class="flex items-center gap-2">
						<span v-if="isLayerLocked(lp.layer)" class="text-xs text-amber-600 dark:text-amber-400">
							Locked (L1 incomplete)
						</span>
						<span v-else-if="lp.complete" class="text-xs font-medium text-green-600 dark:text-green-400">
							Complete
						</span>
						<span class="text-xs text-gray-500 dark:text-gray-400">
							{{ lp.passed }}/{{ lp.total }}
						</span>
					</div>
				</div>

				<!-- Progress bar -->
				<div class="mb-2 h-1.5 w-full overflow-hidden rounded-full" :class="barColor(lp.layer).bg">
					<div
						class="h-full rounded-full transition-all duration-300"
						:class="barColor(lp.layer).fill"
						:style="{ width: `${lp.percent}%` }"
					/>
				</div>

				<!-- Checkpoint items -->
				<ul v-if="lp.checkpoints.length" class="space-y-1">
					<li
						v-for="cp in lp.checkpoints"
						:key="cp.id"
						class="flex items-center gap-2 rounded px-2 py-1 text-sm"
						:class="isLayerLocked(lp.layer) ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50'"
						@click="!isLayerLocked(lp.layer) && toggleCheckpoint(cp.id, cp.status)"
					>
						<span class="flex-shrink-0 font-mono text-base" :class="STATUS_ICON[cp.status].class">
							{{ STATUS_ICON[cp.status].icon }}
						</span>
						<span class="flex-1 text-gray-700 dark:text-gray-300">{{ cp.checkpoint_key }}</span>
						<span
							v-if="cp.verified_by"
							class="text-xs text-gray-400 dark:text-gray-500"
						>
							by {{ cp.verified_by }}
						</span>
					</li>
				</ul>
			</div>
		</div>
	</div>
</template>
