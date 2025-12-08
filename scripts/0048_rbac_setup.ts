#!/usr/bin/env ts-node
/**
 * Task 0048: RBAC Setup Script for knowledge_documents
 *
 * This script configures roles and permissions for the `knowledge_documents` collection
 * according to the Role Matrix defined in reports/0047a_versioning_design.md.
 *
 * SAFETY:
 * - Dry-run by default (no changes applied)
 * - Use --execute flag to apply changes
 * - Idempotent: safe to run multiple times
 * - Non-destructive: only creates/updates, never deletes roles
 *
 * USAGE:
 *   # Dry-run (default) - shows what would change
 *   npx tsx scripts/0048_rbac_setup.ts --dry-run
 *
 *   # Execute RBAC setup
 *   npx tsx scripts/0048_rbac_setup.ts --execute
 *
 * ENVIRONMENT VARIABLES (required):
 *   DIRECTUS_URL            - Base URL of Directus TEST instance (e.g. http://127.0.0.1:8080)
 *   DIRECTUS_ADMIN_EMAIL    - Admin email for authentication
 *   DIRECTUS_ADMIN_PASSWORD - Admin password for authentication
 *
 * @see reports/0047a_versioning_design.md (Section 3.3 Role Matrix)
 * @see reports/0048_rbac_execution.md
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Types & Interfaces
// ============================================================================

interface DirectusRole {
	id: string;
	name: string;
	icon?: string;
	description?: string;
	admin_access?: boolean;
	app_access?: boolean;
}

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
	rolesChecked: number;
	rolesCreated: string[];
	rolesUpdated: string[];
	permissionsSet: number;
	dryRun: boolean;
	errors: Array<{ item: string; error: string }>;
}

// ============================================================================
// Configuration
// ============================================================================

const COLLECTION_NAME = 'knowledge_documents';

/**
 * Role definitions based on reports/0047a_versioning_design.md Role Matrix
 */
const ROLE_DEFINITIONS: Array<{
	name: string;
	icon: string;
	description: string;
	admin_access: boolean;
	app_access: boolean;
}> = [
	{
		name: 'Agent',
		icon: 'smart_toy',
		description: 'AI Agent - Can create/edit drafts and submit for review. Cannot approve or publish.',
		admin_access: false,
		app_access: true,
	},
	{
		name: 'Editor',
		icon: 'rate_review',
		description: 'Content Editor - Can review, approve/reject submissions. Cannot publish to production.',
		admin_access: false,
		app_access: true,
	},
];

/**
 * Permission matrix for knowledge_documents based on Role Matrix
 *
 * Actions:
 * - create: Create new documents
 * - read: Read documents
 * - update: Update documents
 * - delete: Delete documents
 *
 * Workflow states:
 * - draft: Initial state
 * - under_review: Submitted for review
 * - approved: Approved by Editor
 * - published: Published by Admin
 * - archived: Archived by Admin
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
			// Agents can create new documents (always in draft state)
			action: 'create',
			fields: '*',
			permissions: null,
			validation: {
				workflow_status: { _eq: 'draft' },
			},
		},
		{
			// Agents can read their own drafts and documents under review
			action: 'read',
			fields: '*',
			permissions: {
				_or: [
					{ workflow_status: { _eq: 'draft' } },
					{ workflow_status: { _eq: 'under_review' } },
					{ workflow_status: { _eq: 'published' } }, // Can read published for reference
				],
			},
		},
		{
			// Agents can update only draft documents
			action: 'update',
			fields: '*',
			permissions: {
				workflow_status: { _eq: 'draft' },
			},
			validation: {
				// Can transition draft → under_review (Submit)
				// Cannot change to approved, published, or archived
				workflow_status: { _in: ['draft', 'under_review'] },
			},
		},
		{
			// Agents cannot delete documents
			action: 'delete',
			fields: null,
			permissions: {
				id: { _null: true }, // Impossible condition = no access
			},
		},
	],
	Editor: [
		{
			// Editors can create documents
			action: 'create',
			fields: '*',
			permissions: null,
		},
		{
			// Editors can read all documents except archived (admin-only)
			action: 'read',
			fields: '*',
			permissions: {
				workflow_status: { _neq: 'archived' },
			},
		},
		{
			// Editors can update drafts and documents under review
			action: 'update',
			fields: '*',
			permissions: {
				_or: [
					{ workflow_status: { _eq: 'draft' } },
					{ workflow_status: { _eq: 'under_review' } },
					{ workflow_status: { _eq: 'approved' } },
				],
			},
			validation: {
				// Can approve (under_review → approved)
				// Can reject (under_review → draft)
				// Cannot publish or archive
				workflow_status: { _in: ['draft', 'under_review', 'approved'] },
			},
		},
		{
			// Editors cannot delete documents (admin-only)
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
 * Fetch all roles from Directus
 */
