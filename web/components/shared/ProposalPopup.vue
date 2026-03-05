<script setup lang="ts">
/**
 * ProposalPopup — Generic table change proposal popup (TABLE-MODULE-V2)
 * Uses UModal for positioning, USelect for type, UTextarea for description.
 * Submits to `table_proposals` collection with auto-collected metadata.
 */

import { createItem } from '@directus/sdk';
import type { TableProposal, ProposalType, PositionType } from '~/types/table-proposals';

const props = defineProps<{
	sourceCollection: string;
	positionType: PositionType;
	positionIndex: number;
	positionContext?: string;
	visible: boolean;
}>();

const emit = defineEmits<{
	close: [];
	'proposal-created': [proposal: TableProposal];
}>();

const proposalType = ref<ProposalType>(props.positionType === 'row' ? 'add_row' : 'add_column');
const description = ref('');
const submitting = ref(false);
const submitError = ref('');

const typeOptions = computed(() => {
	if (props.positionType === 'row') {
		return [
			{ label: 'Thêm hàng', value: 'add_row' },
			{ label: 'Sửa đổi', value: 'modify' },
			{ label: 'Xóa', value: 'delete' },
		];
	}
	return [
		{ label: 'Thêm cột', value: 'add_column' },
		{ label: 'Sửa đổi', value: 'modify' },
		{ label: 'Xóa', value: 'delete' },
	];
});

watch(
	() => props.visible,
	(v) => {
		if (v) {
			proposalType.value = props.positionType === 'row' ? 'add_row' : 'add_column';
			description.value = '';
			submitError.value = '';
		}
	},
);

async function submit() {
	if (!description.value.trim()) {
		submitError.value = 'Cần mô tả đề xuất.';
		return;
	}

	submitError.value = '';
	submitting.value = true;

	try {
		const created = await useDirectus<TableProposal>(
			createItem('table_proposals', {
				source_collection: props.sourceCollection,
				proposal_type: proposalType.value,
				position_type: props.positionType,
				position_index: props.positionIndex,
				position_context: props.positionContext || null,
				description: description.value.trim(),
				status: 'draft',
			}),
		);

		description.value = '';
		emit('proposal-created', created);
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
			<!-- Header -->
			<div class="mb-4 flex items-center justify-between">
				<h4 class="text-sm font-semibold text-gray-900 dark:text-white">
					Đề xuất thay đổi
				</h4>
				<UButton variant="ghost" size="xs" icon="i-heroicons-x-mark" @click="close" />
			</div>

			<!-- Position context -->
			<p v-if="positionContext" class="mb-3 text-xs text-amber-600 dark:text-amber-400">
				{{ positionContext }}
			</p>

			<div class="space-y-3">
				<!-- Proposal type dropdown -->
				<div>
					<label class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Loại đề xuất</label>
					<USelect
						v-model="proposalType"
						:options="typeOptions"
					/>
				</div>

				<!-- Description textarea -->
				<div>
					<label class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Mô tả yêu cầu</label>
					<UTextarea
						v-model="description"
						:rows="6"
						placeholder="Mô tả thay đổi bằng ngôn ngữ tự nhiên..."
					/>
				</div>

				<!-- Error -->
				<p v-if="submitError" class="text-xs text-red-600 dark:text-red-400">{{ submitError }}</p>

				<!-- Actions -->
				<div class="flex gap-2">
					<UButton class="flex-1" color="amber" :loading="submitting" @click="submit">
						Gửi đề xuất
					</UButton>
					<UButton variant="outline" :disabled="submitting" @click="close">
						Hủy
					</UButton>
				</div>
			</div>
		</div>
	</UModal>
</template>
