#!/usr/bin/env ts-node
/**
 * Task E1-01: Add Folder/Tree Self-Referencing Relation to knowledge_documents
 *
 * This script adds/updates the parent_document_id field to be a proper
 * self-referencing M2O relationship, enabling folder/tree structure
 * (like Google Drive) as required by E1 Plan Section 3.1 and Blog E1.A.
 *
 * SAFETY:
 * - Dry-run by default (no changes applied)
 * - Use --execute flag to apply changes
 * - Idempotent: safe to run multiple times
 * - Works with existing parent_document_id UUID field from Task 0047C
 *
 * USAGE:
 *   # Dry-run (default)
 *   npx tsx scripts/e1-01_add_folder_relation.ts
 *
 *   # Execute
 *   npx tsx scripts/e1-01_add_folder_relation.ts --execute
 *
 * ENVIRONMENT VARIABLES (required):
 *   DIRECTUS_URL                - Base URL of Directus TEST instance
 *   DIRECTUS_ADMIN_EMAIL        - Admin email for authentication
 *   DIRECTUS_ADMIN_PASSWORD     - Admin password for authentication
 *
 * @see docs/E1_Plan.md (Section 3.1 - Folder Management)
 * @see docs/E1_Plan.md (Blog E1.A - Folder/Tree)
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Types & Interfaces
// ============================================================================

interface DirectusField {
	field: string;
	type: string;
	schema?: {
		default_value?: any;
		is_nullable?: boolean;
		max_length?: number;
		data_type?: string;
		foreign_key_table?: string;
		foreign_key_column?: string;
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
	fieldUpdated: boolean;
	relationCreated: boolean;
	o2mCreated: boolean;
	errors: Array<{ item: string; error: string }>;
	dryRun: boolean;
}

// ============================================================================
// Configuration
// ============================================================================

const COLLECTION_NAME = 'knowledge_documents';
const M2O_FIELD_NAME = 'parent_document_id';
const O2M_FIELD_NAME = 'children';

// ============================================================================
// Utility Functions
// ============================================================================

function validateEnvironment(): void {
	const required = ['DIRECTUS_URL', 'DIRECTUS_ADMIN_EMAIL', 'DIRECTUS_ADMIN_PASSWORD'];
	const missing = required.filter((key) => !process.env[key]);

	if (missing.length > 0) {
		console.error('\n❌ Missing required environment variables:');
		missing.forEach((key) => console.error(`   - ${key}`));
		process.exit(1);
	}
}

// ============================================================================
// API Client Functions
// ============================================================================

/**
 * Authenticate with Directus using email/password
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
 * Get field info
 */
async function getField(token: string, collection: string, field: string): Promise<any | null> {
	const url = `${process.env.DIRECTUS_URL}/fields/${collection}/${field}`;
	const response = await fetch(url, {
		headers: { Authorization: `Bearer ${token}` },
	});

	if (!response.ok) {
		return null;
	}

	const data = await response.json();
	return data.data;
}

/**
 * Update field meta
 */
