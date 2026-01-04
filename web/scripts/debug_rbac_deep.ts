/**
 * RBAC Deep Forensic Debugging Script
 *
 * MISSION: Investigate why Agent Role gets 403 on content_requests
 *
 * ROOT CAUSE HYPOTHESIS:
 * - Directus v10+ requires permissions to be attached to a Policy
 * - That Policy must be attached to the Role
 * - Previous script may have created permissions but failed to link policy to role
 *
 * This script will prove if permissions are orphaned (not linked to role's active policy)
 *
 * Usage:
 *   npx tsx web/scripts/debug_rbac_deep.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../.env') });

const DIRECTUS_URL = process.env.NUXT_PUBLIC_DIRECTUS_URL;
const ADMIN_EMAIL = process.env.DIRECTUS_ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.DIRECTUS_ADMIN_PASSWORD || 'Directus@2025!';

interface DirectusRole {
	id: string;
	name: string;
	policies?: string[];
	[key: string]: unknown;
}

interface DirectusPolicy {
	id: string;
	name: string;
	[key: string]: unknown;
}

interface DirectusPermission {
	id: number;
	collection: string;
	action: string;
	policy: string | null;
	role: string | null;
	permissions: unknown;
	validation: unknown;
	presets: unknown;
	fields: string[];
	[key: string]: unknown;
}

async function authenticateAdmin(): Promise<string> {
	const response = await fetch(`${DIRECTUS_URL}/auth/login`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			email: ADMIN_EMAIL,
			password: ADMIN_PASSWORD,
		}),
	});

	if (!response.ok) {
		throw new Error(`Admin authentication failed: ${response.status}`);
	}

	const data = await response.json();
	return data.data.access_token as string;
}

async function fetchAgentRole(token: string): Promise<DirectusRole | null> {
	const response = await fetch(`${DIRECTUS_URL}/roles?filter[name][_eq]=Agent&fields=*`, {
		method: 'GET',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
	});

	if (!response.ok) {
		throw new Error(`Failed to fetch Agent role: ${response.status}`);
	}

	const data = await response.json();
	const roles = data.data as DirectusRole[];

	if (roles.length === 0) {
		return null;
	}

	return roles[0];
}

async function fetchPolicies(token: string, policyIds: string[]): Promise<DirectusPolicy[]> {
	if (policyIds.length === 0) {
		return [];
	}

	const response = await fetch(
		`${DIRECTUS_URL}/policies?filter[id][_in]=${policyIds.join(',')}&fields=*`,
		{
			method: 'GET',
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json',
			},
		},
	);

	if (!response.ok) {
		throw new Error(`Failed to fetch policies: ${response.status}`);
	}

	const data = await response.json();
	return data.data as DirectusPolicy[];
}

async function fetchPermissionsForCollection(
	token: string,
	collection: string,
): Promise<DirectusPermission[]> {
	const response = await fetch(
		`${DIRECTUS_URL}/permissions?filter[collection][_eq]=${collection}&fields=*`,
		{
			method: 'GET',
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json',
			},
		},
	);

	if (!response.ok) {
		throw new Error(`Failed to fetch permissions for ${collection}: ${response.status}`);
	}

	const data = await response.json();
	return data.data as DirectusPermission[];
}

async function debugRBAC(): Promise<void> {
	console.log('='.repeat(80));
	console.log('RBAC DEEP FORENSIC DEBUGGING');
	console.log('='.repeat(80));
	console.log();

	// Step 1: Authenticate
	console.log('Step 1: Authenticating as Admin...');
	const token = await authenticateAdmin();
	console.log('✅ Admin authenticated');
	console.log();

	// Step 2: Fetch Agent Role
	console.log('Step 2: Fetching Agent Role...');
	const agentRole = await fetchAgentRole(token);

	if (!agentRole) {
		console.error('❌ Agent role not found!');
		process.exit(1);
	}

	console.log(`✅ Agent Role found: ${agentRole.name} (ID: ${agentRole.id})`);
	console.log();

	// Step 3: Analyze Role Policies
	console.log('Step 3: Analyzing Role Policies...');
	console.log(`Role policies field: ${JSON.stringify(agentRole.policies, null, 2)}`);
	console.log();

	if (!agentRole.policies || agentRole.policies.length === 0) {
		console.error('❌ CRITICAL: Agent Role has NO policies attached!');
		console.error('   This is the root cause - permissions need to be attached to a policy,');
		console.error('   and that policy must be in the role\'s policies array.');
	} else {
		console.log(`✅ Agent Role has ${agentRole.policies.length} policies attached`);
		console.log();

		// Fetch policy details
		console.log('Fetching policy details...');
		const policies = await fetchPolicies(token, agentRole.policies);

		console.log('Policies:');
		policies.forEach((policy) => {
			console.log(`  - ${policy.name} (ID: ${policy.id})`);
		});
	}
	console.log();

	// Step 4: Fetch Permissions for content_requests
	console.log('Step 4: Fetching Permissions for content_requests...');
	const permissions = await fetchPermissionsForCollection(token, 'content_requests');

	if (permissions.length === 0) {
		console.error('❌ NO permissions found for content_requests!');
	} else {
		console.log(`✅ Found ${permissions.length} permissions for content_requests`);
		console.log();

		console.log('Permission Details:');
		permissions.forEach((perm) => {
			console.log(`  Permission ID: ${perm.id}`);
			console.log(`    Action: ${perm.action}`);
			console.log(`    Policy: ${perm.policy || '(null - ORPHANED!)'}`);
			console.log(`    Role: ${perm.role || '(null)'}`);
			console.log(`    Fields: ${JSON.stringify(perm.fields)}`);
			console.log();
		});

		// Step 5: Check if permissions are orphaned
		console.log('Step 5: Checking for orphaned permissions...');
		const orphanedPerms = permissions.filter((perm) => !perm.policy);
		const linkedPerms = permissions.filter((perm) => perm.policy);

		if (orphanedPerms.length > 0) {
			console.error(`❌ Found ${orphanedPerms.length} ORPHANED permissions (no policy link)`);
			orphanedPerms.forEach((perm) => {
				console.error(`   - Permission ${perm.id} (${perm.action}) has NO policy`);
			});
		}

		if (linkedPerms.length > 0) {
			console.log(`✅ Found ${linkedPerms.length} permissions linked to policies`);
			linkedPerms.forEach((perm) => {
				console.log(`   - Permission ${perm.id} (${perm.action}) → Policy ${perm.policy}`);
			});
			console.log();

			// Check if these policies are in the role's policies array
			if (agentRole.policies && agentRole.policies.length > 0) {
				console.log('Step 6: Verifying policy linkage to role...');
				const rolePolicyIds = agentRole.policies;

				linkedPerms.forEach((perm) => {
					if (perm.policy && rolePolicyIds.includes(perm.policy)) {
						console.log(`   ✅ Permission ${perm.id} policy IS in role's policies array`);
					} else {
						console.error(
							`   ❌ Permission ${perm.id} policy NOT in role's policies array (ORPHANED!)`,
						);
					}
				});
			}
		}
	}

	console.log();
	console.log('='.repeat(80));
	console.log('DIAGNOSIS COMPLETE');
	console.log('='.repeat(80));
}

// Run the debug script
debugRBAC().catch((error) => {
	console.error('❌ Debug script failed:', error);
	process.exit(1);
});
