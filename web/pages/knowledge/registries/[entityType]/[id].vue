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
// Detect page_url for "Xem trang thực tế" button
const pageUrl = computed(() => {
	if (!item.value) return null;
	return item.value.page_url || item.value.url || item.value.script_path || null;
});

// === LAYER 5: 6 consistent relationship headings ===
const entityCode = computed(() => item.value?.code || item.value?.process_code || item.value?.table_id || itemId.value);

interface DepItem {
	code: string;
	type: string;
	name?: string;
	link: string | null;
}

interface Layer5Data {
	belongsTo: DepItem[];
	contains: DepItem[];
	dependsOn: DepItem[];
	usedBy: DepItem[];
	peers: DepItem[];
}

const { data: layer5 } = useAsyncData(
	`layer5-${entityType.value}-${itemId.value}`,
	async () => {
		const code = entityCode.value;
		const result: Layer5Data = { belongsTo: [], contains: [], dependsOn: [], usedBy: [], peers: [] };
		if (!code) return result;
		try {
			const [fwd, rev, peerItems] = await Promise.all([
				$directus.request(
					readItems('entity_dependencies' as any, {
						filter: { source_code: { _eq: code } },
						fields: ['target_code', 'target_type', 'relation_type'],
						limit: 50,
					}),
				),
				$directus.request(
					readItems('entity_dependencies' as any, {
						filter: { target_code: { _eq: code } },
						fields: ['source_code', 'source_type', 'relation_type'],
						limit: 50,
					}),
				),
				// Peers: same collection, exclude self
				(async () => {
					let col = collectionMap[entityType.value];
					if (!col) col = catalogEntry.value?.registry_collection || '';
					if (!col) return [];
					const cf = getCodeField(entityType.value);
					try {
						return await $directus.request(
							readItems(col as any, {
								filter: { [cf]: { _neq: code } },
								fields: ['id', 'code', 'name', 'title', 'process_code', 'table_id'],
								limit: 10,
								sort: [cf],
							}),
						);
					} catch {
						return [];
					}
				})(),
			]);

			for (const d of fwd as any[]) {
				const dep: DepItem = {
					code: d.target_code,
					type: d.target_type,
					link: d.target_type ? `/knowledge/registries/${d.target_type}/${d.target_code}` : null,
				};
				if (d.relation_type === 'belongs_to') result.belongsTo.push(dep);
				else if (d.relation_type === 'contains') result.contains.push(dep);
				else if (d.relation_type === 'depends_on') result.dependsOn.push(dep);
			}

			for (const d of rev as any[]) {
				const dep: DepItem = {
					code: d.source_code,
					type: d.source_type,
					link: d.source_type ? `/knowledge/registries/${d.source_type}/${d.source_code}` : null,
				};
				if (d.relation_type === 'depends_on') result.usedBy.push(dep);
				else if (d.relation_type === 'belongs_to') result.contains.push(dep);
				else if (d.relation_type === 'contains') result.belongsTo.push(dep);
			}

			result.peers = (peerItems as any[]).map((p: any) => {
				const pCode = p.code || p.process_code || p.table_id || `#${p.id}`;
				return {
					code: pCode,
					type: entityType.value,
					name: p.name || p.title || '',
					link: `/knowledge/registries/${entityType.value}/${pCode}`,
				};
			});

			return result;
		} catch {
			return result;
		}
	},
	{ default: () => ({ belongsTo: [], contains: [], dependsOn: [], usedBy: [], peers: [] }) },
);