async function updateField(token: string, collection: string, fieldDef: DirectusField): Promise<void> {
	const url = `${process.env.DIRECTUS_URL}/fields/${collection}/${fieldDef.field}`;
	const response = await fetch(url, {
		method: 'PATCH',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			meta: fieldDef.meta,
		}),
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Failed to update field: ${response.status} - ${error}`);
	}
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
		throw new Error(`Failed to create field: ${response.status} - ${error}`);
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
// Main Migration Logic
// ============================================================================

async function runMigration(dryRun: boolean): Promise<MigrationResult> {
	const result: MigrationResult = {
		fieldUpdated: false,
		relationCreated: false,
		o2mCreated: false,
		errors: [],
		dryRun,
	};

	console.log('\n' + '='.repeat(80));
	console.log(`Task E1-01: Add Folder/Tree Relation to ${COLLECTION_NAME}`);
	console.log('='.repeat(80));
	console.log(`Mode: ${dryRun ? 'DRY-RUN (no changes will be made)' : 'EXECUTE (changes will be applied)'}`);
	console.log('='.repeat(80) + '\n');

	try {
		// Step 1: Authenticate
		console.log('🔐 Step 1: Authenticating...');
		const token = await authenticate();

		// Step 2: Check parent_document_id field
		console.log(`\n📋 Step 2: Checking ${M2O_FIELD_NAME} field...`);
		const existingField = await getField(token, COLLECTION_NAME, M2O_FIELD_NAME);

		if (!existingField) {
			throw new Error(
				`Field ${M2O_FIELD_NAME} not found. Please run Task 0047C migration first (scripts/0047c_migration_knowledge.ts --execute)`,
			);
		}

		console.log(`   ✓ Field ${M2O_FIELD_NAME} exists`);

		// Check if it's already configured as M2O
		const isM2O = existingField.meta?.special?.includes('m2o');
		const isCorrectInterface = existingField.meta?.interface === 'select-dropdown-m2o-tree-view';

		if (isM2O && isCorrectInterface) {
			console.log(`   ✓ Field is already configured as M2O with tree view`);
		} else {
			console.log(`   ⚠ Field needs to be updated to M2O with tree view interface`);

			if (dryRun) {
				console.log(`   [DRY-RUN] Would update field ${M2O_FIELD_NAME} to M2O`);
			} else {
				const updatedField: DirectusField = {
					field: M2O_FIELD_NAME,
					type: 'uuid',
					meta: {
						interface: 'select-dropdown-m2o-tree-view',
						special: ['m2o'],
						note: 'Parent document for folder/tree structure (self-referencing)',
						display: 'related-values',
						display_options: {
							template: '{{title}}',
						},
						options: {
							enableSelect: true,
						},
					},
				};

				try {
					await updateField(token, COLLECTION_NAME, updatedField);
					console.log(`   ✅ Updated field ${M2O_FIELD_NAME} to M2O`);
					result.fieldUpdated = true;
				} catch (error: any) {
					console.error(`   ❌ Failed to update field: ${error.message}`);
					result.errors.push({ item: `field:${M2O_FIELD_NAME}`, error: error.message });
				}
			}
		}

		// Step 3: Check/create self-referencing relation
		console.log(`\n🔗 Step 3: Checking self-referencing relation...`);
		const relations = await getRelations(token);
		const relationExists = relations.some(
			(r: any) =>
				r.collection === COLLECTION_NAME &&
				r.field === M2O_FIELD_NAME &&
				r.related_collection === COLLECTION_NAME,
		);

		if (relationExists) {
			console.log(`   ✓ Self-referencing relation already exists`);
		} else {
			console.log(`   ⚠ Self-referencing relation needs to be created`);

			if (dryRun) {
				console.log(`   [DRY-RUN] Would create self-referencing relation`);
			} else {
				const relationDef: DirectusRelation = {
					collection: COLLECTION_NAME,
					field: M2O_FIELD_NAME,
					related_collection: COLLECTION_NAME,
					meta: {
						many_collection: COLLECTION_NAME,
						many_field: M2O_FIELD_NAME,
						one_collection: COLLECTION_NAME,
						one_field: O2M_FIELD_NAME,
						sort_field: 'child_order',
						one_deselect_action: 'nullify',
					},
					schema: {
						on_delete: 'SET NULL',
					},
				};

				try {
					await createRelation(token, relationDef);
					console.log(`   ✅ Created self-referencing relation`);
					result.relationCreated = true;
				} catch (error: any) {
					console.error(`   ❌ Failed to create relation: ${error.message}`);
					result.errors.push({ item: 'relation', error: error.message });
				}
			}
		}

		// Step 4: Check/create O2M children field
		console.log(`\n📝 Step 4: Checking O2M ${O2M_FIELD_NAME} field...`);
		const childrenField = await getField(token, COLLECTION_NAME, O2M_FIELD_NAME);

		if (childrenField) {
			console.log(`   ✓ Field ${O2M_FIELD_NAME} already exists`);
		} else {
			console.log(`   ⚠ Field ${O2M_FIELD_NAME} needs to be created`);

			if (dryRun) {
				console.log(`   [DRY-RUN] Would create O2M field ${O2M_FIELD_NAME}`);
			} else {
				const o2mFieldDef: DirectusField = {
					field: O2M_FIELD_NAME,
					type: 'alias',
					meta: {
						interface: 'list-o2m-tree-view',
						special: ['o2m'],
						note: 'Child documents (sub-folders/files)',
						options: {
							enableSelect: false,
						},
					},
				};

				try {
					await createField(token, COLLECTION_NAME, o2mFieldDef);
					console.log(`   ✅ Created O2M field ${O2M_FIELD_NAME}`);
					result.o2mCreated = true;
				} catch (error: any) {
					console.error(`   ❌ Failed to create O2M field: ${error.message}`);
					result.errors.push({ item: `field:${O2M_FIELD_NAME}`, error: error.message });
				}
			}
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

	let report = `# Task E1-01: Folder/Tree Relation Migration Report

**Collection**: \`${COLLECTION_NAME}\`
**Timestamp**: ${timestamp}
**Mode**: ${mode}

---

## Summary

- **Field Updated**: ${result.fieldUpdated ? 'Yes' : 'No'}
- **Relation Created**: ${result.relationCreated ? 'Yes' : 'No'}
- **O2M Field Created**: ${result.o2mCreated ? 'Yes' : 'No'}
- **Errors**: ${result.errors.length}

---

## What Was Done

### 1. M2O Field (parent_document_id)

${
	result.fieldUpdated
		? `✅ Updated \`parent_document_id\` field to M2O with tree view interface`
		: `✓ Field \`parent_document_id\` was already configured correctly`
}

