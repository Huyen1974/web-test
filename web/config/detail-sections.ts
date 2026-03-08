/**
 * Section configuration for Layer 3 detail pages.
 * Each entity type has an array of sections that render in order.
 * Adding a new entity type = adding a new config block here. No new components needed.
 *
 * Section types:
 *   - "fields": Key-value display of item fields (SectionFields)
 *   - "relation": Query related collection → table of linked items (SectionRelation)
 *   - "dependency": Query entity_dependencies → cross-reference links (SectionDependency)
 */

export interface FieldsSectionConfig {
	id: string;
	type: 'fields';
	label: string;
	fields: string[];
}

export interface RelationSectionConfig {
	id: string;
	type: 'relation';
	label: string;
	/** Collection to query */
	collection: string;
	/** Foreign key field in the related collection pointing to this item (one-to-many) */
	foreignKey: string;
	/** Local key field in this item pointing to the related collection's ID (many-to-one). When set, queries related collection with filter: { id: { _eq: item[localKey] } } */
	localKey?: string;
	/** Fields to display from the related items */
	displayFields: string[];
	/** Entity type for linking related items (used to build /knowledge/registries/{type}/{code} URLs) */
	linkEntityType?: string;
	/** Field in related item containing the code for linking */
	linkCodeField?: string;
	/** Sort field */
	sort?: string;
	/** If true, show count only instead of full table */
	countOnly?: boolean;
}

export interface DependencySectionConfig {
	id: string;
	type: 'dependency';
	label: string;
	/** "forward" = this item is source, "reverse" = this item is target, "both" = either */
	direction: 'forward' | 'reverse' | 'both';
}

export type SectionConfig = FieldsSectionConfig | RelationSectionConfig | DependencySectionConfig;

