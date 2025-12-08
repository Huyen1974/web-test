#!/usr/bin/env ts-node
/**
 * Task 0047C: Schema Migration Script for knowledge_documents
 *
 * This script updates the Directus schema for the `knowledge_documents` collection
 * to support Content Versioning & Approval Workflow (Task 0047).
 *
 * SAFETY:
 * - Dry-run by default (no changes applied)
 * - Use --execute flag to apply changes
 * - Idempotent: safe to run multiple times
 * - Non-destructive: only adds missing fields, never drops/renames
 *
 * USAGE:
 *   # Dry-run (default) - shows what would change
 *   ts-node scripts/0047c_migration_knowledge.ts
 *
 *   # Execute migration
 *   ts-node scripts/0047c_migration_knowledge.ts --execute
 *
 * ENVIRONMENT VARIABLES (required):
 *   DIRECTUS_URL          - Base URL of Directus TEST instance
 *   DIRECTUS_ADMIN_TOKEN  - Admin token for schema changes
 *
 * @see reports/0047a_versioning_design.md
 * @see reports/0047c_antigravity_migration_plan.md
 */

import { createDirectus, rest, staticToken } from '@directus/sdk';
import { readFieldsByCollection, createField } from '@directus/sdk';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Types & Interfaces
// ============================================================================

interface FieldDefinition {
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
	};
}

interface MigrationResult {
	fieldsChecked: number;
	fieldsExisting: string[];
	fieldsMissing: string[];
	fieldsAdded: string[];
	errors: Array<{ field: string; error: string }>;
	dryRun: boolean;
}

// ============================================================================
// Configuration
// ============================================================================

const COLLECTION_NAME = 'knowledge_documents';
const REPORT_PATH = path.join(process.cwd(), 'reports', '0047c_migration_dry_run.md');

/**
 * Required fields for Task 0047 (workflow, versioning, parent-child)
 * Based on reports/0047c_antigravity_migration_plan.md Section 3.1
 */
const REQUIRED_FIELDS: FieldDefinition[] = [
	{
		field: 'workflow_status',
		type: 'string',
		schema: {
			default_value: 'draft',
			is_nullable: false,
			max_length: 32,
		},
		meta: {
			required: true,
			interface: 'select-dropdown',
			options: {
				choices: [
					{ text: 'Draft', value: 'draft' },
					{ text: 'Under Review', value: 'under_review' },
					{ text: 'Approved', value: 'approved' },
					{ text: 'Published', value: 'published' },
					{ text: 'Archived', value: 'archived' },
				],
			},
			note: 'Current workflow state: draft, under_review, approved, published, archived',
		},
	},
	{
		field: 'version_group_id',
		type: 'uuid',
		schema: {
			is_nullable: false,
		},
		meta: {
			required: true,
			interface: 'input',
			readonly: true,
			note: 'Groups all versions of the same logical document',
		},
	},
	{
		field: 'version_number',
		type: 'integer',
		schema: {
			default_value: 1,
			is_nullable: false,
		},
		meta: {
			required: true,
			interface: 'input',
			note: 'Sequential version number within the group',
		},
	},
	{
		field: 'is_current_version',
		type: 'boolean',
		schema: {
			default_value: false,
			is_nullable: false,
		},
		meta: {
			required: true,
			interface: 'boolean',
			note: 'TRUE for the currently active version in the group',
		},
	},
	{
		field: 'previous_version_id',
		type: 'uuid',
		schema: {
			is_nullable: true,
		},
		meta: {
			interface: 'input',
			note: 'Links to the previous version in the version chain',
		},
	},
	{
		field: 'reviewed_by',
		type: 'uuid',
		schema: {
			is_nullable: true,
		},
		meta: {
			interface: 'select-dropdown-m2o',
			special: ['m2o'],
			note: 'Editor who reviewed the document',
		},
	},
	{
		field: 'reviewed_at',
		type: 'timestamp',
		schema: {
			is_nullable: true,
		},
		meta: {
			interface: 'datetime',
			note: 'When the document was reviewed',
		},
	},
	{
		field: 'approved_by',
		type: 'uuid',
		schema: {
			is_nullable: true,
		},
		meta: {
			interface: 'select-dropdown-m2o',
			special: ['m2o'],
			note: 'Editor who approved the document',
		},
	},
	{
		field: 'approved_at',
		type: 'timestamp',
		schema: {
			is_nullable: true,
		},
		meta: {
			interface: 'datetime',
			note: 'When the document was approved',
		},
	},
	{
		field: 'publisher_id',
		type: 'uuid',
		schema: {
			is_nullable: true,
		},
		meta: {
			interface: 'select-dropdown-m2o',
			special: ['m2o'],
			note: 'Admin who published the document',
		},
	},
	{
		field: 'rejection_reason',
		type: 'text',
		schema: {
			is_nullable: true,
		},
		meta: {
			interface: 'input-multiline',
			note: 'Reason for rejection (max 500 chars)',
		},
	},
	{
		field: 'purge_after',
		type: 'timestamp',
		schema: {
			is_nullable: true,
		},
		meta: {
			interface: 'datetime',
			note: 'Scheduled purge timestamp for old revisions',
		},
	},
	{
		field: 'parent_document_id',
		type: 'uuid',
		schema: {
			is_nullable: true,
		},
		meta: {
			interface: 'input',
			note: 'Points to the parent document for hierarchy',
		},
	},
	{
		field: 'child_order',
		type: 'integer',
		schema: {
			is_nullable: true,
		},
		meta: {
			interface: 'input',
			note: 'Display order among siblings',
		},
	},
];