- **Interface**: \`select-dropdown-m2o-tree-view\`
- **Special**: \`m2o\`
- **Purpose**: Points to parent document (self-referencing)

### 2. Self-Referencing Relation

${
	result.relationCreated
		? `✅ Created self-referencing relation: ${COLLECTION_NAME}.${M2O_FIELD_NAME} → ${COLLECTION_NAME}`
		: `✓ Self-referencing relation already exists`
}

- **Many Collection**: \`${COLLECTION_NAME}\`
- **Many Field**: \`${M2O_FIELD_NAME}\`
- **One Collection**: \`${COLLECTION_NAME}\`
- **One Field**: \`${O2M_FIELD_NAME}\`
- **On Delete**: SET NULL

### 3. O2M Field (children)

${result.o2mCreated ? `✅ Created \`${O2M_FIELD_NAME}\` O2M field` : `✓ Field \`${O2M_FIELD_NAME}\` already exists`}

- **Interface**: \`list-o2m-tree-view\`
- **Special**: \`o2m\`
- **Purpose**: Shows child documents (sub-folders/files)

---

## Usage

With this folder/tree structure in place:

1. **Create Folders**: Create a document with no parent (parent_document_id = null) to create a root folder
2. **Create Sub-folders**: Set parent_document_id to another document's ID
3. **View Tree**: Use the tree view interface in Directus UI
4. **Organize Content**: Organize knowledge documents in a hierarchical structure like Google Drive

---

## Compliance Check

✅ **E1 Plan Blog E1.A**: Implements folder/tree using self-referencing parent_id
✅ **No New Tables**: Uses existing \`knowledge_documents\` collection (Growth Zone)
✅ **Anti-Stupid**: Reuses Directus native tree view interface
✅ **3-Zone Architecture**: Modifies Growth Zone only

---

## Next Steps

`;

	if (result.dryRun) {
		report += `This was a **DRY-RUN**. No changes were made.

To apply these changes:

\`\`\`bash
npx tsx scripts/e1-01_add_folder_relation.ts --execute
\`\`\`

**Prerequisites**:
- Task 0047C must be completed (parent_document_id field must exist)
`;
	} else {
		report += `Migration has been **EXECUTED**.

**Post-Migration Checklist**:

1. [ ] Open Directus UI → Data Model → knowledge_documents
2. [ ] Verify parent_document_id field has M2O interface with tree view
3. [ ] Verify children field has O2M interface with tree view
4. [ ] Test: Create a root document (no parent)
5. [ ] Test: Create a child document (set parent_document_id)
6. [ ] Verify tree view shows hierarchy correctly
`;
	}

	if (result.errors.length > 0) {
		report += `\n---

## Errors

`;
		result.errors.forEach((err) => {
			report += `- **Item**: \`${err.item}\`\n`;
			report += `  - **Error**: ${err.error}\n\n`;
		});
	}

	report += `\n---

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
	console.log('║  Task E1-01: Add Folder/Tree Relation to knowledge_documents     ║');
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
		console.log(`Mode:               ${dryRun ? 'DRY-RUN' : 'EXECUTE'}`);
		console.log(`Field Updated:      ${result.fieldUpdated}`);
		console.log(`Relation Created:   ${result.relationCreated}`);
		console.log(`O2M Field Created:  ${result.o2mCreated}`);
		console.log(`Errors:             ${result.errors.length}`);
		console.log('='.repeat(80) + '\n');

		// Generate and save report
		const report = generateReport(result);
		const reportFilename = dryRun ? 'e1-01_folder_dry_run.md' : 'e1-01_folder_execution.md';
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

// Run if executed directly
if (require.main === module) {
	main();
}
