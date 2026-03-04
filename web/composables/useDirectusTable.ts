/**
 * Schema-driven composable for Directus collection tables (S101 Rule)
 * Provides pagination, sorting, search, and filtering via readItems SDK.
 */
import { readItems, aggregate } from '@directus/sdk';

export interface FieldConfig {
	key: string;
	label: string;
	width?: string;
	sortable?: boolean;
	filterable?: boolean;
	filterOptions?: { label: string; value: string | number }[];
	render?: (value: any, item: any) => string;
}

export interface DirectusTableOptions {
	collection: string;
	fields: FieldConfig[];
	defaultSort?: string[];
	pageSize?: number;
	searchable?: boolean;
	filters?: Record<string, any>;
	stt?: boolean;
}

export function useDirectusTable(options: DirectusTableOptions) {
	const currentPage = ref(1);
	const sortField = ref(options.defaultSort?.[0] || 'id');
	const sortDir = ref<'asc' | 'desc'>('asc');
	const searchQuery = ref('');
	const activeFilters = ref<Record<string, any>>({});
	const pageSize = options.pageSize || 25;

	// Build the fields list for the SDK query (supports dot notation for relations)
	const sdkFields = computed(() => {
		const fieldKeys = options.fields.map((f) => f.key);
		return fieldKeys as string[];
	});

	// Build sort array
	const sortArray = computed(() => {
		const prefix = sortDir.value === 'desc' ? '-' : '';
		return [`${prefix}${sortField.value}`];
	});

	// Build filter combining static + active filters
	const combinedFilter = computed(() => {
		const filter: Record<string, any> = {};

		// Static filters from config
		if (options.filters) {
			Object.assign(filter, options.filters);
		}

		// Dynamic filters from UI dropdowns
		for (const [key, value] of Object.entries(activeFilters.value)) {
			if (value !== '' && value !== null && value !== undefined) {
				filter[key] = { _eq: value };
			}
		}

		return Object.keys(filter).length > 0 ? filter : undefined;
	});

	// Build search param (omit if empty)
	const searchParam = computed(() => {
		const q = searchQuery.value?.trim();
		return q || undefined;
	});

	const requestKey = computed(() =>
		[
			'ddt',
			options.collection,
			currentPage.value,
			sortField.value,
			sortDir.value,
			searchQuery.value,
			JSON.stringify(activeFilters.value),
			JSON.stringify(options.filters),
		].join(':'),
	);

	const {
		data,
		pending: loading,
		error,
		refresh,
	} = useAsyncData(
		() => requestKey.value,
		async () => {
			const offset = (currentPage.value - 1) * pageSize;

			const params: Record<string, any> = {
				fields: sdkFields.value,
				sort: sortArray.value,
				limit: pageSize + 1, // fetch one extra to detect next page
				offset,
			};

			if (combinedFilter.value) {
				params.filter = combinedFilter.value;
			}
			if (searchParam.value) {
				params.search = searchParam.value;
			}

			const items = await useDirectus<any[]>(readItems(options.collection, params));

			const hasNextPage = items.length > pageSize;
			const pagedItems = items.slice(0, pageSize);

			// Try to get total count for display
			let totalCount: number | null = null;
			try {
				const countParams: Record<string, any> = { aggregate: { count: ['id'] } };
				if (combinedFilter.value) countParams.filter = combinedFilter.value;
				if (searchParam.value) countParams.search = searchParam.value;

				const countResult = await useDirectus<any[]>(aggregate(options.collection, countParams));
				if (countResult?.[0]?.count?.id) {
					totalCount = Number(countResult[0].count.id);
				}
			} catch {
				// Count is optional — pagination still works via hasNextPage
			}

			return { items: pagedItems, hasNextPage, totalCount };
		},
		{
			watch: [
				currentPage,
				sortField,
				sortDir,
				searchQuery,
				activeFilters,
			],
		},
	);

	const items = computed(() => data.value?.items || []);
	const hasNextPage = computed(() => data.value?.hasNextPage ?? false);
	const totalCount = computed(() => data.value?.totalCount ?? null);
	const totalPages = computed(() =>
		totalCount.value !== null ? Math.ceil(totalCount.value / pageSize) : null,
	);

	function toggleSort(fieldKey: string) {
		if (sortField.value === fieldKey) {
			sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
		} else {
			sortField.value = fieldKey;
			sortDir.value = 'asc';
		}
		currentPage.value = 1;
	}

	function setFilter(fieldKey: string, value: any) {
		activeFilters.value = { ...activeFilters.value, [fieldKey]: value };
		currentPage.value = 1;
	}

	function setSearch(value: string) {
		searchQuery.value = value;
		currentPage.value = 1;
	}

	function goToPage(page: number) {
		if (page < 1) return;
		currentPage.value = page;
	}

	return {
		items,
		loading,
		error,
		refresh,
		currentPage,
		sortField,
		sortDir,
		searchQuery,
		activeFilters,
		hasNextPage,
		totalCount,
		totalPages,
		pageSize,
		toggleSort,
		setFilter,
		setSearch,
		goToPage,
	};
}
