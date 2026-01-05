/**
 * Fix Globals Schema - Add Missing Fields & Seed Data
 *
 * MISSION: Fix the Globals Schema to achieve 100% GREEN verification status
 * CONTEXT: Task 9 verification detected missing fields in globals collection
 *
 * OPERATIONS:
 * 1. Schema Patch - Create missing fields if they don't exist:
 *    - project_name (String)
 *    - project_description (String)
 *    - google_analytics_id (String)
 * 2. Content Patch - Update globals singleton with data
 *
 * IDEMPOTENCY: Checks if fields exist before creating. Safe to run multiple times.
 *
 * Usage:
 *   npx tsx web/scripts/fix_globals_schema.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../.env') });

const DIRECTUS_URL = process.env.NUXT_PUBLIC_DIRECTUS_URL;
const ADMIN_EMAIL = process.env.DIRECTUS_ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.DIRECTUS_ADMIN_PASSWORD || 'Directus@2025!';

interface DirectusField {
	field: string;
	type: string;
	schema?: {
		name?: string;
		data_type?: string;
	};
	meta?: {
		interface?: string;
		options?: unknown;
		display?: string;
		readonly?: boolean;
		hidden?: boolean;
	};
}

interface FieldDefinition {
	field: string;
	type: string;
	meta: {
		interface: string;
		options: unknown;
		display: string;
		readonly: boolean;
		hidden: boolean;
		width: string;
	};
	schema: {
		name: string;
		data_type: string;
		max_length: number | null;
		is_nullable: boolean;
		default_value: string | null;
	};
}

interface GlobalsData {
	project_name?: string;
	project_description?: string;
	google_analytics_id?: string;
}

const REQUIRED_FIELDS: Record<string, FieldDefinition> = {
	project_name: {
		field: 'project_name',
		type: 'string',
		meta: {
			interface: 'input',
			options: {},
			display: 'raw',
			readonly: false,
			hidden: false,
			width: 'full',
		},
		schema: {
			name: 'project_name',
			data_type: 'varchar',
			max_length: 255,
			is_nullable: true,
			default_value: null,
		},
	},
	project_description: {
		field: 'project_description',
		type: 'text',
		meta: {
			interface: 'input-multiline',
			options: {},
			display: 'raw',
			readonly: false,
			hidden: false,
			width: 'full',
		},
		schema: {
			name: 'project_description',
			data_type: 'text',
			max_length: null,
			is_nullable: true,
			default_value: null,
		},
	},
	google_analytics_id: {
		field: 'google_analytics_id',
		type: 'string',
		meta: {
			interface: 'input',
			options: {},
			display: 'raw',
			readonly: false,
			hidden: false,
			width: 'half',
		},
		schema: {
			name: 'google_analytics_id',
			data_type: 'varchar',
			max_length: 100,
			is_nullable: true,
			default_value: null,
		},
	},
};

const GLOBALS_DATA: GlobalsData = {
	project_name: 'Agency OS E1',
	project_description: 'AI-Powered Agency Operating System',
	google_analytics_id: 'UA-XXXXX-Y', // Placeholder - replace with real ID
};

/**
 * Authenticate as Admin
 */
async function authenticateAdmin(): Promise<string> {
	console.log('  Authenticating as Admin...');
	const response = await fetch(`${DIRECTUS_URL}/auth/login`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			email: ADMIN_EMAIL,
			password: ADMIN_PASSWORD,
		}),
	});

	if (!response.ok) {
		const text = await response.text();
		throw new Error(`Admin authentication failed: ${response.status} - ${text}`);
	}

	const data = await response.json();
	console.log('  ✅ Admin authenticated');
	return data.data.access_token as string;
}

/**
 * Get existing fields in globals collection
 */
async function getGlobalsFields(token: string): Promise<Set<string>> {
	console.log('  Fetching existing globals fields...');

	const response = await fetch(`${DIRECTUS_URL}/fields/globals`, {
		method: 'GET',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
	});

	if (!response.ok) {
		const text = await response.text();
		throw new Error(`Failed to fetch globals fields: ${response.status} - ${text}`);
	}

	const data = await response.json();
	const fields = data.data as DirectusField[];
	const fieldNames = new Set(fields.map((f) => f.field));

	console.log(`  ℹ️  Found ${fieldNames.size} existing fields: ${Array.from(fieldNames).join(', ')}`);
	return fieldNames;
}