// === TAXONOMY LABELS: fetch entity labels per facet ===
const { data: entityLabels } = useAsyncData(
	`entity-labels-${entityType.value}-${itemId.value}`,
	async () => {
		const code = entityCode.value;
		if (!code) return { labels: [], facets: [] };
		try {
			const [labels, facets] = await Promise.all([
				$directus.request(
					readItems('entity_labels' as any, {
						filter: { entity_code: { _eq: code } },
						fields: ['label_code', 'assigned_by'],
						limit: -1,
					}),
				),
				$directus.request(
					readItems('taxonomy_facets' as any, {
						fields: ['id', 'code', 'name'],
						sort: ['sort'],
						limit: -1,
					}),
				),
			]);
			// Fetch taxonomy details for the label codes
			const labelCodes = (labels as any[]).map((l: any) => l.label_code);
			if (labelCodes.length === 0) return { labels: [], facets: facets as any[] };
			const taxonomy = await $directus.request(
				readItems('taxonomy' as any, {
					filter: { code: { _in: labelCodes } },
					fields: ['code', 'name', 'facet_id'],
					limit: -1,
				}),
			);
			const taxMap = new Map<string, any>();
			for (const t of taxonomy as any[]) taxMap.set(t.code, t);

			const enriched = (labels as any[]).map((l: any) => ({
				...l,
				taxonomy: taxMap.get(l.label_code),
			}));
			return { labels: enriched, facets: facets as any[] };
		} catch {
			return { labels: [], facets: [] };
		}
	},
	{ default: () => ({ labels: [], facets: [] }) },
);

// Group labels by facet
const labelsByFacet = computed(() => {
	const groups = new Map<number, Array<{ code: string; name: string; assigned_by: string }>>();
	for (const l of entityLabels.value.labels) {
		const t = l.taxonomy;
		if (!t) continue;
		if (!groups.has(t.facet_id)) groups.set(t.facet_id, []);
		groups.get(t.facet_id)!.push({ code: l.label_code, name: t.name, assigned_by: l.assigned_by });
	}
	return groups;
});

// === CÙNG NHÓM: scored union per-facet domain (FAC-01) ===
const { data: sameGroup } = useAsyncData(
	`same-group-${entityType.value}-${itemId.value}`,
	async () => {
		const code = entityCode.value;
		if (!code) return [];
		try {
			// Get this entity's domain labels (FAC-01)
			const myLabels = entityLabels.value.labels
				.filter((l: any) => l.taxonomy?.facet_id && entityLabels.value.facets.find((f: any) => f.id === l.taxonomy.facet_id && f.code === 'FAC-01'))
				.map((l: any) => l.label_code);
			if (myLabels.length === 0) return [];

			// Find other entities sharing these labels
			const sharedLabels = await $directus.request(
				readItems('entity_labels' as any, {
					filter: {
						label_code: { _in: myLabels },
						entity_code: { _neq: code },
					},
					fields: ['entity_code', 'label_code'],
					limit: -1,
				}),
			);

			// Score: count shared labels per entity
			const scores = new Map<string, number>();
			for (const sl of sharedLabels as any[]) {
				scores.set(sl.entity_code, (scores.get(sl.entity_code) || 0) + 1);
			}

			// Sort by score desc, take top 20
			return Array.from(scores.entries())
				.sort((a, b) => b[1] - a[1])
				.slice(0, 20)
				.map(([ec, count]) => ({ entity_code: ec, shared_labels: count }));
		} catch {
			return [];
		}
	},
	{ default: () => [] },
);

