<script setup lang="ts">
/**
 * ProposalPopup — Generic table change proposal popup (TABLE-MODULE-V2)
 * Positioned near the "+" insert mark. Min-width 400px, textarea ≥60%.
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
			{ value: 'add_row', label: 'Thêm hàng' },
			{ value: 'modify', label: 'Sửa đổi' },
			{ value: 'delete', label: 'Xóa' },
		];
	}
	return [
		{ value: 'add_column', label: 'Thêm cột' },
		{ value: 'modify', label: 'Sửa đổi' },
		{ value: 'delete', label: 'Xóa' },
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
			class="absolute z-50 min-w-[400px] rounded-lg border border-amber-200 bg-white p-5 shadow-xl dark:border-amber-700 dark:bg-gray-800"
		>
			<!-- Header -->
			<div class="mb-4 flex items-center justify-between">
				<h4 class="text-sm font-semibold text-gray-900 dark:text-white">
					Đề xuất thay đổi
				</h4>
				<button
					class="text-gray-400 transition hover:text-gray-600 dark:hover:text-gray-300"
					@click="close"
				>
					<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			<!-- Position context -->
			<p v-if="positionContext" class="mb-3 text-xs text-amber-600 dark:text-amber-400">
				{{ positionContext }}
			</p>

			<div class="space-y-3">
				<!-- Proposal type dropdown -->
				<div>
					<label class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Loại đề xuất</label>
					<select
						v-model="proposalType"
						class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-200 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
					>
						<option
							v-for="opt in typeOptions"
							:key="opt.value"
							:value="opt.value"
						>
							{{ opt.label }}
						</option>
					</select>
				</div>

				<!-- Description textarea (≥60% of popup area) -->
				<div>
					<label class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Mô tả yêu cầu</label>
					<textarea
						v-model="description"
						rows="6"
						placeholder="Mô tả thay đổi bằng ngôn ngữ tự nhiên..."
						class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-200 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
					/>
				</div>

				<!-- Error -->
				<p v-if="submitError" class="text-xs text-red-600 dark:text-red-400">{{ submitError }}</p>

				<!-- Actions -->
				<div class="flex gap-2">
					<button
						class="flex-1 rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-700 disabled:opacity-60"
						:disabled="submitting"
						@click="submit"
					>
						{{ submitting ? 'Đang tạo...' : 'Gửi đề xuất' }}
					</button>
					<button
						class="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
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
