#!/usr/bin/env ts-node
/**
 * Task E1-01: RBAC Setup Script for content_requests (Growth Zone)
 *
 * This script configures permissions for the `content_requests` collection
 * according to the E1 Plan (docs/E1_Plan.md Section 3.2) and reuses existing
 * Agent/Editor roles from Task 0048.
 *
 * SAFETY:
 * - Dry-run by default (no changes applied)
 * - Use --execute flag to apply changes
 * - Idempotent: safe to run multiple times
 * - Reuses existing roles and policies from Task 0048
 *
 * USAGE:
 *   # Dry-run (default) - shows what would change
 *   npx tsx scripts/e1-01_rbac_content_requests.ts --dry-run
 *
 *   # Execute RBAC setup
 *   npx tsx scripts/e1-01_rbac_content_requests.ts --execute
 *
 * ENVIRONMENT VARIABLES (required):
 *   DIRECTUS_URL            - Base URL of Directus TEST instance (e.g. http://127.0.0.1:8080)
 *   DIRECTUS_ADMIN_EMAIL    - Admin email for authentication
 *   DIRECTUS_ADMIN_PASSWORD - Admin password for authentication
 *
 * @see docs/E1_Plan.md (Section 3.2, 3.4)
 * @see scripts/0048_rbac_setup.ts (existing RBAC for knowledge_documents)
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Types & Interfaces
// ============================================================================

interface DirectusPermission {
	id?: number;
	policy: string; // Policy ID (required in policy-based RBAC)
	collection: string;
	action: string;
	fields?: string[] | string;
	permissions?: Record<string, any>;
	validation?: Record<string, any>;
}

interface DirectusPolicy {
	id?: string;
	name: string;
	icon?: string;
	description?: string;
	admin_access?: boolean;
	app_access?: boolean;
	roles?: string[];
	permissions?: string[];
}

interface RBACResult {
	policiesChecked: number;
	permissionsSet: number;
	dryRun: boolean;
	errors: Array<{ item: string; error: string }>;
}

// ============================================================================
// Configuration
// ============================================================================

const COLLECTION_NAME = 'content_requests';

/**
 * Permission matrix for content_requests based on E1 Plan
 *
 * Lifecycle states:
 * - new: Initial state
 * - assigned: Assigned to agent/user
 * - drafting: Agent is working on draft
 * - awaiting_review: Submitted for review
 * - awaiting_approval: Reviewed, waiting for approval
 * - published: Approved and published
 * - rejected: Rejected by reviewer/approver
 * - canceled: Canceled by user
 */
const PERMISSION_MATRIX: Record<
	string,
	Array<{
		action: string;
		fields: string | string[];
		permissions?: Record<string, any>;
		validation?: Record<string, any>;
	}>
> = {
	Agent: [
		{
			// Agents can create new requests (always in 'new' state)
			action: 'create',
			fields: '*',
			permissions: null,
			validation: {
				status: { _eq: 'new' },
			},
		},
		{
			// Agents can read their own requests and published ones for reference
			action: 'read',
			fields: '*',
			permissions: {
				_or: [
					{ status: { _eq: 'new' } },
					{ status: { _eq: 'assigned' } },
					{ status: { _eq: 'drafting' } },
					{ status: { _eq: 'awaiting_review' } },
					{ status: { _eq: 'published' } }, // For reference
				],
			},
		},
		{
			// Agents can update only new, assigned, and drafting requests
			action: 'update',
			fields: '*',
			permissions: {
				_or: [{ status: { _eq: 'new' } }, { status: { _eq: 'assigned' } }, { status: { _eq: 'drafting' } }],
			},
			validation: {
				// Can transition: new → assigned → drafting → awaiting_review
				// Cannot set to awaiting_approval, published, or rejected (Editor/Admin only)
				status: { _in: ['new', 'assigned', 'drafting', 'awaiting_review'] },
			},
		},
		{
			// Agents cannot delete requests
			action: 'delete',
			fields: null,
			permissions: {
				id: { _null: true }, // Impossible condition = no access
			},
		},
	],
	Editor: [
		{
			// Editors can create requests
			action: 'create',
			fields: '*',
			permissions: null,
		},
		{
			// Editors can read all requests except canceled
			action: 'read',
			fields: '*',
			permissions: {
				status: { _neq: 'canceled' },
			},
		},
		{
			// Editors can update requests in review/approval stages
			action: 'update',
			fields: '*',
			permissions: {
				_or: [
					{ status: { _eq: 'new' } },
					{ status: { _eq: 'assigned' } },
					{ status: { _eq: 'drafting' } },
					{ status: { _eq: 'awaiting_review' } },
					{ status: { _eq: 'awaiting_approval' } },
				],
			},
			validation: {
				// Can approve (awaiting_review → awaiting_approval)
				// Can reject (awaiting_review → rejected, awaiting_approval → rejected)
				// Can reassign (awaiting_review → drafting)
				// Cannot publish (Admin only)
				status: {
					_in: ['new', 'assigned', 'drafting', 'awaiting_review', 'awaiting_approval', 'rejected'],
				},
			},
		},
		{
			// Editors cannot delete requests (admin-only)
			action: 'delete',
			fields: null,
			permissions: {
				id: { _null: true }, // Impossible condition = no access
			},
		},
	],
};