const peerTotal = computed(() => layer5.value.peers.length);

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

			<!-- Taxonomy Labels (ĐẦU VÀO) -->
			<section v-if="entityLabels.labels.length > 0">
				<div class="mb-2 mt-4">
					<UBadge color="indigo" variant="solid" size="sm">NHÃN PHÂN LOẠI</UBadge>
				</div>
				<div class="space-y-3">
					<div v-for="facet in entityLabels.facets" :key="facet.id">
						<template v-if="labelsByFacet.get(facet.id)?.length">
							<h3 class="mb-1 text-sm font-medium text-gray-600 dark:text-gray-400">{{ facet.name }}</h3>
							<div class="flex flex-wrap gap-1.5">
								<span
									v-for="label in labelsByFacet.get(facet.id)"
									:key="label.code"
									class="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs dark:border-indigo-700 dark:bg-indigo-900/20"
								>
									<span class="font-medium text-indigo-700 dark:text-indigo-300">{{ label.name }}</span>
									<span v-if="label.assigned_by === 'rule'" class="text-gray-400">[auto]</span>
								</span>
							</div>
						</template>
					</div>
				</div>
			</section>

			<!-- Layer 5 — 6 Quan hệ nhất quán -->
			<div class="mb-2 mt-4">
				<UBadge color="primary" variant="solid" size="sm">LAYER 5 — QUAN HỆ</UBadge>
			</div>

			<div class="space-y-4">
				<!-- 1. Tôi thuộc ai? -->
				<section>
					<h3 class="mb-2 text-base font-semibold text-gray-800 dark:text-gray-200">1. Tôi thuộc ai?</h3>
					<div v-if="layer5.belongsTo.length > 0" class="space-y-1">
						<div v-for="dep in layer5.belongsTo" :key="`bt-${dep.code}`" class="flex items-center gap-2 text-sm">
							<span class="text-gray-400">&rarr;</span>
							<NuxtLink v-if="dep.link" :to="dep.link" class="font-mono text-xs text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-200">{{ dep.code }}</NuxtLink>
							<span v-else class="font-mono text-xs line-through text-gray-400">{{ dep.code }}</span>
						</div>
					</div>
									</section>

				<!-- 2. Tôi chứa gì? -->
				<section>
					<h3 class="mb-2 text-base font-semibold text-gray-800 dark:text-gray-200">2. Tôi chứa gì?</h3>
					<div v-if="layer5.contains.length > 0" class="space-y-1">
						<div v-for="dep in layer5.contains" :key="`ct-${dep.code}`" class="flex items-center gap-2 text-sm">
							<span class="text-gray-400">&rarr;</span>
							<NuxtLink v-if="dep.link" :to="dep.link" class="font-mono text-xs text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-200">{{ dep.code }}</NuxtLink>
							<span v-else class="font-mono text-xs line-through text-gray-400">{{ dep.code }}</span>
						</div>
					</div>
									</section>

				<!-- 3. Tôi dùng ai? -->
				<section>
					<h3 class="mb-2 text-base font-semibold text-gray-800 dark:text-gray-200">3. Tôi dùng ai?</h3>
					<div v-if="layer5.dependsOn.length > 0" class="space-y-1">
						<div v-for="dep in layer5.dependsOn" :key="`do-${dep.code}`" class="flex items-center gap-2 text-sm">
							<span class="text-gray-400">&rarr;</span>
							<NuxtLink v-if="dep.link" :to="dep.link" class="font-mono text-xs text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-200">{{ dep.code }}</NuxtLink>
							<span v-else class="font-mono text-xs line-through text-gray-400">{{ dep.code }}</span>
						</div>
					</div>
									</section>

				<!-- 4. Ai dùng tôi? -->
				<section>
					<h3 class="mb-2 text-base font-semibold text-gray-800 dark:text-gray-200">4. Ai dùng tôi?</h3>
					<div v-if="layer5.usedBy.length > 0" class="space-y-1">
						<div v-for="dep in layer5.usedBy" :key="`ub-${dep.code}`" class="flex items-center gap-2 text-sm">
							<span class="text-gray-400">&rarr;</span>
							<NuxtLink v-if="dep.link" :to="dep.link" class="font-mono text-xs text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-200">{{ dep.code }}</NuxtLink>
							<span v-else class="font-mono text-xs line-through text-gray-400">{{ dep.code }}</span>
						</div>
					</div>
									</section>

				<!-- 5. Cùng nhóm (scored union per-facet domain) -->
				<section>
					<h3 class="mb-2 text-base font-semibold text-gray-800 dark:text-gray-200">5. Cùng nhóm</h3>
					<div v-if="sameGroup.length > 0" class="flex flex-wrap gap-2">
						<span
							v-for="sg in sameGroup"
							:key="`sg-${sg.entity_code}`"
							class="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs hover:border-primary-300 hover:bg-primary-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-primary-600 dark:hover:bg-primary-900/20"
						>
							<span class="font-mono text-primary-600 dark:text-primary-400">{{ sg.entity_code }}</span>
							<UBadge color="gray" variant="subtle" size="xs">{{ sg.shared_labels }}</UBadge>
						</span>
					</div>
				</section>

				<!-- 6. Tương tự -->
				<section>
					<h3 class="mb-2 text-base font-semibold text-gray-800 dark:text-gray-200">6. Tương tự</h3>
				</section>
			</div>
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
