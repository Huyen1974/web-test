<script setup lang="ts">
import { readItem, readItems } from '@directus/sdk';
import { sectionConfig, collectionMap, getCodeField } from '~/config/detail-sections';
import type { SectionConfig } from '~/config/detail-sections';

const route = useRoute();
const entityType = computed(() => route.params.entityType as string);
const itemId = computed(() => route.params.id as string);

const { $directus } = useNuxtApp();

// Fetch catalog entry for breadcrumb AND dynamic collection lookup
const { data: catalogEntry } = useAsyncData(
	`catalog-detail-${entityType.value}`,
	() =>
		$directus.request(
			readItems('meta_catalog', {
				filter: { entity_type: { _eq: entityType.value } },
				fields: ['name', 'code', 'registry_collection'],
				limit: 1,
			}),
		),
	{ transform: (items: any[]) => items?.[0] || null },
);

// Dynamic collection: config first, then meta_catalog fallback
const collection = computed(() => collectionMap[entityType.value] || catalogEntry.value?.registry_collection || '');
const codeField = computed(() => getCodeField(entityType.value));

// Fetch the item — support both numeric ID and code-based lookup
const { data: item, error } = useAsyncData(`registry-detail-${entityType.value}-${itemId.value}`, async () => {
	// For dynamic lookup, try collectionMap first, then meta_catalog
	let col = collectionMap[entityType.value];
	if (!col) {
		const cats = await $directus.request(
			readItems('meta_catalog', {
				filter: { entity_type: { _eq: entityType.value } },
				fields: ['registry_collection'],
				limit: 1,
			}),
		);
		col = (cats as any[])?.[0]?.registry_collection || '';
	}
	if (!col) return null;

	// If itemId contains letters/dashes, look up by code field
	const isCode = /[A-Za-z-]/.test(itemId.value);
	if (isCode) {
		const items = await $directus.request(
			readItems(col as any, {
				filter: { [codeField.value]: { _eq: itemId.value } },
				fields: ['*'],
				limit: 1,
			}),
		);
		return (items as any[])?.[0] || null;
	}

	// Numeric ID — direct lookup
	return $directus.request(readItem(col as any, itemId.value, { fields: ['*'] }));
});

// Get sections config for this entity type
const sections = computed<SectionConfig[]>(() => sectionConfig[entityType.value] || []);

// Discovery mode: entity types without section config
const isDiscoveryMode = computed(() => sections.value.length === 0);

// Group sections into 4 categories for config mode
const fieldsSections = computed(() => sections.value.filter((s) => s.type === 'fields'));
const relationSections = computed(() => sections.value.filter((s) => s.type === 'relation'));
const dependencySections = computed(() => sections.value.filter((s) => s.type === 'dependency'));

// Detect page_url for "Xem trang thực tế" button
const pageUrl = computed(() => {
	if (!item.value) return null;
	return item.value.page_url || item.value.url || item.value.script_path || null;
});

definePageMeta({ title: 'Chi tiết' });

useHead({
	title: computed(() => {
		const name = item.value?.name || item.value?.title || item.value?.code || itemId.value;
		return `${name} — ${catalogEntry.value?.name || entityType.value}`;
	}),
});
</script>

<template>
	<div class="container mx-auto px-4 py-8">
		<!-- Breadcrumb + Header -->
		<div class="mb-8">
			<div class="mb-4 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
				<NuxtLink to="/knowledge/registries" class="hover:text-gray-700 dark:hover:text-gray-200"> Danh mục </NuxtLink>
				<span>/</span>
				<NuxtLink :to="`/knowledge/registries/${entityType}`" class="hover:text-gray-700 dark:hover:text-gray-200">
					{{ catalogEntry?.name || entityType }}
				</NuxtLink>
				<span>/</span>
				<span class="text-gray-900 dark:text-white">{{ item?.code || item?.process_code || item?.name || itemId }}</span>
			</div>

			<div class="mb-2">
				<UBadge color="primary" variant="solid" size="sm">LAYER 4</UBadge>
			</div>
			<div class="flex items-center gap-4">
				<h1 class="text-3xl font-bold text-gray-900 dark:text-white">
					{{ item?.name || item?.title || item?.code || `Item #${itemId}` }}
				</h1>
				<UButton
					v-if="pageUrl"
					:to="pageUrl"
					target="_blank"
					color="primary"
					variant="outline"
					size="sm"
					icon="i-heroicons-arrow-top-right-on-square"
				>
					Xem trang thực tế
				</UButton>
			</div>
			<p v-if="item?.code && (item?.name || item?.title)" class="mt-1 text-sm text-gray-500 dark:text-gray-400">
				{{ item.code }}
			</p>
		</div>

		<!-- Error state -->
		<div v-if="error" class="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
			Không tìm thấy mục hoặc lỗi truy cập.
		</div>

		<!-- Config mode: 4 grouped sections -->
		<div v-else-if="item && sections.length > 0" class="space-y-8">
			<!-- 1. Thông tin cơ bản -->
			<section>
				<h2 class="mb-3 text-lg font-semibold text-gray-800 dark:text-gray-200">Thông tin cơ bản</h2>
				<div v-if="fieldsSections.length" class="space-y-4">
					<RegistriesSectionFields v-for="s in fieldsSections" :key="s.id" :item="item" :config="s" />
				</div>
				<UCard v-else>
					<p class="text-sm text-gray-400 dark:text-gray-500">Chưa có dữ liệu</p>
				</UCard>
			</section>

			<!-- Layer 5 — Quan hệ -->
			<div class="mb-2 mt-4">
				<UBadge color="primary" variant="solid" size="sm">LAYER 5 — QUAN HỆ</UBadge>
			</div>

			<!-- 2. Cấu trúc -->
			<section>
				<h2 class="mb-3 text-lg font-semibold text-gray-800 dark:text-gray-200">Cấu trúc</h2>
				<div v-if="relationSections.length" class="space-y-4">
					<RegistriesSectionRelation v-for="s in relationSections" :key="s.id" :item="item" :config="s" />
				</div>
				<UCard v-else>
					<p class="text-sm text-gray-400 dark:text-gray-500">Chưa có dữ liệu</p>
				</UCard>
			</section>

			<!-- 3. Phụ thuộc -->
			<section>
				<h2 class="mb-3 text-lg font-semibold text-gray-800 dark:text-gray-200">Phụ thuộc</h2>
				<div v-if="dependencySections.length" class="space-y-4">
					<RegistriesSectionDependency v-for="s in dependencySections" :key="s.id" :item="item" :config="s" :entity-type="entityType" />
				</div>
				<UCard v-else>
					<p class="text-sm text-gray-400 dark:text-gray-500">Chưa có dữ liệu</p>
				</UCard>
			</section>

			<!-- 4. Liên quan -->
			<section>
				<h2 class="mb-3 text-lg font-semibold text-gray-800 dark:text-gray-200">Liên quan</h2>
				<UCard>
					<p class="text-sm text-gray-400 dark:text-gray-500">Chưa có dữ liệu</p>
				</UCard>
			</section>
		</div>

		<!-- Discovery mode: auto-discover relations for entity types without config -->
		<RegistriesDiscoveryView
			v-else-if="item && isDiscoveryMode"
			:item="item"
			:entity-type="entityType"
			:collection="collection"
		/>

		<!-- Back link -->
		<div class="mt-6">
			<NuxtLink
				:to="`/knowledge/registries/${entityType}`"
				class="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-800 dark:text-primary-400"
			>
				&larr; Quay lại {{ catalogEntry?.name || entityType }}
			</NuxtLink>
		</div>
	</div>
</template>
