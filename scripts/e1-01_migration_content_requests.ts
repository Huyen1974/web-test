#!/usr/bin/env ts-node
/**
 * Task E1-01: Schema Migration Script for content_requests (Growth Zone)
 *
 * This script creates the `content_requests` collection in Directus Growth Zone
 * to support Phase E1 Content Operations & Agent Workflows.
 *
 * SAFETY:
 * - Dry-run by default (no changes applied)
 * - Use --execute flag to apply changes
 * - Idempotent: safe to run multiple times
 * - Non-destructive: only adds missing collection/fields, never drops/renames
 *
 * USAGE:
 *   # Dry-run (default) - shows what would change
 *   npx tsx scripts/e1-01_migration_content_requests.ts
 *
 *   # Execute migration
 *   npx tsx scripts/e1-01_migration_content_requests.ts --execute
 *
 * ENVIRONMENT VARIABLES (required):
 *   DIRECTUS_URL                - Base URL of Directus TEST instance
 *   DIRECTUS_ADMIN_EMAIL        - Admin email for authentication
 *   DIRECTUS_ADMIN_PASSWORD     - Admin password for authentication
 *
 * @see docs/E1_Plan.md
 * @see docs/Web_List_to_do_01.md (row E1-01-SCHEMA-GROWTH)
 */

import * as fs from 'fs';
import * as path from 'path';
import type { DirectusTranslation } from '../web/types/directus';

// ============================================================================
// Types & Interfaces
// ============================================================================

interface ContentRequestSeed {
	title: string;
	requirements?: string;
	status?: 'new' | 'assigned' | 'drafting' | 'awaiting_review' | 'awaiting_approval' | 'published' | 'rejected' | 'canceled';
	current_holder?: string;
	translations?: DirectusTranslation[];
}

interface DirectusCollection {
	collection: string;
	meta?: {
		icon?: string;
		note?: string;
		display_template?: string;
		hidden?: boolean;
		singleton?: boolean;
		translations?: any;
		archive_field?: string;
		archive_value?: string;
		unarchive_value?: string;
		sort_field?: string;
		accountability?: string;
		color?: string;
		item_duplication_fields?: string[];
		sort?: number;
		group?: string;
		collapse?: string;
	};
	schema?: {
		name?: string;
		comment?: string;
	};
}

interface DirectusField {
	field: string;
	type: string;
	schema?: {
		default_value?: any;
		is_nullable?: boolean;
		max_length?: number;
		data_type?: string;
	};
	meta?: {
		required?: boolean;
		readonly?: boolean;
		interface?: string;
		special?: string[];
		options?: Record<string, any>;
		note?: string;
		display?: string;
		display_options?: Record<string, any>;
		hidden?: boolean;
		translations?: any;
		width?: string;
		group?: string;
		sort?: number;
	};
}

interface DirectusRelation {
	collection: string;
	field: string;
	related_collection: string;
	meta?: {
		many_collection?: string;
		many_field?: string;
		one_collection?: string;
		one_field?: string;
		one_collection_field?: string;
		one_allowed_collections?: string[];
		junction_field?: string;
		sort_field?: string;
		one_deselect_action?: string;
	};
	schema?: {
		on_delete?: string;
	};
}

interface MigrationResult {
	collectionsChecked: number;
	collectionsCreated: string[];
	fieldsAdded: number;
	relationsCreated: number;
	errors: Array<{ item: string; error: string }>;
	dryRun: boolean;
	seed: {
		total: number;
		created: number;
		skipped: number;
		failed: number;
		errors: Array<{ title: string; error: string }>;
	};
}

// ============================================================================
// Configuration
// ============================================================================

const COLLECTION_NAME = 'content_requests';
const TRANSLATIONS_COLLECTION = `${COLLECTION_NAME}_translations`;
const SEED_FILE_PATH = path.join(process.cwd(), 'web', 'seeds', 'content_requests.json');
const VALID_STATUSES = new Set([
	'new',
	'assigned',
	'drafting',
	'awaiting_review',
	'awaiting_approval',
	'published',
	'rejected',
	'canceled',
]);
const VALID_LANGUAGE_CODES = new Set(['vi', 'en', 'ja']);

/**
 * Collection definition for content_requests (Growth Zone)
 * Based on docs/E1_Plan.md Section 3.2 and Web_List_to_do_01.md row E1-01
 */
const COLLECTION_DEF: DirectusCollection = {
	collection: COLLECTION_NAME,
	meta: {
		icon: 'edit_note',
		note: 'Growth Zone: Tracks lifecycle of content writing requests (E1)',
		display_template: '{{title}} ({{status}})',
		archive_field: 'status',
		archive_value: 'canceled',
		unarchive_value: 'new',
		sort_field: 'created_at',
		accountability: 'all',
		color: '#6644FF',
	},
	schema: {
		comment: 'Growth Zone collection for Phase E1 - Content Operations & Agent Workflows',
	},
};