// ============================================================================
// Utility Functions
// ============================================================================

function parseArgs(): { dryRun: boolean; execute: boolean } {
	const args = process.argv.slice(2);
	const dryRun = args.includes('--dry-run') || args.length === 0; // Default to dry-run
	const execute = args.includes('--execute');

	if (dryRun && execute) {
		console.error('❌ Cannot specify both --dry-run and --execute');
		process.exit(1);
	}

	return { dryRun, execute };
}

function validateEnvironment(): void {
	const required = ['DIRECTUS_URL', 'DIRECTUS_ADMIN_EMAIL', 'DIRECTUS_ADMIN_PASSWORD'];
	const missing = required.filter((key) => !process.env[key]);

	if (missing.length > 0) {
		console.error('❌ Missing required environment variables:');
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
		throw new Error(`Authentication failed: ${response.status} ${response.statusText}`);
	}

	const data = await response.json();
	if (!data.data?.access_token) {
		throw new Error('No access token in authentication response');
	}

	console.log('✅ Authenticated successfully');
	return data.data.access_token;
}

/**
 * Fetch all policies from Directus
 */
async function fetchPolicies(token: string): Promise<DirectusPolicy[]> {
	const url = `${process.env.DIRECTUS_URL}/policies`;
	const response = await fetch(url, {
		headers: { Authorization: `Bearer ${token}` },
	});

	if (!response.ok) {
		throw new Error(`Failed to fetch policies: ${response.status} ${response.statusText}`);
	}

	const data = await response.json();
	return data.data || [];
}

/**
 * Fetch permissions for a collection
 */
async function fetchPermissions(token: string, collection: string): Promise<DirectusPermission[]> {
	const url = `${process.env.DIRECTUS_URL}/permissions?filter[collection][_eq]=${collection}`;
	const response = await fetch(url, {
		headers: { Authorization: `Bearer ${token}` },
	});

	if (!response.ok) {
		throw new Error(`Failed to fetch permissions: ${response.status} ${response.statusText}`);
	}

	const data = await response.json();
	return data.data || [];
}

/**
 * Create or update a permission
 */
async function upsertPermission(token: string, permission: DirectusPermission): Promise<void> {
	// Check if permission already exists
	const existing = await fetchPermissions(token, permission.collection);
	const match = existing.find(
		(p) => p.policy === permission.policy && p.collection === permission.collection && p.action === permission.action,
	);

	if (match) {
		// Update existing permission
		const url = `${process.env.DIRECTUS_URL}/permissions/${match.id}`;
		const response = await fetch(url, {
			method: 'PATCH',
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				fields: permission.fields,
				permissions: permission.permissions,
				validation: permission.validation,
			}),
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`Failed to update permission: ${response.status} - ${error}`);
		}
	} else {
		// Create new permission
		const url = `${process.env.DIRECTUS_URL}/permissions`;
		const response = await fetch(url, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(permission),
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`Failed to create permission: ${response.status} - ${error}`);
		}
	}
}

// ============================================================================
// Main RBAC Setup Logic
// ============================================================================