// ============================================================================
// Directus Client Setup
// ============================================================================

function createDirectusClient() {
	const url = process.env.DIRECTUS_URL;
	// Support both DIRECTUS_ADMIN_TOKEN and DIRECTUS_SERVER_TOKEN (align with existing codebase)
	const token = process.env.DIRECTUS_ADMIN_TOKEN || process.env.DIRECTUS_SERVER_TOKEN;

	// Validate environment variables
	if (!url) {
		console.error('\n❌ ERROR: Missing required environment variable DIRECTUS_URL');
		console.error('\nPlease set the following environment variables:');
		console.error('  export DIRECTUS_URL="https://your-directus-instance.run.app"');
		console.error('  export DIRECTUS_ADMIN_TOKEN="your-admin-token"');
		console.error('  OR');
		console.error('  export DIRECTUS_SERVER_TOKEN="your-server-token"\n');
		process.exit(1);
	}

	if (!token) {
		console.error('\n❌ ERROR: Missing required environment variable DIRECTUS_ADMIN_TOKEN or DIRECTUS_SERVER_TOKEN');
		console.error('\nPlease set the following environment variables:');
		console.error('  export DIRECTUS_URL="https://your-directus-instance.run.app"');
		console.error('  export DIRECTUS_ADMIN_TOKEN="your-admin-token"');
		console.error('  OR');
		console.error('  export DIRECTUS_SERVER_TOKEN="your-server-token"\n');
		process.exit(1);
	}

	console.log(`\n✓ Connecting to Directus at: ${url}`);
	console.log('✓ Using admin token: ***' + token.substring(token.length - 4));

	// Check for Cloud Run IAM token (for bypassing Cloud Run authentication)
	const iamToken = process.env.CLOUD_RUN_AUTH_TOKEN;
	if (iamToken) {
		console.log('✓ Using Cloud Run IAM identity token for infrastructure auth');
		// When using IAM token, we need dual authentication:
		// 1. Cloud Run IAM (Authorization header with IAM token)
		// 2. Directus API (use access_token query parameter)
		// This avoids Authorization header conflict
		const customFetch: typeof fetch = async (input, init) => {
			// Add Directus token as query parameter
			const urlObj = new URL(input.toString());
			urlObj.searchParams.set('access_token', token);

			// Add Cloud Run IAM token to Authorization header
			const headers = new Headers(init?.headers);
			headers.set('Authorization', `Bearer ${iamToken}`);

			return fetch(urlObj.toString(), { ...init, headers });
		};
		return createDirectus(url).with(rest({ fetch: customFetch }));
	}

	return createDirectus(url).with(rest()).with(staticToken(token));
}

// ============================================================================
// Migration Logic
// ============================================================================

async function getExistingFields(client: any, collection: string): Promise<any[]> {
	try {
		const fields = await client.request(readFieldsByCollection(collection));
		return fields || [];
	} catch (error: any) {
		console.error(`\n❌ ERROR: Failed to read fields for collection "${collection}"`);
		console.error(`   Error type: ${typeof error}`);
		console.error(`   Error message: ${error?.message || 'No message'}`);
		console.error(`   Error details: ${JSON.stringify(error, null, 2)}`);
		if (error?.errors) {
			console.error(`   API errors: ${JSON.stringify(error.errors, null, 2)}`);
		}
		throw error;
	}
}

