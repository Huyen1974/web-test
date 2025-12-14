<script setup lang="ts">
import type { GlobalSearchResult } from '~/types/api/global-search';
import { joinURL } from 'ufo';

const props = defineProps({
	collections: {
		type: Array as PropType<string[]>,
		required: true,
		validator: (value: string[]) => {
			return value.every((collection) => {
				return ['posts', 'pages', 'categories', 'projects'].includes(collection);
			});
		},
	},
	placeholder: {
		type: String,
		default: 'Search items',
	},
});

defineShortcuts({
	meta_k: {
		usingInput: true,
		handler: () => {
			isOpen.value = !isOpen.value;
		},
	},
});

const isOpen = ref(false);

const { fileUrl } = useFiles();
const runtimeConfig = useRuntimeConfig();
const directusBase =
	runtimeConfig.public.directus?.rest?.baseUrl ||
	runtimeConfig.public.directus?.url ||
	runtimeConfig.public.directusUrl ||
	'';

const groups = computed(() => {
	return [
		{
			key: 'search',
			label: (q: string) => q && `Results matching “${q}”...`,

			search: async (q: string) => {
				loading.value = true;

				if (!q || q.length < 3) {
					loading.value = false;
					return [];
				}

				try {
					if (!directusBase) {
						return [];
					}

					const hits: GlobalSearchResult[] = [];

					for (const collection of props.collections) {
						try {
							const url = joinURL(directusBase, `/items/${collection}`);
							const { data } = await $fetch<{ data: any[] }>(url, {
								query: {
									search: q,
									limit: 5,
									fields: 'id,title,slug,image,cover_image',
								},
							});

							(data || []).forEach((item: any) => {
								const image = item.image || item.cover_image;
								hits.push({
									id: item.id,
									title: item.title,
									type: collection,
									image,
									url: item.slug ? `/${collection}/${item.slug}` : `/${collection}/${item.id}`,
								});
							});
						} catch (error) {
							// ignore collection-level failures to keep search resilient
						}
					}

					return hits.map((hit: any) => {
						return {
							id: hit.id,
							label: hit.title,
							href: hit.url,
							avatar: { src: fileUrl(hit.image) },
							suffix: hit.type,
						};
					});
				} catch (error) {
					// console.log(error);
				} finally {
					loading.value = false;
				}
			},
		},
	];
});

function onSelect(option: any) {
	if (option.click) {
		option.click();
	} else if (option.to) {
		navigateTo(option.to);
	} else if (option.href) {
		navigateTo(option.href);
	}
}

const _query = ref('');
const _results = ref([]);
const _selected = ref(null);
const loading = ref(false);

const ui = {
	wrapper: 'flex flex-col flex-1 min-h-0 bg-gray-50 dark:bg-gray-800',
	input: {
		wrapper: 'relative flex items-center mx-3 py-3',
		base: 'w-full rounded border-2 border-primary-500 placeholder-gray-400 dark:placeholder-gray-500 focus:border-primary-500 focus:outline-none focus:ring-0 bg-white dark:bg-gray-900',
		padding: 'px-4',
		height: 'h-14',
		size: 'text-lg',
		icon: {
			base: 'pointer-events-none absolute left-3 text-primary-500 dark:text-primary-400',
			size: 'h-6 w-6',
		},
	},
	group: {
		wrapper: 'p-3 relative',
		label:
			'-mx-3 px-3 -mt-4 mb-2 py-1 text-sm font-semibold text-primary-500 dark:text-primary-400 font-semibold sticky top-0 bg-gray-50 dark:bg-gray-800 z-10',
		container: 'space-y-1',
		command: {
			base: 'flex justify-between select-none items-center rounded px-2 py-4 gap-2 relative font-medium text-sm group shadow',
			active: 'bg-primary-500 dark:bg-primary-400 text-white',
			inactive: 'bg-white dark:bg-gray-900',
			label: 'flex min-w-0 justify-between',
			suffix: 'text-xs',
			icon: {
				base: 'flex-shrink-0 w-6 h-6',
				active: 'text-white',
				inactive: 'text-gray-400 dark:text-gray-500',
			},
		},
	},
	emptyState: {
		wrapper: 'flex flex-col items-center justify-center flex-1 py-9',
		label: 'text-sm text-center text-gray-500 dark:text-gray-400',
		queryLabel: 'text-lg text-center text-gray-900 dark:text-white',
		icon: 'w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-4',
	},
};
</script>
<template>
	<div>
		<UButton icon="material-symbols:search-rounded" color="white" size="lg" @click="isOpen = true">
			Search
			<div class="flex items-center gap-0.5">
				<UKbd>⌘</UKbd>
				<UKbd>K</UKbd>
			</div>
		</UButton>
		<UModal v-model="isOpen">
			<UCommandPalette :loading="loading" :groups="groups" :ui="ui" @update:model-value="onSelect" />
		</UModal>
	</div>
</template>