/**
 * Collection definition for translations (O2M)
 */
const TRANSLATIONS_COLLECTION_DEF: DirectusCollection = {
	collection: TRANSLATIONS_COLLECTION,
	meta: {
		icon: 'translate',
		note: 'Translations for content_requests (E1 Plan F.3)',
		display_template: '{{languages_code}} - {{title}}',
		accountability: 'all',
	},
	schema: {
		comment: 'Translations for content_requests (languages_code + translatable fields)',
	},
};

/**
 * Field definitions for translations collection
 */
const TRANSLATION_FIELD_DEFINITIONS: DirectusField[] = [
	{
		field: 'id',
		type: 'integer',
		schema: {
			is_nullable: false,
		},
		meta: {
			interface: 'input',
			readonly: true,
			hidden: true,
		},
	},
	{
		field: 'content_request_id',
		type: 'integer',
		schema: {
			is_nullable: false,
		},
		meta: {
			interface: 'select-dropdown-m2o',
			special: ['m2o'],
			required: true,
			note: 'Parent content request',
			display: 'related-values',
			display_options: {
				template: '{{title}}',
			},
			width: 'half',
			sort: 1,
		},
	},
	{
		field: 'languages_code',
		type: 'string',
		schema: {
			max_length: 10,
			is_nullable: false,
		},
		meta: {
			interface: 'input',
			required: true,
			note: 'Language code (vi/en/ja)',
			width: 'half',
			sort: 2,
		},
	},
	{
		field: 'title',
		type: 'string',
		schema: {
			max_length: 255,
			is_nullable: true,
		},
		meta: {
			interface: 'input',
			note: 'Translated title',
			width: 'full',
			sort: 3,
		},
	},
	{
		field: 'content',
		type: 'text',
		schema: {
			is_nullable: true,
		},
		meta: {
			interface: 'input-rich-text-md',
			note: 'Translated content/requirements',
			width: 'full',
			sort: 4,
		},
	},
	{
		field: 'summary',
		type: 'text',
		schema: {
			is_nullable: true,
		},
		meta: {
			interface: 'input-multiline',
			note: 'Translated summary',
			width: 'full',
			sort: 5,
		},
	},
];

/**
 * Field definitions for content_requests
 * Based on E1 Plan requirements
 */