async function addField(client: any, collection: string, fieldDef: FieldDefinition, dryRun: boolean): Promise<void> {
	if (dryRun) {
		console.log(`   [DRY-RUN] Would add field: ${fieldDef.field} (${fieldDef.type})`);
		return;
	}

	try {
		await client.request(createField(collection, fieldDef));
		console.log(`   ✓ Added field: ${fieldDef.field}`);
	} catch (error: any) {
		console.error(`   ❌ Failed to add field: ${fieldDef.field}`);
		console.error(`      ${error.message}`);
		throw error;
	}
}

async function runMigration(dryRun: boolean): Promise<MigrationResult> {
	const result: MigrationResult = {
		fieldsChecked: REQUIRED_FIELDS.length,
		fieldsExisting: [],
		fieldsMissing: [],
		fieldsAdded: [],
		errors: [],
		dryRun,
	};

	console.log('\n' + '='.repeat(80));
	console.log(`Task 0047C: Schema Migration for ${COLLECTION_NAME}`);
	console.log('='.repeat(80));
	console.log(`Mode: ${dryRun ? 'DRY-RUN (no changes will be made)' : 'EXECUTE (changes will be applied)'}`);
	console.log('='.repeat(80) + '\n');

	// Create Directus client
	const client = createDirectusClient();

	// Get existing fields
	console.log(`\n📋 Reading current schema for collection: ${COLLECTION_NAME}\n`);
	const existingFields = await getExistingFields(client, COLLECTION_NAME);
	const existingFieldNames = new Set(existingFields.map((f: any) => f.field));

	console.log(`   Found ${existingFields.length} existing fields\n`);

	// Check each required field
	console.log(`\n🔍 Checking ${REQUIRED_FIELDS.length} required fields...\n`);

	for (const fieldDef of REQUIRED_FIELDS) {
		if (existingFieldNames.has(fieldDef.field)) {
			result.fieldsExisting.push(fieldDef.field);
			console.log(`   ✓ Field exists: ${fieldDef.field}`);
		} else {
			result.fieldsMissing.push(fieldDef.field);
			console.log(`   ⚠ Field missing: ${fieldDef.field}`);

			// Try to add the field
			try {
				await addField(client, COLLECTION_NAME, fieldDef, dryRun);
				if (!dryRun) {
					result.fieldsAdded.push(fieldDef.field);
				}
			} catch (error: any) {
				result.errors.push({
					field: fieldDef.field,
					error: error.message,
				});
			}
		}
	}

	return result;
}

// ============================================================================
// Report Generation
// ============================================================================