/**
 * Create a field in globals collection
 */
async function createField(token: string, fieldDef: FieldDefinition): Promise<void> {
	console.log(`  Creating field: ${fieldDef.field}...`);

	const response = await fetch(`${DIRECTUS_URL}/fields/globals`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(fieldDef),
	});

	if (!response.ok) {
		const text = await response.text();

		// Check if error is "field already exists" - this is OK (idempotency)
		if (text.includes('already exists') || text.includes('duplicate') || response.status === 409) {
			console.log(`  ℹ️  Field '${fieldDef.field}' already exists (skipped)`);
			return;
		}

		throw new Error(`Failed to create field ${fieldDef.field}: ${response.status} - ${text}`);
	}

	console.log(`  ✅ Field '${fieldDef.field}' created`);
}

/**
 * Update globals singleton with data
 */
async function updateGlobalsData(token: string, data: GlobalsData): Promise<void> {
	console.log('  Updating globals singleton with data...');

	const response = await fetch(`${DIRECTUS_URL}/items/globals`, {
		method: 'PATCH',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(data),
	});

	if (!response.ok) {
		const text = await response.text();
		throw new Error(`Failed to update globals data: ${response.status} - ${text}`);
	}

	const result = await response.json();
	console.log('  ✅ Globals data updated successfully');
	console.log(`     - project_name: "${result.data.project_name}"`);
	console.log(`     - project_description: "${result.data.project_description}"`);
	console.log(`     - google_analytics_id: "${result.data.google_analytics_id}"`);
}

/**
 * Main repair function
 */
async function fixGlobalsSchema(): Promise<void> {
	console.log('='.repeat(80));
	console.log('Fix Globals Schema - Add Missing Fields & Seed Data');
	console.log('='.repeat(80));
	console.log();

	try {
		// Step 1: Authenticate
		console.log('Step 1: Admin Authentication');
		const token = await authenticateAdmin();
		console.log();

		// Step 2: Get existing fields
		console.log('Step 2: Audit Existing Schema');
		const existingFields = await getGlobalsFields(token);
		console.log();

		// Step 3: Create missing fields
		console.log('Step 3: Schema Patch (Create Missing Fields)');
		let fieldsCreated = 0;
		let fieldsSkipped = 0;

		for (const [fieldName, fieldDef] of Object.entries(REQUIRED_FIELDS)) {
			if (existingFields.has(fieldName)) {
				console.log(`  ℹ️  Field '${fieldName}' already exists (skipped)`);
				fieldsSkipped++;
			} else {
				await createField(token, fieldDef);
				fieldsCreated++;
			}
		}

		console.log();
		console.log(`  Summary: ${fieldsCreated} fields created, ${fieldsSkipped} already existed`);
		console.log();

		// Step 4: Update globals data
		console.log('Step 4: Content Patch (Seed Data)');
		await updateGlobalsData(token, GLOBALS_DATA);
		console.log();

		console.log('='.repeat(80));
		console.log('✅ Globals Schema Fix Complete');
		console.log('='.repeat(80));
		console.log();
		console.log('Summary:');
		console.log(`  - Fields ensured: ${Object.keys(REQUIRED_FIELDS).join(', ')}`);
		console.log(`  - Fields created: ${fieldsCreated}`);
		console.log(`  - Fields existing: ${fieldsSkipped}`);
		console.log(`  - Data seeded: ${Object.keys(GLOBALS_DATA).length} values`);
		console.log();
		console.log('Next Steps:');
		console.log('  1. Run verification script to confirm 100% GREEN:');
		console.log('     npx tsx web/scripts/e1-09_final_verification.ts');
		console.log('  2. Update google_analytics_id placeholder with real GA tracking ID');
	} catch (error) {
		console.error('❌ Schema fix failed:', error);
		throw error;
	}
}

// Run the script
fixGlobalsSchema().catch((error) => {
	console.error('Script failed:', error);
	process.exit(1);
});