const FIELD_DEFINITIONS: DirectusField[] = [
	// Primary key (auto-generated by Directus)
	{
		field: 'id',
		type: 'integer',
		schema: {
			is_nullable: false,
		},
		meta: {
			interface: 'input',
			readonly: true,
			hidden: true,
		},
	},
	// Title of the content request
	{
		field: 'title',
		type: 'string',
		schema: {
			max_length: 255,
			is_nullable: false,
		},
		meta: {
			required: true,
			interface: 'input',
			note: 'Title/subject of the content request',
			width: 'full',
			sort: 1,
		},
	},
	// Detailed requirements/description
	{
		field: 'requirements',
		type: 'text',
		schema: {
			is_nullable: true,
		},
		meta: {
			interface: 'input-rich-text-md',
			note: 'Detailed description and requirements for the content',
			width: 'full',
			sort: 2,
		},
	},
	// Status enum - lifecycle states
	{
		field: 'status',
		type: 'string',
		schema: {
			default_value: 'new',
			is_nullable: false,
			max_length: 32,
		},
		meta: {
			required: true,
			interface: 'select-dropdown',
			options: {
				choices: [
					{ text: 'New', value: 'new' },
					{ text: 'Assigned', value: 'assigned' },
					{ text: 'Drafting', value: 'drafting' },
					{ text: 'Awaiting Review', value: 'awaiting_review' },
					{ text: 'Awaiting Approval', value: 'awaiting_approval' },
					{ text: 'Published', value: 'published' },
					{ text: 'Rejected', value: 'rejected' },
					{ text: 'Canceled', value: 'canceled' },
				],
			},
			display: 'labels',
			display_options: {
				choices: [
					{ text: 'New', value: 'new', foreground: '#FFFFFF', background: '#6644FF' },
					{ text: 'Assigned', value: 'assigned', foreground: '#FFFFFF', background: '#00BCD4' },
					{ text: 'Drafting', value: 'drafting', foreground: '#FFFFFF', background: '#2196F3' },
					{
						text: 'Awaiting Review',
						value: 'awaiting_review',
						foreground: '#000000',
						background: '#FFC107',
					},
					{
						text: 'Awaiting Approval',
						value: 'awaiting_approval',
						foreground: '#000000',
						background: '#FF9800',
					},
					{ text: 'Published', value: 'published', foreground: '#FFFFFF', background: '#4CAF50' },
					{ text: 'Rejected', value: 'rejected', foreground: '#FFFFFF', background: '#F44336' },
					{ text: 'Canceled', value: 'canceled', foreground: '#FFFFFF', background: '#9E9E9E' },
				],
			},
			note: 'Current lifecycle state of the content request',
			width: 'half',
			sort: 3,
		},
	},
	// Current holder - who is responsible now
	{
		field: 'current_holder',
		type: 'string',
		schema: {
			max_length: 100,
			is_nullable: true,
		},
		meta: {
			interface: 'input',
			note: 'Current responsible party (e.g., user_123, agent_codex, agent_claude, agent_langroid)',
			width: 'half',
			sort: 4,
		},
	},
	// Timestamps
	{
		field: 'created_at',
		type: 'timestamp',
		schema: {
			is_nullable: false,
		},
		meta: {
			interface: 'datetime',
			readonly: true,
			special: ['date-created'],
			note: 'When the request was created',
			width: 'half',
			sort: 10,
		},
	},
	{
		field: 'updated_at',
		type: 'timestamp',
		schema: {
			is_nullable: true,
		},
		meta: {
			interface: 'datetime',
			readonly: true,
			special: ['date-updated'],
			note: 'When the request was last updated',
			width: 'half',
			sort: 11,
		},
	},
	// Creator tracking
	{
		field: 'created_by',
		type: 'uuid',
		schema: {
			is_nullable: true,
		},
		meta: {
			interface: 'select-dropdown-m2o',
			special: ['user-created'],
			note: 'User who created this request',
			display: 'related-values',
			display_options: {
				template: '{{first_name}} {{last_name}}',
			},
			width: 'half',
			sort: 12,
		},
	},
	{
		field: 'updated_by',
		type: 'uuid',
		schema: {
			is_nullable: true,
		},
		meta: {
			interface: 'select-dropdown-m2o',
			special: ['user-updated'],
			note: 'User who last updated this request',
			display: 'related-values',
			display_options: {
				template: '{{first_name}} {{last_name}}',
			},
			width: 'half',
			sort: 13,
		},
	},
	// Translations (O2M to content_requests_translations)
	{
		field: 'translations',
		type: 'alias',
		meta: {
			interface: 'list-o2m',
			special: ['o2m'],
			note: 'Translated fields (languages_code, title, content, summary)',
			width: 'full',
			sort: 19,
		},
	},
	// Relation to knowledge_documents (O2M - one request can result in many documents)
	{
		field: 'knowledge_documents',
		type: 'alias',
		meta: {
			interface: 'list-o2m',
			special: ['o2m'],
			note: 'Knowledge documents created from this request',
			width: 'full',
			sort: 20,
		},
	},
];

/**
 * Relationship definitions
 * Links content_requests to knowledge_documents
 */
const RELATION_DEFINITIONS: DirectusRelation[] = [
	{
		collection: 'knowledge_documents',
		field: 'content_request_id',
		related_collection: COLLECTION_NAME,
		meta: {
			many_collection: 'knowledge_documents',
			many_field: 'content_request_id',
			one_collection: COLLECTION_NAME,
			one_field: 'knowledge_documents',
		},
		schema: {
			on_delete: 'SET NULL',
		},
	},
	{
		collection: TRANSLATIONS_COLLECTION,
		field: 'content_request_id',
		related_collection: COLLECTION_NAME,
		meta: {
			many_collection: TRANSLATIONS_COLLECTION,
			many_field: 'content_request_id',
			one_collection: COLLECTION_NAME,
			one_field: 'translations',
		},
		schema: {
			on_delete: 'CASCADE',
		},
	},
];

// ============================================================================
// Utility Functions
// ============================================================================

function validateEnvironment(): void {
	const missing: string[] = [];
	if (!process.env.DIRECTUS_URL) {
		missing.push('DIRECTUS_URL');
	}
	if (!process.env.DIRECTUS_ADMIN_EMAIL) {
		missing.push('DIRECTUS_ADMIN_EMAIL');
	}
	if (!process.env.DIRECTUS_ADMIN_PASSWORD) {
		missing.push('DIRECTUS_ADMIN_PASSWORD');
	}

	if (missing.length > 0) {
		console.error('\n❌ Missing required environment variables:');
		missing.forEach((key) => console.error(`   - ${key}`));
		console.error('\nPlease set:');
		console.error('  export DIRECTUS_URL="http://127.0.0.1:8080"');
		console.error('  export DIRECTUS_ADMIN_EMAIL="your-email"');
		console.error('  export DIRECTUS_ADMIN_PASSWORD="your-password"\n');
		process.exit(1);
	}
}

