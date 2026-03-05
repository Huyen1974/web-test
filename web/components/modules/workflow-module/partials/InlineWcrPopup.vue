<script setup lang="ts">
/**
 * Inline WCR Creation Popup (M-002 GOV-UX)
 * UModal-based popup for creating WCR at a specific position.
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

const changeTypeOptions = [
	{ label: 'Thêm bước', value: 'add_step' },
	{ label: 'Sửa bước', value: 'modify_step' },
	{ label: 'Xóa bước', value: 'remove_step' },
	{ label: 'Sắp xếp lại', value: 'reorder' },
	{ label: 'Tái cấu trúc', value: 'restructure' },
];

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
	<UModal :model-value="visible" @close="close">
		<div class="p-5">
			<div class="mb-3 flex items-center justify-between">
				<h4 class="text-sm font-semibold text-gray-900 dark:text-white">Đề xuất thay đổi</h4>
				<UButton variant="ghost" size="xs" icon="i-heroicons-x-mark" @click="close" />
			</div>

			<p class="mb-3 text-xs text-amber-600 dark:text-amber-400">
				Sau bước: {{ afterStepTitle }}
			</p>

			<div class="space-y-3">
				<USelect v-model="changeType" :options="changeTypeOptions" />

				<UTextarea
					v-model="description"
					:rows="3"
					placeholder="Mô tả thay đổi..."
				/>

				<p v-if="submitError" class="text-xs text-red-600 dark:text-red-400">{{ submitError }}</p>

				<div class="flex gap-2">
					<UButton class="flex-1" color="amber" :loading="submitting" @click="submit">
						Tạo WCR
					</UButton>
					<UButton variant="outline" :disabled="submitting" @click="close">
						Hủy
					</UButton>
				</div>
			</div>
		</div>
	</UModal>
</template>
