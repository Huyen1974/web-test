<script setup lang="ts">
import { readItems } from '@directus/sdk';
import { collectionMap } from '~/config/detail-sections';

const props = defineProps<{
	item: Record<string, any>;
	entityType: string;
	collection: string;
}>();

const { $directus } = useNuxtApp();

// === RULE 1: IDENTITY — show all fields ===
const hiddenFields = new Set(['id', 'sort', 'user_created', 'user_updated', 'date_updated']);
const infoFields = computed(() => {
	if (!props.item) return [];
	return Object.entries(props.item)
		.filter(([key]) => !hiddenFields.has(key))
		.map(([key, value]) => ({ key, value }));
});

// === RULE 2-3: BELONGS_TO & CONTAINS — discover from Directus relations ===
interface RelationInfo {
	field: string;
	relatedCollection: string;
	entityType: string | null;
}

const { data: relationsData } = useAsyncData(
	`discovery-relations-${props.collection}`,
	() => $fetch(`/api/discovery/relations`, { query: { collection: props.collection } }),
	{ default: () => ({ data: { m2o: [], o2m: [] } }) },
);

// M2O parent records — resolve FK fields
const m2oRelations = computed<RelationInfo[]>(() => {
	const rels = (relationsData.value as any)?.data?.m2o || [];
	// Only show relations where the item actually has a value
	return rels.filter((r: RelationInfo) => {
		const val = props.item?.[r.field];
		return val != null && val !== '';
	});
});

// For each M2O relation, fetch the parent record
const { data: parentRecords } = useAsyncData(
	`discovery-parents-${props.entityType}-${props.item?.id}`,
	async () => {
		const parents: Record<string, any> = {};
		for (const rel of m2oRelations.value) {
			const fkValue = props.item?.[rel.field];
			if (!fkValue) continue;
			try {
				const items = await $directus.request(
					readItems(rel.relatedCollection as any, {
						filter: { id: { _eq: typeof fkValue === 'object' ? fkValue.id || fkValue : fkValue } },
						fields: ['*'],
						limit: 1,
					}),
				);
				if ((items as any[])?.length > 0) {
					parents[rel.field] = (items as any[])[0];
				}
			} catch {
				// Permission denied — skip
			}
		}
		return parents;
	},
	{ default: () => ({}) },
);

// O2M child records
const o2mRelations = computed<RelationInfo[]>(() => {
	return (relationsData.value as any)?.data?.o2m || [];
});

const { data: childRecords } = useAsyncData(
	`discovery-children-${props.entityType}-${props.item?.id}`,
	async () => {
		const children: Record<string, any[]> = {};
		for (const rel of o2mRelations.value) {
			try {
				const items = await $directus.request(
					readItems(rel.relatedCollection as any, {
						filter: { [rel.field]: { _eq: props.item?.id } },
						fields: ['*'],
						limit: 20,
					}),
				);
				if ((items as any[])?.length > 0) {
					children[rel.field] = items as any[];
				}
			} catch {
				// Permission denied — skip
			}
		}
		return children;
	},
	{ default: () => ({}) },
);

// === RULE 4: USED_BY — query entity_dependencies ===
const itemCode = computed(() => props.item?.code || props.item?.process_code || props.item?.table_id || '');

const { data: deps } = useAsyncData(
	`discovery-deps-${props.entityType}-${props.item?.id}`,
	async () => {
		if (!itemCode.value) return [];
		try {
			return await $directus.request(
				readItems('entity_dependencies' as any, {
					filter: {
						_or: [{ source_code: { _eq: itemCode.value } }, { target_code: { _eq: itemCode.value } }],
					},
					fields: ['id', 'code', 'source_type', 'source_code', 'target_type', 'target_code', 'relation_type'],
					limit: 100,
				}),
			);
		} catch {
			return [];
		}
	},
	{ default: () => [] },
);

const depRows = computed(() => {
	if (!deps.value) return [];
	return (deps.value as any[]).map((dep: any) => {
		const isSource = dep.source_code === itemCode.value;
		const otherType = isSource ? dep.target_type : dep.source_type;
		const otherCode = isSource ? dep.target_code : dep.source_code;
		const direction = isSource ? '→' : '←';
		return {
			relation: `${direction} ${dep.relation_type}`,
			type: otherType,
			code: otherCode,
			_entityType: otherType,
		};
	});
});

const depColumns = [
	{ key: 'relation', label: 'Quan hệ' },
	{ key: 'type', label: 'Loại' },
	{ key: 'code', label: 'Mã' },
];