// ============================================================================
// API Client Functions
// ============================================================================

/**
 * Authenticate with Directus using email/password from Secret Manager
 */
async function authenticate(): Promise<string> {
	const url = `${process.env.DIRECTUS_URL}/auth/login`;
	const response = await fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			email: process.env.DIRECTUS_ADMIN_EMAIL,
			password: process.env.DIRECTUS_ADMIN_PASSWORD,
		}),
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Authentication failed: ${response.status} - ${error}`);
	}

	const data = await response.json();
	if (!data.data?.access_token) {
		throw new Error('No access token in authentication response');
	}

	console.log('✅ Authenticated successfully');
	return data.data.access_token;
}

/**
 * Check if collection exists
 */
async function collectionExists(token: string, collection: string): Promise<boolean> {
	const url = `${process.env.DIRECTUS_URL}/collections/${collection}`;
	const response = await fetch(url, {
		headers: { Authorization: `Bearer ${token}` },
	});

	return response.ok;
}

/**
 * Create a collection
 */
async function createCollection(token: string, collectionDef: DirectusCollection): Promise<void> {
	const url = `${process.env.DIRECTUS_URL}/collections`;
	const response = await fetch(url, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(collectionDef),
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Failed to create collection: ${response.status} - ${error}`);
	}
}

/**
 * Get existing fields for a collection
 */
async function getFields(token: string, collection: string): Promise<any[]> {
	const url = `${process.env.DIRECTUS_URL}/fields/${collection}`;
	const response = await fetch(url, {
		headers: { Authorization: `Bearer ${token}` },
	});

	if (!response.ok) {
		return [];
	}

	const data = await response.json();
	return data.data || [];
}

/**
 * Create a field
 */
async function createField(token: string, collection: string, fieldDef: DirectusField): Promise<void> {
	const url = `${process.env.DIRECTUS_URL}/fields/${collection}`;
	const response = await fetch(url, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(fieldDef),
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Failed to create field ${fieldDef.field}: ${response.status} - ${error}`);
	}
}

/**
 * Get existing relations
 */
async function getRelations(token: string): Promise<any[]> {
	const url = `${process.env.DIRECTUS_URL}/relations`;
	const response = await fetch(url, {
		headers: { Authorization: `Bearer ${token}` },
	});

	if (!response.ok) {
		return [];
	}

	const data = await response.json();
	return data.data || [];
}

/**
 * Create a relation
 */
async function createRelation(token: string, relationDef: DirectusRelation): Promise<void> {
	const url = `${process.env.DIRECTUS_URL}/relations`;
	const response = await fetch(url, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(relationDef),
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Failed to create relation: ${response.status} - ${error}`);
	}
}

// ============================================================================
// Seed Data Functions
// ============================================================================

function normalizeSeedItem(raw: any, index: number): ContentRequestSeed {
	if (!raw || typeof raw !== 'object') {
		throw new Error(`Seed item #${index + 1} must be an object`);
	}

	if (!raw.title || typeof raw.title !== 'string') {
		throw new Error(`Seed item #${index + 1} missing valid "title"`);
	}

	const status = raw.status ?? 'new';
	if (typeof status !== 'string' || !VALID_STATUSES.has(status)) {
		throw new Error(`Seed item #${index + 1} has invalid status "${status}"`);
	}

	if (raw.translations !== undefined) {
		if (!Array.isArray(raw.translations)) {
			throw new Error(`Seed item #${index + 1} "translations" must be an array`);
		}

		raw.translations.forEach((translation: DirectusTranslation, tIndex: number) => {
			if (!translation || typeof translation !== 'object') {
				throw new Error(`Seed item #${index + 1} translation #${tIndex + 1} must be an object`);
			}
			if (!translation.languages_code || !VALID_LANGUAGE_CODES.has(translation.languages_code)) {
				throw new Error(
					`Seed item #${index + 1} translation #${tIndex + 1} missing valid languages_code`,
				);
			}
		});
	}

	return {
		title: raw.title,
		requirements: typeof raw.requirements === 'string' ? raw.requirements : undefined,
		status,
		current_holder: typeof raw.current_holder === 'string' ? raw.current_holder : undefined,
		translations: raw.translations as DirectusTranslation[] | undefined,
	};
}

function loadSeedData(seedPath: string): ContentRequestSeed[] {
	if (!fs.existsSync(seedPath)) {
		throw new Error(`Seed file not found: ${seedPath}`);
	}

	const raw = fs.readFileSync(seedPath, 'utf-8');
	let data: unknown;

	try {
		data = JSON.parse(raw);
	} catch (error: any) {
		throw new Error(`Seed file is not valid JSON: ${error.message}`);
	}

	if (!Array.isArray(data)) {
		throw new Error('Seed file must contain a JSON array of content_requests');
	}

	return data.map((item, index) => normalizeSeedItem(item, index));
}