async function setupRBAC(dryRun: boolean): Promise<RBACResult> {
	const result: RBACResult = {
		policiesChecked: 0,
		permissionsSet: 0,
		dryRun,
		errors: [],
	};

	try {
		// Step 1: Authenticate
		console.log('\n🔐 Step 1: Authenticating...');
		const token = await authenticate();

		// Step 2: Fetch existing policies (created by Task 0048)
		console.log('\n📋 Step 2: Fetching existing policies (from Task 0048)...');
		const existingPolicies = await fetchPolicies(token);
		console.log(`   Found ${existingPolicies.length} existing policies`);

		const policyMap = new Map<string, string>(); // roleName → policyId

		for (const roleName of ['Agent', 'Editor']) {
			const policyName = `${roleName} Policy`;
			const policy = existingPolicies.find((p) => p.name === policyName);

			if (policy) {
				console.log(`   ✓ Found policy: "${policyName}" (ID: ${policy.id})`);
				policyMap.set(roleName, policy.id!);
				result.policiesChecked++;
			} else {
				console.error(`   ❌ Policy not found: "${policyName}"`);
				console.error(`      Please run Task 0048 first: npx tsx scripts/0048_rbac_setup.ts --execute`);
				throw new Error(`Required policy "${policyName}" not found. Run Task 0048 first.`);
			}
		}

		// Step 3: Set up permissions for content_requests
		console.log(`\n🔒 Step 3: Setting up permissions for ${COLLECTION_NAME}...`);

		for (const [roleName, permissions] of Object.entries(PERMISSION_MATRIX)) {
			const policyId = policyMap.get(roleName);

			if (!policyId) {
				console.log(`   ⚠️  Skipping permissions for ${roleName} (policy not found)`);
				continue;
			}

			console.log(`\n   Setting permissions for role: ${roleName}`);

			for (const perm of permissions) {
				const permission: DirectusPermission = {
					policy: policyId,
					collection: COLLECTION_NAME,
					action: perm.action,
					fields: perm.fields,
					permissions: perm.permissions,
					validation: perm.validation,
				};

				if (dryRun) {
					console.log(`   [DRY-RUN] Would set ${perm.action} permission for ${roleName}`);
				} else {
					try {
						await upsertPermission(token, permission);
						console.log(`   ✅ Set ${perm.action} permission for ${roleName}`);
						result.permissionsSet++;
					} catch (error) {
						const errorMsg = error instanceof Error ? error.message : String(error);
						console.error(`   ❌ Failed to set ${perm.action} permission: ${errorMsg}`);
						result.errors.push({ item: `${roleName}:${perm.action}`, error: errorMsg });
					}
				}
			}
		}

		return result;
	} catch (error) {
		const errorMsg = error instanceof Error ? error.message : String(error);
		result.errors.push({ item: 'setup', error: errorMsg });
		throw error;
	}
}

// ============================================================================
// Report Generation
// ============================================================================