// === RULE 6: TRANSITIVE — indirect relations via BFS ===
const { data: transitiveData } = useAsyncData(
	`discovery-transitive-${props.entityType}-${props.item?.id}`,
	async () => {
		if (!itemCode.value) return null;
		try {
			return await $fetch(`/api/transitive/${encodeURIComponent(itemCode.value)}`);
		} catch {
			return null;
		}
	},
	{ default: () => null },
);

const transitiveRows = computed(() => {
	const data = transitiveData.value as any;
	if (!data?.transitive?.length) return [];
	return data.transitive.map((t: any) => ({
		code: t.code,
		type: t.type,
		depth: t.depth,
		path: t.path?.join(' → ') || '',
		_entityType: t.type,
	}));
});

const transitiveColumns = [
	{ key: 'code', label: 'Mã' },
	{ key: 'type', label: 'Loại' },
	{ key: 'depth', label: 'Độ sâu' },
	{ key: 'path', label: 'Đường đi' },
];

// === DETAIL LINKS — link to dedicated list + detail pages ===
// Map entity types to their dedicated detail page patterns
const detailPageMap: Record<string, (item: Record<string, any>) => string | null> = {
	workflow: (item) => item?.id ? `/knowledge/workflows/${item.id}` : null,
	module: (item) => item?.id ? `/knowledge/modules/${item.id}` : null,
	task: (item) => item?.id ? `/knowledge/current-tasks/${item.id}` : null,
};

const { data: detailLink } = useAsyncData(
	`discovery-detail-link-${props.entityType}`,
	async () => {
		try {
			const items = await $directus.request(
				readItems('meta_catalog' as any, {
					filter: { entity_type: { _eq: props.entityType } },
					fields: ['ui_page'],
					limit: 1,
				}),
			);
			const uiPage = (items as any[])?.[0]?.ui_page;
			// Only show if it's a dedicated page, not the generic registries listing
			if (uiPage && uiPage !== '/knowledge/registries' && !uiPage.startsWith('/knowledge/registries/')) {
				return uiPage;
			}
			return null;
		} catch {
			return null;
		}
	},
	{ default: () => null },
);

// List page URL (from meta_catalog ui_page)
const listPageUrl = computed(() => detailLink.value as string | null);

// Detail page URL (entity-specific, goes to dedicated detail page with this item)
const entityDetailUrl = computed(() => {
	const fn = detailPageMap[props.entityType];
	if (!fn) return null;
	return fn(props.item);
});

// === RULE 7: PEERS — same collection, nearby items ===
const { data: peers } = useAsyncData(
	`discovery-peers-${props.entityType}-${props.item?.id}`,
	async () => {
		if (!props.item?.id || !props.collection) return [];
		try {
			const filter: any = { id: { _neq: props.item.id } };
			// Group by classification/category if available
			if (props.item.classification) {
				filter.classification = { _eq: props.item.classification };
			} else if (props.item.category) {
				filter.category = { _eq: props.item.category };
			} else if (props.item.status) {
				filter.status = { _eq: props.item.status };
			}
			return await $directus.request(
				readItems(props.collection as any, {
					filter,
					fields: ['id', 'code', 'name', 'title', 'process_code', 'table_id', 'status'],
					limit: 10,
					sort: ['code'],
				}),
			);
		} catch {
			return [];
		}
	},
	{ default: () => [] },
);

const peerGroupLabel = computed(() => {
	if (props.item?.classification) return `classification=${props.item.classification}`;
	if (props.item?.category) return `category=${props.item.category}`;
	if (props.item?.status) return `status=${props.item.status}`;
	return '';
});

const peerRows = computed(() => {
	return (peers.value as any[]).map((p: any) => ({
		code_display: p.code || p.process_code || p.table_id || `#${p.id}`,
		name_display: p.name || p.title || '',
		status: p.status || '',
		_code: p.code || p.process_code || p.table_id || p.id,
	}));
});

// === 6 HEADINGS: Compute items for each heading ===
const belongsToItems = computed(() => {
	const items: Array<{ code: string; label: string; link: string | null }> = [];
	// From M2O parent records
	for (const rel of m2oRelations.value) {
		const parent = parentRecords.value?.[rel.field];
		if (parent) {
			const code = getParentCode(parent);
			items.push({
				code,
				label: getParentDisplay(parent),
				link: rel.entityType && code ? `/knowledge/registries/${rel.entityType}/${code}` : null,
			});
		}
	}
	// From entity_dependencies belongs_to
	for (const dep of (deps.value as any[] || [])) {
		if (dep.source_code === itemCode.value && dep.relation_type === 'belongs_to') {
			items.push({ code: dep.target_code, label: dep.target_code, link: dep.target_type ? `/knowledge/registries/${dep.target_type}/${dep.target_code}` : null });
		}
		if (dep.target_code === itemCode.value && dep.relation_type === 'contains') {
			items.push({ code: dep.source_code, label: dep.source_code, link: dep.source_type ? `/knowledge/registries/${dep.source_type}/${dep.source_code}` : null });
		}
	}
	return items;
});