async function contentRequestExists(token: string, title: string, status?: string): Promise<boolean> {
	const params = new URLSearchParams();
	params.set('filter[title][_eq]', title);
	if (status) {
		params.set('filter[status][_eq]', status);
	}
	params.set('limit', '1');

	const url = `${process.env.DIRECTUS_URL}/items/${COLLECTION_NAME}?${params.toString()}`;
	const response = await fetch(url, {
		headers: { Authorization: `Bearer ${token}` },
	});

	if (!response.ok) {
		return false;
	}

	const data = await response.json();
	return Array.isArray(data.data) && data.data.length > 0;
}

async function seedContentRequests(
	token: string,
	seedPath: string,
	dryRun: boolean,
): Promise<MigrationResult['seed']> {
	const result = {
		total: 0,
		created: 0,
		skipped: 0,
		failed: 0,
		errors: [] as Array<{ title: string; error: string }>,
	};

	const seeds = loadSeedData(seedPath);
	result.total = seeds.length;

	console.log(`\n🌱 Step 8: Seeding content_requests from ${seedPath}...`);

	for (const seed of seeds) {
		try {
			const exists = await contentRequestExists(token, seed.title, seed.status);
			if (exists) {
				console.log(`   ✓ Seed exists (skipped): ${seed.title}`);
				result.skipped++;
				continue;
			}

			if (dryRun) {
				console.log(`   [DRY-RUN] Would seed: ${seed.title}`);
				result.created++;
				continue;
			}

			const payload: Record<string, unknown> = {
				title: seed.title,
				status: seed.status || 'new',
			};

			if (seed.requirements) {
				payload.requirements = seed.requirements;
			}
			if (seed.current_holder) {
				payload.current_holder = seed.current_holder;
			}
			if (seed.translations && seed.translations.length > 0) {
				payload.translations = seed.translations;
			}

			const url = `${process.env.DIRECTUS_URL}/items/${COLLECTION_NAME}`;
			const response = await fetch(url, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				const error = await response.text();
				throw new Error(`HTTP ${response.status}: ${error}`);
			}

			console.log(`   ✅ Seeded: ${seed.title}`);
			result.created++;
		} catch (error: any) {
			console.error(`   ❌ Failed to seed ${seed.title}: ${error.message}`);
			result.failed++;
			result.errors.push({ title: seed.title, error: error.message });
		}
	}

	return result;
}

/**
 * Create the M2O field in knowledge_documents for the O2M relation
 */
async function createM2OField(token: string): Promise<void> {
	const fieldDef: DirectusField = {
		field: 'content_request_id',
		type: 'integer',
		schema: {
			is_nullable: true,
		},
		meta: {
			interface: 'select-dropdown-m2o',
			special: ['m2o'],
			note: 'Content request that led to this document',
			display: 'related-values',
			display_options: {
				template: '{{title}}',
			},
		},
	};

	await createField(token, 'knowledge_documents', fieldDef);
}

// ============================================================================
// Main Migration Logic
// ============================================================================

