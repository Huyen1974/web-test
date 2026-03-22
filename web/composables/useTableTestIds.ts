import type { MaybeRefOrGetter, Ref } from 'vue';
import { nextTick, onMounted, toValue, watch } from 'vue';

interface UseTableTestIdsOptions {
	rootRef: Ref<HTMLElement | null>;
	tableTestId: string;
	columnKeys: MaybeRefOrGetter<string[]>;
	headerTestIds?: MaybeRefOrGetter<Record<string, string>>;
	rowTestIds?: MaybeRefOrGetter<Array<string | undefined>>;
}

export function useTableTestIds(options: UseTableTestIdsOptions) {
	const syncTableTestIds = async () => {
		await nextTick();

		const root = options.rootRef.value;
		const table = root?.querySelector('table');
		if (!table) return;

		table.setAttribute('data-testid', options.tableTestId);

		const headerTestIds = toValue(options.headerTestIds) || {};
		const columnKeys = toValue(options.columnKeys) || [];
		const headerCells = Array.from(table.querySelectorAll<HTMLTableCellElement>('thead th'));
		for (const [index, cell] of headerCells.entries()) {
			const key = columnKeys[index];
			const testId = key ? headerTestIds[key] : undefined;
			if (testId) {
				cell.setAttribute('data-testid', testId);
			}
		}

		const rowTestIds = toValue(options.rowTestIds) || [];
		const bodyRows = Array.from(table.querySelectorAll<HTMLTableRowElement>('tbody tr'));
		for (const [index, row] of bodyRows.entries()) {
			const testId = rowTestIds[index];
			if (testId) {
				row.setAttribute('data-testid', testId);
			}
		}
	};

	onMounted(syncTableTestIds);
	watch(
		() => ({
			columnKeys: toValue(options.columnKeys),
			headerTestIds: toValue(options.headerTestIds),
			rowTestIds: toValue(options.rowTestIds),
		}),
		syncTableTestIds,
		{ deep: true, flush: 'post' },
	);
}