async function fetchRoles(token: string): Promise<DirectusRole[]> {
	const url = `${process.env.DIRECTUS_URL}/roles`;
	const response = await fetch(url, {
		headers: { Authorization: `Bearer ${token}` },
	});

	if (!response.ok) {
		throw new Error(`Failed to fetch roles: ${response.status} ${response.statusText}`);
	}

	const data = await response.json();
	return data.data || [];
}

/**
 * Create a new role
 */
async function createRole(
	token: string,
	role: { name: string; icon: string; description: string; admin_access: boolean; app_access: boolean },
): Promise<DirectusRole> {
	const url = `${process.env.DIRECTUS_URL}/roles`;
	const response = await fetch(url, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(role),
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Failed to create role ${role.name}: ${response.status} - ${error}`);
	}

	const data = await response.json();
	return data.data;
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
 * Create a new policy
 */
async function createPolicy(
	token: string,
	policy: { name: string; icon: string; description: string; admin_access: boolean; app_access: boolean },
): Promise<DirectusPolicy> {
	const url = `${process.env.DIRECTUS_URL}/policies`;
	const response = await fetch(url, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(policy),
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Failed to create policy ${policy.name}: ${response.status} - ${error}`);
	}

	const data = await response.json();
	return data.data;
}

/**
 * Link a policy to a role by updating the policy's roles array
 */
