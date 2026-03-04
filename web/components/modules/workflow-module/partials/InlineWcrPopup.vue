<script setup lang="ts">
/**
 * Inline WCR Creation Popup (M-002 GOV-UX)
 * Positioned popup anchored near "+" button for creating WCR at a specific position.
 * Uses structured position_context format: after_step:{id}|{readable text}
 */

import { createItem } from '@directus/sdk';
import type { WorkflowChangeRequest, WorkflowChangeType } from '~/types/workflow-dsl';

const props = defineProps<{
	workflowId: number;
	afterStepId: number;
	afterStepTitle: string;
	visible: boolean;
}>();

const emit = defineEmits<{
	close: [];
	'wcr-created': [request: WorkflowChangeRequest];
}>();

const changeType = ref<WorkflowChangeType>('add_step');
const description = ref('');
const submitting = ref(false);
const submitError = ref('');

const positionContext = computed(
	() => `after_step:${props.afterStepId}|Sau bước: ${props.afterStepTitle}`,
);

async function submit() {
	if (!description.value.trim()) {
		submitError.value = 'Cần mô tả thay đổi.';
		return;
	}

	submitError.value = '';
	submitting.value = true;

	try {
		const summary = description.value.trim().split('\n')[0].slice(0, 80);
		const created = await useDirectus<WorkflowChangeRequest>(
			createItem('workflow_change_requests', {
				workflow_id: props.workflowId,
				change_type: changeType.value,
				title: summary || 'Workflow change request',
				description: description.value.trim(),
				position_context: positionContext.value,
				status: 'draft',
			}),
		);

		description.value = '';
		emit('wcr-created', created);
		emit('close');
	} catch (err: any) {
		submitError.value = err?.data?.statusMessage || err?.message || 'Không tạo được đề xuất.';
	} finally {
		submitting.value = false;
	}
}

function close() {
	description.value = '';
	submitError.value = '';
	emit('close');
}
</script>

<template>
	<Transition
		enter-active-class="transition duration-150 ease-out"
		enter-from-class="scale-95 opacity-0"
		enter-to-class="scale-100 opacity-100"
		leave-active-class="transition duration-100 ease-in"
		leave-from-class="scale-100 opacity-100"
		leave-to-class="scale-95 opacity-0"
	>
		<div
			v-if="visible"
			class="absolute z-50 w-80 rounded-lg border border-amber-200 bg-white p-4 shadow-xl dark:border-amber-700 dark:bg-gray-800"
		>
			<div class="mb-3 flex items-center justify-between">
				<h4 class="text-sm font-semibold text-gray-900 dark:text-white">Đề xuất thay đổi</h4>
				<button
					class="text-gray-400 transition hover:text-gray-600 dark:hover:text-gray-300"
					@click="close"
				>
					<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			<p class="mb-3 text-xs text-amber-600 dark:text-amber-400">
				{{ positionContext.split('|')[1] }}
			</p>

			<div class="space-y-3">
				<select
					v-model="changeType"
					class="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-900 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-200 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
				>
					<option value="add_step">Thêm bước</option>
					<option value="modify_step">Sửa bước</option>
					<option value="remove_step">Xóa bước</option>
					<option value="reorder">Sắp xếp lại</option>
					<option value="restructure">Tái cấu trúc</option>
				</select>

				<textarea
					v-model="description"
					rows="3"
					placeholder="Mô tả thay đổi..."
					class="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-900 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-200 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
				/>

				<p v-if="submitError" class="text-xs text-red-600 dark:text-red-400">{{ submitError }}</p>

				<div class="flex gap-2">
					<button
						class="flex-1 rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-amber-700 disabled:opacity-60"
						:disabled="submitting"
						@click="submit"
					>
						{{ submitting ? 'Đang tạo...' : 'Tạo WCR' }}
					</button>
					<button
						class="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
						:disabled="submitting"
						@click="close"
					>
						Hủy
					</button>
				</div>
			</div>
		</div>
	</Transition>
</template>
