/**
 * E1-11: Fix Public Permissions
 *
 * MISSION: Configure Directus RBAC to allow Public Read Access to essential content
 * CONTEXT: CI smoke-test failing with 403 Forbidden on /items/pages
 *
 * OPERATIONS:
 * 1. Find the Public Policy (Directus v10+ uses policy-based access)
 * 2. Grant READ access to: pages, globals, directus_files, navigation_items, etc.
 * 3. Only create permissions for collections that exist
 *
 * Usage:
 *   npx tsx web/scripts/e1-11_fix_public_permissions.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../.env') });

const DIRECTUS_URL = process.env.NUXT_PUBLIC_DIRECTUS_URL || process.env.DIRECTUS_URL;

function requireEnv(key: string): string {
	const value = process.env[key];
	if (!value) {
		throw new Error(`Missing required environment variable: ${key}`);
	}
	return value;
}

if (!DIRECTUS_URL) {
	throw new Error('Missing DIRECTUS_URL (or NUXT_PUBLIC_DIRECTUS_URL)');
}

const ADMIN_EMAIL = requireEnv('DIRECTUS_ADMIN_EMAIL');
const ADMIN_PASSWORD = requireEnv('DIRECTUS_ADMIN_PASSWORD');

// Collections that need public READ access
const PUBLIC_READ_COLLECTIONS = [
	'pages',
	'globals',
	'directus_files',
	'navigation',
	'navigation_items',
	'knowledge_folders',
	'knowledge',
	'posts',
	'categories',
	'app_languages',
];

interface Permission {
	id?: number;
	role: string | null;
	collection: string;
	action: string;
	fields: string[] | string;
	permissions?: Record<string, unknown>;
	validation?: Record<string, unknown>;
}

interface DirectusRole {
	id: string;
	name: string;
	icon: string;
	description: string | null;
	ip_access: string | null;
	enforce_tfa: boolean;
	admin_access: boolean;
	app_access: boolean;
}

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

async function getPublicPolicyId(token: string): Promise<string | null> {
	console.log('  Finding Public Policy...');

	const response = await fetch(`${DIRECTUS_URL}/policies`, {
		method: 'GET',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
	});

	if (!response.ok) {
		const text = await response.text();
		throw new Error(`Failed to fetch policies: ${response.status} - ${text}`);
	}

	const data = await response.json();
	const policies = data.data as { id: string; name: string; admin_access: boolean }[];

	// Find public policy (name contains "public" or has admin_access: false and is linked to null role)
	const publicPolicy = policies.find((p) => p.name.toLowerCase().includes('public') || p.name === '$t:public_label');

	if (publicPolicy) {
		console.log(`  ✅ Found Public Policy: ${publicPolicy.name} (ID: ${publicPolicy.id})`);
		return publicPolicy.id;
	}

	console.log('  ⚠️  No Public Policy found');
	return null;
}

async function getExistingPermissions(token: string, policyId: string): Promise<Permission[]> {
	console.log('  Fetching existing permissions for public policy...');

	const response = await fetch(`${DIRECTUS_URL}/permissions?filter[policy][_eq]=${policyId}&limit=-1`, {
		method: 'GET',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
	});

	if (!response.ok) {
		const text = await response.text();
		throw new Error(`Failed to fetch permissions: ${response.status} - ${text}`);
	}

	const data = await response.json();
	const permissions = data.data as Permission[];
	console.log(`  ℹ️  Found ${permissions.length} existing public permissions`);
	return permissions;
}

async function checkCollectionExists(token: string, collection: string): Promise<boolean> {
	const response = await fetch(`${DIRECTUS_URL}/collections/${collection}`, {
		method: 'GET',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
	});

	return response.ok;
}


async function grantPublicReadAccess(token: string): Promise<{ created: string[]; skipped: string[]; missing: string[]; policyId: string | null }> {
	console.log('  Granting public READ access to collections...\n');

	// Step 1: Find public policy
	const policyId = await getPublicPolicyId(token);
	if (!policyId) {
		throw new Error('Public policy not found. Cannot configure public permissions.');
	}

	const existingPermissions = await getExistingPermissions(token, policyId);
	const created: string[] = [];
	const skipped: string[] = [];
	const missing: string[] = [];

	for (const collection of PUBLIC_READ_COLLECTIONS) {
		// Check if collection exists
		const exists = await checkCollectionExists(token, collection);
		if (!exists) {
			console.log(`  ⚠️  Collection '${collection}' does not exist - skipping`);
			missing.push(collection);
			continue;
		}

		// Check if permission already exists
		const existingPerm = existingPermissions.find(
			(p) => p.collection === collection && p.action === 'read'
		);

		if (existingPerm) {
			console.log(`  ℹ️  Permission for '${collection}' already exists (ID: ${existingPerm.id}) - skipping`);
			skipped.push(collection);
			continue;
		}

		// Create new permission with policy (Directus v10+)
		try {
			const response = await fetch(`${DIRECTUS_URL}/permissions`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					policy: policyId,
					collection: collection,
					action: 'read',
					fields: ['*'],
					permissions: {},
					validation: {},
				}),
			});

			if (!response.ok) {
				const text = await response.text();
				throw new Error(`${response.status} - ${text}`);
			}

			console.log(`  ✅ Created READ permission for '${collection}'`);
			created.push(collection);
		} catch (error) {
			console.error(`  ❌ Failed to create permission for '${collection}':`, error instanceof Error ? error.message : String(error));
		}
	}

	return { created, skipped, missing, policyId };
}

async function verifyPublicAccess(): Promise<{ collection: string; status: number; accessible: boolean }[]> {
	console.log('  Verifying public access (no auth)...\n');

	const results: { collection: string; status: number; accessible: boolean }[] = [];

	for (const collection of ['pages', 'globals']) {
		try {
			const response = await fetch(`${DIRECTUS_URL}/items/${collection}?limit=1`, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
				},
			});

			results.push({
				collection,
				status: response.status,
				accessible: response.ok,
			});

			if (response.ok) {
				console.log(`  ✅ '${collection}': HTTP ${response.status} - Accessible`);
			} else {
				console.log(`  ❌ '${collection}': HTTP ${response.status} - Blocked`);
			}
		} catch (error) {
			console.log(`  ❌ '${collection}': Failed - ${error instanceof Error ? error.message : String(error)}`);
			results.push({
				collection,
				status: 0,
				accessible: false,
			});
		}
	}

	return results;
}

async function fixPublicPermissions(): Promise<void> {
	console.log('='.repeat(80));
	console.log('E1-11: Fix Public Permissions');
	console.log('='.repeat(80));
	console.log();
	console.log('Target Collections:', PUBLIC_READ_COLLECTIONS.join(', '));
	console.log();

	try {
		// Step 1: Authenticate
		console.log('Step 1: Admin Authentication');
		const token = await authenticateAdmin();
		console.log();

		// Step 2: Grant Public READ Access
		console.log('Step 2: Grant Public READ Permissions');
		const result = await grantPublicReadAccess(token);
		console.log();

		// Step 3: Verify Access
		console.log('Step 3: Verify Public Access (Anonymous Request)');
		const verifyResults = await verifyPublicAccess();
		console.log();

		// Summary
		console.log('='.repeat(80));
		console.log('📊 Permission Fix Summary');
		console.log('='.repeat(80));
		console.log();
		console.log(`  Created: ${result.created.length} permissions`);
		if (result.created.length > 0) {
			result.created.forEach((c) => console.log(`    - ${c}`));
		}
		console.log();
		console.log(`  Skipped: ${result.skipped.length} (already exist)`);
		if (result.skipped.length > 0) {
			result.skipped.forEach((c) => console.log(`    - ${c}`));
		}
		console.log();
		console.log(`  Missing: ${result.missing.length} (collection not found)`);
		if (result.missing.length > 0) {
			result.missing.forEach((c) => console.log(`    - ${c}`));
		}
		console.log();

		// Verification Results
		const allAccessible = verifyResults.every((r) => r.accessible);
		console.log('Verification Results:');
		verifyResults.forEach((r) => {
			console.log(`  - ${r.collection}: ${r.accessible ? '✅ ACCESSIBLE' : '❌ BLOCKED'} (HTTP ${r.status})`);
		});
		console.log();

		if (allAccessible) {
			console.log('='.repeat(80));
			console.log('🟢 ACCESS GRANTED - Public permissions configured successfully');
			console.log('='.repeat(80));
		} else {
			console.log('='.repeat(80));
			console.log('🔴 STILL FORBIDDEN - Some collections are not accessible');
			console.log('='.repeat(80));
		}
	} catch (error) {
		console.error('❌ Permission fix failed:', error);
		throw error;
	}
}

// Run the script
fixPublicPermissions().catch((error) => {
	console.error('Script failed:', error);
	process.exit(1);
});