async function linkPolicyToRole(token: string, roleId: string, policyId: string): Promise<void> {
	const url = `${process.env.DIRECTUS_URL}/policies/${policyId}`;
	const response = await fetch(url, {
		method: 'PATCH',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			roles: [roleId],
		}),
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Failed to link policy to role: ${response.status} - ${error}`);
	}
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
		rolesChecked: 0,
		rolesCreated: [],
		rolesUpdated: [],
		permissionsSet: 0,
		dryRun,
		errors: [],
	};

	try {
		// Step 1: Authenticate
		console.log('\n🔐 Step 1: Authenticating...');
		const token = await authenticate();

		// Step 2: Fetch existing roles
		console.log('\n📋 Step 2: Fetching existing roles...');
		const existingRoles = await fetchRoles(token);
		console.log(`   Found ${existingRoles.length} existing roles`);

		// Step 3: Create/verify roles
		console.log('\n👥 Step 3: Setting up roles...');
		const roleMap = new Map<string, string>(); // name → id

		for (const roleDef of ROLE_DEFINITIONS) {
			result.rolesChecked++;
			const existing = existingRoles.find((r) => r.name === roleDef.name);

			if (existing) {
				console.log(`   ✓ Role "${roleDef.name}" already exists (ID: ${existing.id})`);
				roleMap.set(roleDef.name, existing.id);
			} else {
				if (dryRun) {
					console.log(`   [DRY-RUN] Would create role: ${roleDef.name}`);
					result.rolesCreated.push(roleDef.name);
				} else {
					console.log(`   Creating role: ${roleDef.name}...`);
					const created = await createRole(token, roleDef);
					console.log(`   ✅ Created role "${roleDef.name}" (ID: ${created.id})`);
					result.rolesCreated.push(roleDef.name);
					roleMap.set(roleDef.name, created.id);
				}
			}
		}

		// If dry-run and roles don't exist, we can't proceed with permissions
		if (dryRun && result.rolesCreated.length > 0) {
			console.log('\n⚠️  Dry-run: Roles need to be created before permissions can be set');
			console.log('   Run with --execute to create roles and set permissions');
			return result;
		}

		// Step 3.5: Create/verify policies for each role
		console.log('\n🔐 Step 3.5: Setting up policies...');
		const existingPolicies = await fetchPolicies(token);
		const policyMap = new Map<string, string>(); // roleName → policyId

		for (const roleDef of ROLE_DEFINITIONS) {
			const policyName = `${roleDef.name} Policy`;
			const existing = existingPolicies.find((p) => p.name === policyName);

			if (existing) {
				console.log(`   ✓ Policy "${policyName}" exists (ID: ${existing.id})`);
				policyMap.set(roleDef.name, existing.id!);

				// Check if policy is linked to role
				const roleId = roleMap.get(roleDef.name) || existingRoles.find((r) => r.name === roleDef.name)?.id;
				if (roleId && existing.roles && !existing.roles.includes(roleId)) {
					if (!dryRun) {
						try {
							await linkPolicyToRole(token, roleId, existing.id!);
							console.log(`   ✅ Linked existing policy to role ${roleDef.name}`);
						} catch (error) {
							console.log(`   ⚠️  Could not auto-link policy to role ${roleDef.name}: ${error instanceof Error ? error.message : String(error)}`);
							console.log(`   ℹ️  Manual step required: Link policy "${policyName}" (${existing.id}) to role "${roleDef.name}" (${roleId}) via Directus UI`);
						}
					}
				}
			} else {
				if (dryRun) {
					console.log(`   [DRY-RUN] Would create policy: ${policyName}`);
				} else {
					console.log(`   Creating policy: ${policyName}...`);
					const created = await createPolicy(token, {
						name: policyName,
						icon: roleDef.icon,
						description: `Policy for ${roleDef.name} role`,
						admin_access: roleDef.admin_access,
						app_access: roleDef.app_access,
					});
					console.log(`   ✅ Created policy "${policyName}" (ID: ${created.id})`);
					policyMap.set(roleDef.name, created.id!);

					// Try to link policy to role (may fail due to permissions)
					const roleId = roleMap.get(roleDef.name);
					if (roleId) {
						try {
							await linkPolicyToRole(token, roleId, created.id!);
							console.log(`   ✅ Linked policy to role ${roleDef.name}`);
						} catch (error) {
							console.log(`   ⚠️  Could not auto-link policy to role ${roleDef.name}: ${error instanceof Error ? error.message : String(error)}`);
							console.log(`   ℹ️  Manual step required: Link policy "${policyName}" (${created.id}) to role "${roleDef.name}" (${roleId}) via Directus UI`);
						}
					}
				}
			}
		}

		// Step 4: Set up permissions for knowledge_documents
		console.log('\n🔒 Step 4: Setting up permissions for knowledge_documents...');

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
// Main Entry Point
// ============================================================================

async function main(): Promise<void> {
	console.log('╔════════════════════════════════════════════════════════════════╗');
	console.log('║  Task 0048: RBAC Setup for knowledge_documents                ║');
	console.log('╚════════════════════════════════════════════════════════════════╝');

	// Parse arguments
	const { dryRun, execute } = parseArgs();
	const mode = dryRun ? 'DRY-RUN' : 'EXECUTE';
	console.log(`\n📋 Mode: ${mode}`);

	// Validate environment
	validateEnvironment();

	// Run RBAC setup
	const result = await setupRBAC(dryRun);

	// Print summary
	console.log('\n╔════════════════════════════════════════════════════════════════╗');
	console.log('║  Summary                                                       ║');
	console.log('╚════════════════════════════════════════════════════════════════╝');
	console.log(`Mode:              ${mode}`);
	console.log(`Roles checked:     ${result.rolesChecked}`);
	console.log(`Roles created:     ${result.rolesCreated.length} (${result.rolesCreated.join(', ') || 'none'})`);
	console.log(`Permissions set:   ${result.permissionsSet}`);
	console.log(`Errors:            ${result.errors.length}`);

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
}

// Run the script
main().catch((error) => {
	console.error('\n❌ Fatal error:', error instanceof Error ? error.message : String(error));
	process.exit(1);
});