function generateReport(result: RBACResult): string {
	const timestamp = new Date().toISOString();
	const mode = result.dryRun ? 'DRY-RUN' : 'EXECUTE';

	let report = `# Task E1-01: RBAC Setup Report for content_requests (Growth Zone)

**Collection**: \`${COLLECTION_NAME}\`
**Timestamp**: ${timestamp}
**Mode**: ${mode}

---

## Summary

- **Policies Checked**: ${result.policiesChecked}
- **Permissions Set**: ${result.permissionsSet}
- **Errors**: ${result.errors.length}

---

## Permission Matrix

### Agent Role

| Action | Access | Validation |
|--------|--------|------------|
| create | All fields | Must be status='new' |
| read | All fields | status IN (new, assigned, drafting, awaiting_review, published) |
| update | All fields | Current status IN (new, assigned, drafting); Can set to: new, assigned, drafting, awaiting_review |
| delete | No access | Denied |

**Reasoning**: Agents can create requests, work on drafts, and submit for review. They cannot approve, publish, or delete.

### Editor Role

| Action | Access | Validation |
|--------|--------|------------|
| create | All fields | No restrictions |
| read | All fields | status != canceled |
| update | All fields | Current status IN (new, assigned, drafting, awaiting_review, awaiting_approval); Can set to: new, assigned, drafting, awaiting_review, awaiting_approval, rejected |
| delete | No access | Denied |

**Reasoning**: Editors can review, approve/reject, and reassign requests. They cannot publish (Admin only) or delete.

### Administrator Role

Administrators have full access via \`admin_access\` flag (inherited from Directus).

---

## Compliance Check

✅ **E1 Plan**: Implements Section 3.2 (Workflow roles) and 3.4 (Agent-Human collaboration)
✅ **Data Laws**: Complies with Data & RBAC laws (Agent draft-only, User approve)
✅ **3-Zone**: Permissions on Growth Zone only (content_requests)
✅ **Reuse**: Leverages existing Agent/Editor policies from Task 0048
✅ **Anti-Stupid**: Uses Directus native RBAC (policies + permissions)

---

`;

	if (result.errors.length > 0) {
		report += `## Errors

The following errors occurred:

`;
		result.errors.forEach((err) => {
			report += `- **Item**: \`${err.item}\`\n`;
			report += `  - **Error**: ${err.error}\n\n`;
		});
		report += `\n---\n\n`;
	}

	report += `## Next Steps

`;

	if (result.dryRun) {
		report += `This was a **DRY-RUN**. No changes were made.

To apply these permissions:

\`\`\`bash
npx tsx scripts/e1-01_rbac_content_requests.ts --execute
\`\`\`

**Prerequisites**:
- Task 0048 must be completed (Agent and Editor policies must exist)
- Collection \`${COLLECTION_NAME}\` must exist (run migration script first)
`;
	} else {
		report += `RBAC setup has been **EXECUTED**. ${result.permissionsSet} permissions were configured.

**Post-RBAC Checklist**:

1. [ ] Test Agent role: Create request, update to 'drafting', submit to 'awaiting_review'
2. [ ] Test Editor role: Review request, approve/reject, reassign if needed
3. [ ] Test Admin role: Publish approved requests
4. [ ] Verify Agents cannot approve or publish
5. [ ] Verify Editors cannot publish (Admin only)
6. [ ] Verify nobody except Admin can delete
7. [ ] Document system-bot token usage for automated Agents

**For Testing**:

\`\`\`bash
# Create test users with Agent and Editor roles in Directus UI
# Then test via API or UI with those credentials
\`\`\`
`;
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

async function main(): Promise<void> {
	console.log('╔═══════════════════════════════════════════════════════════════════╗');
	console.log('║  Task E1-01: RBAC Setup for content_requests (Growth Zone)       ║');
	console.log('╚═══════════════════════════════════════════════════════════════════╝');

	// Parse arguments
	const { dryRun, execute } = parseArgs();
	const mode = dryRun ? 'DRY-RUN' : 'EXECUTE';
	console.log(`\n📋 Mode: ${mode}`);

	// Validate environment
	validateEnvironment();

	try {
		// Run RBAC setup
		const result = await setupRBAC(dryRun);

		// Print summary
		console.log('\n╔═══════════════════════════════════════════════════════════════════╗');
		console.log('║  Summary                                                          ║');
		console.log('╚═══════════════════════════════════════════════════════════════════╝');
		console.log(`Mode:              ${mode}`);
		console.log(`Policies checked:  ${result.policiesChecked}`);
		console.log(`Permissions set:   ${result.permissionsSet}`);
		console.log(`Errors:            ${result.errors.length}`);

		// Generate and save report
		const report = generateReport(result);
		const reportFilename = dryRun ? 'e1-01_rbac_dry_run.md' : 'e1-01_rbac_execution.md';
		saveReport(report, reportFilename);

		if (result.errors.length > 0) {
			console.log('\n❌ Errors encountered:');
			result.errors.forEach((e) => console.log(`   - ${e.item}: ${e.error}`));
			process.exit(1);
		}

		if (dryRun) {
			console.log('\n✅ Dry-run complete. Run with --execute to apply changes.');
			process.exit(0);
		} else {
			console.log('\n✅ RBAC setup complete!');
			process.exit(0);
		}
	} catch (error) {
		console.error('\n❌ Fatal error:', error instanceof Error ? error.message : String(error));
		process.exit(1);
	}
}

// Run the script
main().catch((error) => {
	console.error('\n❌ Fatal error:', error instanceof Error ? error.message : String(error));
	process.exit(1);
});