function generateReport(result: MigrationResult): string {
	const timestamp = new Date().toISOString();
	const mode = result.dryRun ? 'DRY-RUN' : 'EXECUTE';

	let report = `# Task 0047C: Migration Dry-Run Report

**Collection**: \`${COLLECTION_NAME}\`
**Timestamp**: ${timestamp}
**Mode**: ${mode}

---

## Summary

- **Fields Checked**: ${result.fieldsChecked}
- **Fields Already Exist**: ${result.fieldsExisting.length}
- **Fields Missing**: ${result.fieldsMissing.length}
- **Fields Added**: ${result.fieldsAdded.length}
- **Errors**: ${result.errors.length}

---

## Existing Fields (${result.fieldsExisting.length})

The following required fields already exist in the collection:

`;

	if (result.fieldsExisting.length > 0) {
		result.fieldsExisting.forEach((field) => {
			report += `- ✓ \`${field}\`\n`;
		});
	} else {
		report += '*None*\n';
	}

	report += `\n---

## Missing Fields (${result.fieldsMissing.length})

The following required fields are missing and ${result.dryRun ? 'would be' : 'were'} added:

`;

	if (result.fieldsMissing.length > 0) {
		result.fieldsMissing.forEach((field) => {
			const fieldDef = REQUIRED_FIELDS.find((f) => f.field === field);
			const status = result.fieldsAdded.includes(field)
				? '✓ Added'
				: result.errors.find((e) => e.field === field)
					? '❌ Error'
					: result.dryRun
						? '⚠ Would add'
						: '⚠ Pending';

			report += `- ${status}: \`${field}\` (${fieldDef?.type || 'unknown'})\n`;
			if (fieldDef?.meta?.note) {
				report += `  - *${fieldDef.meta.note}*\n`;
			}
		});
	} else {
		report += '*None - All required fields already exist!*\n';
	}

	if (result.errors.length > 0) {
		report += `\n---

## Errors (${result.errors.length})

The following errors occurred during migration:

`;
		result.errors.forEach((err) => {
			report += `- **Field**: \`${err.field}\`\n`;
			report += `  - **Error**: ${err.error}\n`;
		});
	}

	report += `\n---

## Next Steps

`;

	if (result.dryRun) {
		report += `This was a **DRY-RUN**. No changes were made to the schema.

To apply these changes to the Directus TEST environment:

\`\`\`bash
ts-node scripts/0047c_migration_knowledge.ts --execute
\`\`\`

**IMPORTANT**:
- Ensure you have a database backup before running with --execute
- This should ONLY be run on the TEST environment
- Verify the changes in Directus UI after execution
`;
	} else {
		report += `Migration has been **EXECUTED**. ${result.fieldsAdded.length} fields were added.

**Post-Migration Checklist**:

1. [ ] Verify new fields in Directus UI (Settings → Data Model → ${COLLECTION_NAME})
2. [ ] Test field permissions for Agent/Editor/Admin roles
3. [ ] Run validation queries to ensure data integrity
4. [ ] Update Nuxt composables to use new workflow fields (Task 0047D)
5. [ ] Create indexes as per design (reports/0047a_versioning_design.md Section 4.3)

**Index Creation** (TODO - manual or separate script):
\`\`\`sql
CREATE INDEX idx_current_published ON knowledge_documents (workflow_status, is_current_version, category, language, visibility);
CREATE INDEX idx_version_history ON knowledge_documents (version_group_id, version_number DESC);
CREATE INDEX idx_purge_candidates ON knowledge_documents (purge_after);
CREATE INDEX idx_workflow_dashboard ON knowledge_documents (workflow_status, date_updated DESC);
CREATE INDEX idx_approval_tracking ON knowledge_documents (approved_by, approved_at DESC);
CREATE INDEX idx_parent_child_hierarchy ON knowledge_documents (parent_document_id, child_order);
\`\`\`

**Note**: Index creation via Directus API is not recommended. Use Cloud SQL Console or a separate SQL migration script.
`;
	}

	report += `\n---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
`;

	return report;
}

function saveReport(report: string): void {
	try {
		fs.writeFileSync(REPORT_PATH, report, 'utf-8');
		console.log(`\n📝 Report saved to: ${REPORT_PATH}\n`);
	} catch (error: any) {
		console.error(`\n⚠ Warning: Failed to save report to ${REPORT_PATH}`);
		console.error(`   ${error.message}\n`);
	}
}

// ============================================================================
// Main Entry Point
// ============================================================================

async function main() {
	// Parse command-line arguments
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
		console.log(`Mode:             ${dryRun ? 'DRY-RUN' : 'EXECUTE'}`);
		console.log(`Fields Checked:   ${result.fieldsChecked}`);
		console.log(`Fields Existing:  ${result.fieldsExisting.length}`);
		console.log(`Fields Missing:   ${result.fieldsMissing.length}`);
		console.log(`Fields Added:     ${result.fieldsAdded.length}`);
		console.log(`Errors:           ${result.errors.length}`);
		console.log('='.repeat(80) + '\n');

		// Generate and save report
		const report = generateReport(result);
		saveReport(report);

		// Exit status
		if (result.errors.length > 0) {
			console.error('❌ Migration completed with errors. See report for details.\n');
			process.exit(1);
		} else if (result.fieldsMissing.length > 0 && dryRun) {
			console.log('✓ Dry-run completed successfully.');
			console.log('  Run with --execute to apply changes.\n');
			process.exit(0);
		} else if (result.fieldsAdded.length > 0) {
			console.log('✓ Migration executed successfully!\n');
			process.exit(0);
		} else {
			console.log('✓ All required fields already exist. No changes needed.\n');
			process.exit(0);
		}
	} catch (error: any) {
		console.error('\n❌ FATAL ERROR during migration:');
		console.error(`   ${error.message}\n`);
		console.error('Stack trace:');
		console.error(error.stack);
		process.exit(1);
	}
}

// Run if executed directly
if (require.main === module) {
	main();
}