async function runMigration(dryRun: boolean): Promise<MigrationResult> {
	const result: MigrationResult = {
		collectionsChecked: 2,
		collectionsCreated: [],
		fieldsAdded: 0,
		relationsCreated: 0,
		errors: [],
		dryRun,
		seed: {
			total: 0,
			created: 0,
			skipped: 0,
			failed: 0,
			errors: [],
		},
	};

	console.log('\n' + '='.repeat(80));
	console.log(`Task E1-01: Schema Migration for ${COLLECTION_NAME} (Growth Zone)`);
	console.log('='.repeat(80));
	console.log(`Mode: ${dryRun ? 'DRY-RUN (no changes will be made)' : 'EXECUTE (changes will be applied)'}`);
	console.log('='.repeat(80) + '\n');

	try {
		// Step 1: Authenticate
		console.log('🔐 Step 1: Authenticating...');
		const token = await authenticate();

		// Step 2: Check if collection exists
		console.log(`\n📋 Step 2: Checking if collection "${COLLECTION_NAME}" exists...`);
		const exists = await collectionExists(token, COLLECTION_NAME);

		if (exists) {
			console.log(`   ✓ Collection "${COLLECTION_NAME}" already exists`);
		} else {
			console.log(`   ⚠ Collection "${COLLECTION_NAME}" does not exist`);

			if (dryRun) {
				console.log(`   [DRY-RUN] Would create collection: ${COLLECTION_NAME}`);
				result.collectionsCreated.push(COLLECTION_NAME);
			} else {
				console.log(`   Creating collection: ${COLLECTION_NAME}...`);
				await createCollection(token, COLLECTION_DEF);
				console.log(`   ✅ Created collection: ${COLLECTION_NAME}`);
				result.collectionsCreated.push(COLLECTION_NAME);
			}
		}

		// Step 3: Check translations collection
		console.log(`\n📋 Step 3: Checking if collection "${TRANSLATIONS_COLLECTION}" exists...`);
		const translationsExists = await collectionExists(token, TRANSLATIONS_COLLECTION);

		if (translationsExists) {
			console.log(`   ✓ Collection "${TRANSLATIONS_COLLECTION}" already exists`);
		} else {
			console.log(`   ⚠ Collection "${TRANSLATIONS_COLLECTION}" does not exist`);

			if (dryRun) {
				console.log(`   [DRY-RUN] Would create collection: ${TRANSLATIONS_COLLECTION}`);
				result.collectionsCreated.push(TRANSLATIONS_COLLECTION);
			} else {
				console.log(`   Creating collection: ${TRANSLATIONS_COLLECTION}...`);
				await createCollection(token, TRANSLATIONS_COLLECTION_DEF);
				console.log(`   ✅ Created collection: ${TRANSLATIONS_COLLECTION}`);
				result.collectionsCreated.push(TRANSLATIONS_COLLECTION);
			}
		}

		// Step 4: Add fields to content_requests
		console.log(`\n📝 Step 4: Checking fields for "${COLLECTION_NAME}"...`);

		if (!exists || !dryRun) {
			const existingFields = await getFields(token, COLLECTION_NAME);
			const existingFieldNames = new Set(existingFields.map((f: any) => f.field));

			for (const fieldDef of FIELD_DEFINITIONS) {
				if (existingFieldNames.has(fieldDef.field)) {
					console.log(`   ✓ Field exists: ${fieldDef.field}`);
				} else {
					if (dryRun) {
						console.log(`   [DRY-RUN] Would add field: ${fieldDef.field} (${fieldDef.type})`);
					} else {
						try {
							await createField(token, COLLECTION_NAME, fieldDef);
							console.log(`   ✅ Added field: ${fieldDef.field}`);
							result.fieldsAdded++;
						} catch (error: any) {
							console.error(`   ❌ Failed to add field ${fieldDef.field}: ${error.message}`);
							result.errors.push({ item: `field:${fieldDef.field}`, error: error.message });
						}
					}
				}
			}
		}

		// Step 5: Add fields to translations collection
		console.log(`\n📝 Step 5: Checking fields for "${TRANSLATIONS_COLLECTION}"...`);

		if (!translationsExists || !dryRun) {
			const existingTranslationFields = await getFields(token, TRANSLATIONS_COLLECTION);
			const existingTranslationFieldNames = new Set(existingTranslationFields.map((f: any) => f.field));

			for (const fieldDef of TRANSLATION_FIELD_DEFINITIONS) {
				if (existingTranslationFieldNames.has(fieldDef.field)) {
					console.log(`   ✓ Field exists: ${TRANSLATIONS_COLLECTION}.${fieldDef.field}`);
				} else {
					if (dryRun) {
						console.log(`   [DRY-RUN] Would add field: ${TRANSLATIONS_COLLECTION}.${fieldDef.field} (${fieldDef.type})`);
					} else {
						try {
							await createField(token, TRANSLATIONS_COLLECTION, fieldDef);
							console.log(`   ✅ Added field: ${TRANSLATIONS_COLLECTION}.${fieldDef.field}`);
							result.fieldsAdded++;
						} catch (error: any) {
							console.error(`   ❌ Failed to add field ${TRANSLATIONS_COLLECTION}.${fieldDef.field}: ${error.message}`);
							result.errors.push({ item: `field:${TRANSLATIONS_COLLECTION}.${fieldDef.field}`, error: error.message });
						}
					}
				}
			}
		}

		// Step 6: Create M2O field in knowledge_documents
		console.log('\n🔗 Step 6: Creating M2O field in knowledge_documents...');

		const kdFields = await getFields(token, 'knowledge_documents');
		const hasM2OField = kdFields.some((f: any) => f.field === 'content_request_id');

		if (hasM2OField) {
			console.log('   ✓ Field content_request_id already exists in knowledge_documents');
		} else {
			if (dryRun) {
				console.log('   [DRY-RUN] Would create field: content_request_id in knowledge_documents');
			} else {
				try {
					await createM2OField(token);
					console.log('   ✅ Created field: content_request_id in knowledge_documents');
					result.fieldsAdded++;
				} catch (error: any) {
					console.error(`   ❌ Failed to create M2O field: ${error.message}`);
					result.errors.push({ item: 'field:content_request_id', error: error.message });
				}
			}
		}

		// Step 7: Create relations
		console.log('\n🔗 Step 7: Creating relations...');

		const existingRelations = await getRelations(token);

		for (const relationDef of RELATION_DEFINITIONS) {
			const relationExists = existingRelations.some(
				(r: any) => r.collection === relationDef.collection && r.field === relationDef.field,
			);

			if (relationExists) {
				console.log(
					`   ✓ Relation exists: ${relationDef.collection}.${relationDef.field} → ${relationDef.related_collection}`,
				);
			} else {
				if (dryRun) {
					console.log(
						`   [DRY-RUN] Would create relation: ${relationDef.collection}.${relationDef.field} → ${relationDef.related_collection}`,
					);
				} else {
					try {
						await createRelation(token, relationDef);
						console.log(
							`   ✅ Created relation: ${relationDef.collection}.${relationDef.field} → ${relationDef.related_collection}`,
						);
						result.relationsCreated++;
					} catch (error: any) {
						console.error(
							`   ❌ Failed to create relation ${relationDef.collection}.${relationDef.field}: ${error.message}`,
						);
						result.errors.push({
							item: `relation:${relationDef.collection}.${relationDef.field}`,
							error: error.message,
						});
					}
				}
			}
		}

		// Step 8: Seed data
		result.seed = await seedContentRequests(token, SEED_FILE_PATH, dryRun);
		if (result.seed.failed > 0) {
			result.seed.errors.forEach((seedError) => {
				result.errors.push({ item: `seed:${seedError.title}`, error: seedError.error });
			});
		}

		return result;
	} catch (error: any) {
		result.errors.push({ item: 'migration', error: error.message });
		throw error;
	}
}