const containsItems = computed(() => {
	const items: Array<{ code: string; label: string; count?: number }> = [];
	// From O2M child records
	for (const [field, children] of Object.entries(childRecords.value || {})) {
		if (children && (children as any[]).length > 0) {
			const rel = o2mRelations.value.find((r: RelationInfo) => r.field === field);
			items.push({
				code: field,
				label: getChildLabel(String(field), rel?.relatedCollection || ''),
				count: (children as any[]).length,
			});
		}
	}
	// From entity_dependencies contains
	for (const dep of (deps.value as any[] || [])) {
		if (dep.source_code === itemCode.value && dep.relation_type === 'contains') {
			items.push({ code: dep.target_code, label: dep.target_code });
		}
	}
	return items;
});

const dependsOnItems = computed(() => {
	const items: Array<{ code: string; link: string | null }> = [];
	for (const dep of (deps.value as any[] || [])) {
		if (dep.source_code === itemCode.value && dep.relation_type === 'depends_on') {
			items.push({ code: dep.target_code, link: dep.target_type ? `/knowledge/registries/${dep.target_type}/${dep.target_code}` : null });
		}
	}
	return items;
});

const usedByItems = computed(() => {
	const items: Array<{ code: string; link: string | null }> = [];
	for (const dep of (deps.value as any[] || [])) {
		if (dep.target_code === itemCode.value && dep.relation_type === 'depends_on') {
			items.push({ code: dep.source_code, link: dep.source_type ? `/knowledge/registries/${dep.source_type}/${dep.source_code}` : null });
		}
	}
	return items;
});

// Helper: get display name for a parent record
function getParentDisplay(record: any): string {
	return record?.name || record?.title || record?.code || record?.process_code || `#${record?.id}`;
}

function getParentCode(record: any): string {
	return record?.code || record?.process_code || record?.table_id || '';
}

// Helper: get label for child relation
function getChildLabel(field: string, collection: string): string {
	const entityType = Object.entries(collectionMap).find(([, c]) => c === collection)?.[0] || collection;
	return entityType.replace(/_/g, ' ');
}

function getChildColumns(items: any[]): { key: string; label: string }[] {
	if (!items.length) return [];
	const skip = new Set(['id', 'sort', 'user_created', 'user_updated', 'date_updated']);
	const keys = Object.keys(items[0]).filter((k) => !skip.has(k)).slice(0, 5);
	return keys.map((k) => ({ key: k, label: k }));
}
</script>