export const sectionConfig: Record<string, SectionConfig[]> = {
	checkpoint_type: [
		{
			id: 'info',
			type: 'fields',
			label: 'Thong tin co ban',
			fields: ['code', 'name', 'legacy_code', 'description', 'layer', 'domain', 'category', 'status'],
		},
		{
			id: 'sets',
			type: 'relation',
			label: 'Thuoc to hop (Checkpoint Sets)',
			collection: 'checkpoint_set_items',
			foreignKey: 'type_id',
			displayFields: ['set_id.code', 'set_id.name'],
			linkEntityType: 'checkpoint_set',
			linkCodeField: 'set_id.code',
		},
		{
			id: 'deps',
			type: 'dependency',
			label: 'Lien ket',
			direction: 'both',
		},
	],

	checkpoint_set: [
		{
			id: 'info',
			type: 'fields',
			label: 'Thong tin to hop',
			fields: ['code', 'name', 'description', 'applicable_to', 'status', 'date_created'],
		},
		{
			id: 'items',
			type: 'relation',
			label: 'Chua Checkpoints',
			collection: 'checkpoint_set_items',
			foreignKey: 'set_id',
			displayFields: ['type_id.code', 'type_id.name', 'sort_order', 'is_required'],
			linkEntityType: 'checkpoint_type',
			linkCodeField: 'type_id.code',
			sort: 'sort_order',
		},
		{
			id: 'deps',
			type: 'dependency',
			label: 'Lien ket',
			direction: 'both',
		},
	],

	workflow: [
		{
			id: 'info',
			type: 'fields',
			label: 'Thong tin quy trinh',
			fields: ['process_code', 'title', 'description', 'level', 'status', 'date_created'],
		},
		{
			id: 'steps',
			type: 'relation',
			label: 'Cac buoc (Nodes)',
			collection: 'workflow_steps',
			foreignKey: 'workflow_id',
			displayFields: ['code', 'title', 'sort_order', 'step_type'],
			linkEntityType: 'workflow_step',
			linkCodeField: 'code',
			sort: 'sort_order',
		},
		{
			id: 'wcrs',
			type: 'relation',
			label: 'De xuat thay doi',
			collection: 'workflow_change_requests',
			foreignKey: 'workflow_id',
			displayFields: ['title', 'status', 'change_type', 'date_created'],
		},
		{
			id: 'deps',
			type: 'dependency',
			label: 'Lien ket',
			direction: 'both',
		},
	],

	workflow_step: [
		{
			id: 'info',
			type: 'fields',
			label: 'Thong tin Node',
			fields: ['code', 'title', 'description', 'sort_order', 'step_type'],
		},
		{
			id: 'workflow',
			type: 'relation',
			label: 'Thuoc quy trinh',
			collection: 'workflows',
			foreignKey: 'id',
			localKey: 'workflow_id',
			displayFields: ['process_code', 'title', 'status'],
			linkEntityType: 'workflow',
			linkCodeField: 'process_code',
		},
		{
			id: 'deps_forward',
			type: 'dependency',
			label: 'Lien ket toi',
			direction: 'forward',
		},
		{
			id: 'deps_reverse',
			type: 'dependency',
			label: 'Duoc lien ket boi',
			direction: 'reverse',
		},
	],

	dot_tool: [
		{
			id: 'info',
			type: 'fields',
			label: 'Thong tin DOT Tool',
			fields: ['code', 'name', 'description', 'category', 'token_type', 'script_path', 'status'],
		},
		{
			id: 'deps',
			type: 'dependency',
			label: 'Lien ket',
			direction: 'both',
		},
	],

	collection: [
		{
			id: 'info',
			type: 'fields',
			label: 'Thong tin Collection',
			fields: ['code', 'collection_name', 'name', 'description', 'classification', 'status'],
		},
		{
			id: 'deps',
			type: 'dependency',
			label: 'Lien ket',
			direction: 'both',
		},
	],

	page: [
		{
			id: 'info',
			type: 'fields',
			label: 'Thong tin trang',
			fields: ['code', 'name', 'description', 'route_path', 'page_file', 'module', 'status'],
		},
	],

	module: [
		{
			id: 'info',
			type: 'fields',
			label: 'Thong tin Module',
			fields: ['code', 'name', 'description', 'status'],
		},
	],

	agent: [
		{
			id: 'info',
			type: 'fields',
			label: 'Thong tin Agent',
			fields: ['code', 'name', 'description', 'agent_type', 'status'],
		},
	],

	entity_dependency: [
		{
			id: 'info',
			type: 'fields',
			label: 'Thong tin lien ket',
			fields: [
				'code',
				'source_type',
				'source_code',
				'target_type',
				'target_code',
				'relation_type',
				'direction',
				'auto_detected',
				'confidence',
				'status',
			],
		},
	],

	wcr: [
		{
			id: 'info',
			type: 'fields',
			label: 'Thong tin de xuat',
			fields: ['title', 'description', 'change_type', 'status', 'date_created'],
		},
	],

	task: [
		{
			id: 'info',
			type: 'fields',
			label: 'Thong tin Task',
			fields: ['name', 'description', 'priority', 'status', 'task_type', 'date_created'],
		},
	],

	catalog: [
		{
			id: 'info',
			type: 'fields',
			label: 'Thong tin danh muc',
			fields: ['code', 'name', 'entity_type', 'registry_collection', 'record_count', 'source_model', 'layer', 'status'],
		},
	],

	table: [
		{
			id: 'info',
			type: 'fields',
			label: 'Thong tin bang',
			fields: ['table_id', 'name', 'collection', 'description', 'status'],
		},
	],
};

/** PREFIX → entityType mapping for auto-linking */
export const prefixMap: Record<string, string> = {
	CP: 'checkpoint_type',
	CPS: 'checkpoint_set',
	WF: 'workflow',
	ND: 'workflow_step',
	DOT: 'dot_tool',
	COL: 'collection',
	PG: 'page',
	MOD: 'module',
	AGT: 'agent',
	DEP: 'entity_dependency',
	WCR: 'wcr',
	CAT: 'catalog',
	TD: 'task',
};

/** entityType → collection name mapping */
export const collectionMap: Record<string, string> = {
	catalog: 'meta_catalog',
	table: 'table_registry',
	module: 'modules',
	workflow: 'workflows',
	workflow_step: 'workflow_steps',
	wcr: 'workflow_change_requests',
	dot_tool: 'dot_tools',
	page: 'ui_pages',
	collection: 'collection_registry',
	task: 'tasks',
	agent: 'agents',
	checkpoint_type: 'checkpoint_types',
	checkpoint_set: 'checkpoint_sets',
	entity_dependency: 'entity_dependencies',
};

/** entityType → primary code field (used for URL lookups) */
export const codeFieldMap: Record<string, string> = {
	workflow: 'process_code',
	table: 'table_id',
};

/** Get the code field name for an entity type (defaults to "code") */
export function getCodeField(entityType: string): string {
	return codeFieldMap[entityType] || 'code';
}