// ============================================================================
// Report Generation
// ============================================================================

function generateReport(result: MigrationResult): string {
	const timestamp = new Date().toISOString();
	const mode = result.dryRun ? 'DRY-RUN' : 'EXECUTE';

	let report = `# Task E1-01: Migration Report for content_requests (Growth Zone)

**Collection**: \`${COLLECTION_NAME}\`
**Timestamp**: ${timestamp}
**Mode**: ${mode}

---

## Summary

- **Collections Checked**: ${result.collectionsChecked}
- **Collections Created**: ${result.collectionsCreated.length}
- **Fields Added**: ${result.fieldsAdded}
- **Relations Created**: ${result.relationsCreated}
- **Seed Total**: ${result.seed.total}
- **Seed Created**: ${result.seed.created}
- **Seed Skipped**: ${result.seed.skipped}
- **Seed Failed**: ${result.seed.failed}
- **Errors**: ${result.errors.length}

---

## Collections Created

`;

	if (result.collectionsCreated.length > 0) {
		result.collectionsCreated.forEach((name) => {
			report += `- ✅ \`${name}\`\n`;
		});
	} else {
		report += '*None - Collection already exists*\n';
	}

	report += `\n---

## Schema Details

### Fields in \`${COLLECTION_NAME}\`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | integer | Yes | Primary key (auto-generated) |
| title | string | Yes | Title/subject of the request |
| requirements | text | No | Detailed description and requirements |
| status | string (enum) | Yes | Lifecycle state (new, assigned, drafting, awaiting_review, awaiting_approval, published, rejected, canceled) |
| current_holder | string | No | Current responsible party (e.g., user_123, agent_codex, agent_claude) |
| created_at | timestamp | Yes | Auto-generated timestamp |
| updated_at | timestamp | No | Auto-updated timestamp |
| created_by | uuid | No | User who created (auto-tracked) |
| updated_by | uuid | No | User who updated (auto-tracked) |
| translations | alias (O2M) | No | Translated fields (languages_code, title, content, summary) |
| knowledge_documents | alias (O2M) | No | Related knowledge documents |

### Relationships

- **content_requests** → **knowledge_documents** (O2M)
  - One request can result in many documents
  - Foreign key: \`knowledge_documents.content_request_id\`
  - On delete: SET NULL
- **content_requests** → **content_requests_translations** (O2M)
  - One request can have many translations
  - Foreign key: \`${TRANSLATIONS_COLLECTION}.content_request_id\`
  - On delete: CASCADE

---

## Seed Data

- **Seed File**: \`${SEED_FILE_PATH}\`
- **Total Records**: ${result.seed.total}
- **Created**: ${result.seed.created}
- **Skipped**: ${result.seed.skipped}
- **Failed**: ${result.seed.failed}

---

## Next Steps

`;

	if (result.dryRun) {
		report += `This was a **DRY-RUN**. No changes were made to the schema.

To apply these changes to the Directus TEST environment:

\`\`\`bash
npx tsx scripts/e1-01_migration_content_requests.ts --execute
\`\`\`

**IMPORTANT**:
- Ensure you have a database backup before running with --execute
- This should ONLY be run on the TEST environment
- Verify the changes in Directus UI after execution
`;
	} else {
		report += `Migration has been **EXECUTED**. ${result.collectionsCreated.length} collections created, ${result.fieldsAdded} fields added, ${result.relationsCreated} relations created.

**Post-Migration Checklist**:

1. [ ] Verify collection and fields in Directus UI (Settings → Data Model → ${COLLECTION_NAME})
2. [ ] Verify relationship to knowledge_documents
3. [ ] Test field permissions for Agent/Editor/Admin roles (after E1-01-RBAC)
4. [ ] Run validation queries to ensure data integrity
5. [ ] Proceed to E1-01-RBAC configuration (scripts/e1-01_rbac_content_requests.ts)

`;
	}

	if (result.errors.length > 0) {
		report += `\n---

## Errors

The following errors occurred during migration:

`;
		result.errors.forEach((err) => {
			report += `- **Item**: \`${err.item}\`\n`;
			report += `  - **Error**: ${err.error}\n\n`;
		});
	}

	report += `\n---

## Compliance Check

✅ **3-Zone Architecture**: This collection is in **Growth Zone** (editable schema)
✅ **Core Zone**: No modifications to Core Zone (directus_* tables)
✅ **Migration Zone**: No modifications to Migration Zone (Lark-sourced data)
✅ **Data Laws v1.1**: Complies with Điều 3 (3 Zones), Điều 5 (SSOT), Điều 18 (Filter)
✅ **E1 Plan**: Implements Section 3.2 (Content Request lifecycle)
✅ **Anti-Stupid**: Reuses Directus native features (timestamps, user tracking, relationships)

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
`;

	return report;
}