<template>
	<div class="space-y-6">
		<!-- IDENTITY: All fields -->
		<UCard v-if="infoFields.length > 0" :ui="{ body: { padding: 'p-0 sm:p-0' } }">
			<template #header>
				<h3 class="text-base font-semibold text-gray-900 dark:text-white">Thông tin</h3>
			</template>
			<div class="divide-y divide-gray-200 dark:divide-gray-700">
				<div v-for="field in infoFields" :key="field.key" class="flex gap-4 px-4 py-2.5 sm:px-6">
					<dt class="w-40 flex-shrink-0 text-sm font-medium text-gray-500 dark:text-gray-400">
						{{ field.key }}
					</dt>
					<dd class="text-sm text-gray-900 dark:text-white">
						<RegistriesAutoLinkedValue :value="field.value" :field-key="field.key" />
					</dd>
				</div>
			</div>
		</UCard>

		<!-- DETAIL LINKS: Link to dedicated list + detail pages -->
		<div v-if="listPageUrl || entityDetailUrl" class="flex flex-wrap items-center gap-3 rounded-lg border border-primary-200 bg-primary-50 px-4 py-3 dark:border-primary-800 dark:bg-primary-900/20">
			<UIcon name="i-heroicons-arrow-top-right-on-square" class="h-5 w-5 flex-shrink-0 text-primary-600 dark:text-primary-400" />
			<NuxtLink
				v-if="entityDetailUrl"
				:to="entityDetailUrl"
				class="text-sm font-medium text-primary-600 hover:text-primary-800 hover:underline dark:text-primary-400"
			>
				Xem chi tiet {{ itemCode || `#${item?.id}` }}
			</NuxtLink>
			<span v-if="entityDetailUrl && listPageUrl" class="text-gray-400">|</span>
			<NuxtLink
				v-if="listPageUrl"
				:to="listPageUrl"
				class="text-sm text-gray-600 hover:text-primary-600 hover:underline dark:text-gray-400 dark:hover:text-primary-400"
			>
				Danh sach {{ entityType.replace(/_/g, ' ') }}
			</NuxtLink>
		</div>

		<!-- LAYER 5 — 6 Quan hệ nhất quán -->
		<div class="mb-2 mt-4">
			<UBadge color="primary" variant="solid" size="sm">LAYER 5 — QUAN HỆ</UBadge>
		</div>

		<div class="space-y-4">
			<!-- 1. Tôi thuộc ai? -->
			<section>
				<h3 class="mb-2 text-base font-semibold text-gray-800 dark:text-gray-200">1. Tôi thuộc ai?</h3>
				<div v-if="belongsToItems.length > 0" class="space-y-1">
					<div v-for="p in belongsToItems" :key="`bt-${p.code}`" class="flex items-center gap-2 text-sm">
						<span class="text-gray-400">&rarr;</span>
						<NuxtLink v-if="p.link" :to="p.link" class="font-mono text-xs text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-200">{{ p.label }}</NuxtLink>
						<span v-else class="font-mono text-xs text-gray-400">{{ p.label }}</span>
					</div>
				</div>
			</section>

			<!-- 2. Tôi chứa gì? -->
			<section>
				<h3 class="mb-2 text-base font-semibold text-gray-800 dark:text-gray-200">2. Tôi chứa gì?</h3>
				<div v-if="containsItems.length > 0" class="space-y-1">
					<div v-for="c in containsItems" :key="`ct-${c.code}`" class="flex items-center gap-2 text-sm">
						<span class="text-gray-400">&rarr;</span>
						<span class="font-mono text-xs">{{ c.label }}</span>
						<UBadge v-if="c.count" color="gray" variant="subtle" size="xs">{{ c.count }}</UBadge>
					</div>
				</div>
			</section>

			<!-- 3. Tôi dùng ai? -->
			<section>
				<h3 class="mb-2 text-base font-semibold text-gray-800 dark:text-gray-200">3. Tôi dùng ai?</h3>
				<div v-if="dependsOnItems.length > 0" class="space-y-1">
					<div v-for="dep in dependsOnItems" :key="`do-${dep.code}`" class="flex items-center gap-2 text-sm">
						<span class="text-gray-400">&rarr;</span>
						<NuxtLink v-if="dep.link" :to="dep.link" class="font-mono text-xs text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-200">{{ dep.code }}</NuxtLink>
						<span v-else class="font-mono text-xs text-gray-400">{{ dep.code }}</span>
					</div>
				</div>
			</section>

			<!-- 4. Ai dùng tôi? -->
			<section>
				<h3 class="mb-2 text-base font-semibold text-gray-800 dark:text-gray-200">4. Ai dùng tôi?</h3>
				<div v-if="usedByItems.length > 0" class="space-y-1">
					<div v-for="dep in usedByItems" :key="`ub-${dep.code}`" class="flex items-center gap-2 text-sm">
						<span class="text-gray-400">&rarr;</span>
						<NuxtLink v-if="dep.link" :to="dep.link" class="font-mono text-xs text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-200">{{ dep.code }}</NuxtLink>
						<span v-else class="font-mono text-xs text-gray-400">{{ dep.code }}</span>
					</div>
				</div>
			</section>

			<!-- 5. Cùng nhóm -->
			<section>
				<h3 class="mb-2 text-base font-semibold text-gray-800 dark:text-gray-200">5. Cùng nhóm</h3>
				<div v-if="peerRows.length > 0" class="flex flex-wrap gap-2">
					<NuxtLink
						v-for="peer in peerRows"
						:key="peer._code"
						:to="`/knowledge/registries/${entityType}/${peer._code}`"
						class="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs hover:border-primary-300 hover:bg-primary-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-primary-600 dark:hover:bg-primary-900/20"
					>
						<span class="font-mono text-primary-600 dark:text-primary-400">{{ peer.code_display }}</span>
						<span v-if="peer.name_display" class="text-gray-500 dark:text-gray-400">{{ peer.name_display }}</span>
					</NuxtLink>
				</div>
			</section>

			<!-- 6. Tương tự -->
			<section>
				<h3 class="mb-2 text-base font-semibold text-gray-800 dark:text-gray-200">6. Tương tự</h3>
			</section>
		</div>
	</div>
</template>
