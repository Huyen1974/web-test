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
	`discovery-deps-${itemCode.value}`,
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
	{ key: 'relation', label: 'Quan he' },
	{ key: 'type', label: 'Loai' },
	{ key: 'code', label: 'Ma' },
];

// === RULE 5: PEERS — same collection, same classification ===
const { data: peers } = useAsyncData(
	`discovery-peers-${props.entityType}-${props.item?.id}`,
	async () => {
		if (!props.item?.id) return [];
		try {
			const filter: any = { id: { _neq: props.item.id } };
			// Group by classification if available
			if (props.item.classification) {
				filter.classification = { _eq: props.item.classification };
			} else if (props.item.category) {
				filter.category = { _eq: props.item.category };
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

const peerColumns = [
	{ key: 'code_display', label: 'Ma' },
	{ key: 'name_display', label: 'Ten' },
	{ key: 'status', label: 'Trang thai' },
];

const peerRows = computed(() => {
	return (peers.value as any[]).map((p: any) => ({
		code_display: p.code || p.process_code || p.table_id || `#${p.id}`,
		name_display: p.name || p.title || '',
		status: p.status || '',
		_code: p.code || p.process_code || p.table_id || p.id,
	}));
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
				<h3 class="text-base font-semibold text-gray-900 dark:text-white">Thong tin</h3>
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

		<!-- BELONGS_TO: Parent records -->
		<UCard
			v-for="rel in m2oRelations"
			:key="rel.field"
			v-show="parentRecords?.[rel.field]"
		>
			<template #header>
				<h3 class="text-base font-semibold text-gray-900 dark:text-white">
					Thuoc ve: {{ rel.relatedCollection.replace(/_/g, ' ') }}
				</h3>
			</template>
			<div v-if="parentRecords?.[rel.field]" class="flex items-center gap-3">
				<NuxtLink
					v-if="rel.entityType && getParentCode(parentRecords[rel.field])"
					:to="`/knowledge/registries/${rel.entityType}/${getParentCode(parentRecords[rel.field])}`"
					class="font-medium text-primary-600 hover:text-primary-800 dark:text-primary-400 hover:underline"
				>
					{{ getParentDisplay(parentRecords[rel.field]) }}
				</NuxtLink>
				<span v-else class="text-sm text-gray-900 dark:text-white">
					{{ getParentDisplay(parentRecords[rel.field]) }}
				</span>
			</div>
		</UCard>

		<!-- CONTAINS: Child records -->
		<UCard
			v-for="(items, field) in childRecords"
			:key="field"
			v-show="items && items.length > 0"
		>
			<template #header>
				<div class="flex items-center gap-2">
					<h3 class="text-base font-semibold text-gray-900 dark:text-white">
						Chua: {{ getChildLabel(String(field), o2mRelations.find(r => r.field === field)?.relatedCollection || '') }}
					</h3>
					<UBadge color="gray" variant="subtle" size="xs">{{ items.length }}</UBadge>
				</div>
			</template>
			<UTable
				:columns="getChildColumns(items)"
				:rows="items"
				:ui="{ td: { padding: 'py-2 px-3' }, th: { padding: 'py-2 px-3' } }"
			/>
		</UCard>

		<!-- USED_BY: Entity dependencies -->
		<UCard v-if="depRows.length > 0">
			<template #header>
				<div class="flex items-center gap-2">
					<h3 class="text-base font-semibold text-gray-900 dark:text-white">Lien ket</h3>
					<UBadge color="gray" variant="subtle" size="xs">{{ depRows.length }}</UBadge>
				</div>
			</template>
			<UTable :columns="depColumns" :rows="depRows" :ui="{ td: { padding: 'py-2 px-3' }, th: { padding: 'py-2 px-3' } }">
				<template #cell-code="{ row }">
					<NuxtLink
						:to="`/knowledge/registries/${row._entityType}/${row.code}`"
						class="font-medium text-primary-600 hover:text-primary-800 dark:text-primary-400 hover:underline"
					>
						{{ row.code }}
					</NuxtLink>
				</template>
			</UTable>
		</UCard>

		<!-- PEERS: Same collection, same classification -->
		<UCard v-if="peerRows.length > 0">
			<template #header>
				<div class="flex items-center gap-2">
					<h3 class="text-base font-semibold text-gray-900 dark:text-white">Cung nhom</h3>
					<UBadge color="gray" variant="subtle" size="xs">{{ peerRows.length }}</UBadge>
				</div>
			</template>
			<UTable :columns="peerColumns" :rows="peerRows" :ui="{ td: { padding: 'py-2 px-3' }, th: { padding: 'py-2 px-3' } }">
				<template #cell-code_display="{ row }">
					<NuxtLink
						:to="`/knowledge/registries/${entityType}/${row._code}`"
						class="font-medium text-primary-600 hover:text-primary-800 dark:text-primary-400 hover:underline"
					>
						{{ row.code_display }}
					</NuxtLink>
				</template>
			</UTable>
		</UCard>
	</div>
</template>