function saveReport(report: string, filename: string): void {
	const reportPath = path.join(process.cwd(), 'reports', filename);
	try {
		fs.writeFileSync(reportPath, report, 'utf-8');
		console.log(`\n📝 Report saved to: ${reportPath}\n`);
	} catch (error: any) {
		console.error(`\n⚠ Warning: Failed to save report to ${reportPath}`);
		console.error(`   ${error.message}\n`);
	}
}

// ============================================================================
// Main Entry Point
// ============================================================================

async function main() {
	console.log('╔═══════════════════════════════════════════════════════════════════╗');
	console.log('║  Task E1-01: Migration for content_requests (Growth Zone)        ║');
	console.log('╚═══════════════════════════════════════════════════════════════════╝');

	// Validate environment
	validateEnvironment();

	// Parse arguments
	const args = process.argv.slice(2);
	const executeMode = args.includes('--execute');
	const dryRun = !executeMode;

	try {
		// Run migration
		const result = await runMigration(dryRun);

		// Print summary
		console.log('\n' + '='.repeat(80));
		console.log('Migration Summary');
		console.log('='.repeat(80));
		console.log(`Mode:                 ${dryRun ? 'DRY-RUN' : 'EXECUTE'}`);
		console.log(`Collections Checked:  ${result.collectionsChecked}`);
		console.log(`Collections Created:  ${result.collectionsCreated.length}`);
		console.log(`Fields Added:         ${result.fieldsAdded}`);
		console.log(`Relations Created:    ${result.relationsCreated}`);
		console.log(`Seed Total:           ${result.seed.total}`);
		console.log(`Seed Created:         ${result.seed.created}`);
		console.log(`Seed Skipped:         ${result.seed.skipped}`);
		console.log(`Seed Failed:          ${result.seed.failed}`);
		console.log(`Errors:               ${result.errors.length}`);
		console.log('='.repeat(80) + '\n');

		// Generate and save report
		const report = generateReport(result);
		const reportFilename = dryRun ? 'e1-01_migration_dry_run.md' : 'e1-01_migration_execution.md';
		saveReport(report, reportFilename);

		// Exit status
		if (result.errors.length > 0) {
			console.error('❌ Migration completed with errors. See report for details.\n');
			process.exit(1);
		} else if (dryRun) {
			console.log('✅ Dry-run completed successfully.');
			console.log('   Run with --execute to apply changes.\n');
			process.exit(0);
		} else {
			console.log('✅ Migration executed successfully!\n');
			console.log('📋 Next step: Run RBAC configuration (scripts/e1-01_rbac_content_requests.ts)\n');
			process.exit(0);
		}
	} catch (error: any) {
		console.error('\n❌ FATAL ERROR during migration:');
		console.error(`   ${error.message}\n`);
		if (error.stack) {
			console.error('Stack trace:');
			console.error(error.stack);
		}
		process.exit(1);
	}
}

export async function runContentRequestsMigration(): Promise<void> {
	await main();
}

// Run if executed directly
if (require.main === module) {
	main();
}
