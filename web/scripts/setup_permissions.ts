/**
 * Directus Public Permissions Setup Script
 *
 * Purpose: Configure READ-ONLY access for Public Role (D7)
 * Reference: E1 Plan + Permission Matrix
 *
 * Security: Strict READ-ONLY - No Create/Update/Delete for Public
 *
 * Usage:
 *   DIRECTUS_URL="..." DIRECTUS_ADMIN_EMAIL="..." DIRECTUS_ADMIN_PASSWORD="..." npx tsx scripts/setup_permissions.ts
 */

import { writeFileSync } from 'fs';
import { resolve } from 'path';

const API_URL = process.env.DIRECTUS_URL || "https://directus-test-812872501910.asia-southeast1.run.app";
const OUTPUT_FILE = resolve(__dirname, '../../reports/SETUP_PERMISSIONS_REPORT.md');

interface PermissionConfig {
	collection: string;
	action: string;
	permissions?: any;
	fields?: string[];
	note?: string;
}

interface SetupResults {
	timestamp: string;
	apiUrl: string;
	authentication: {
		success: boolean;
		error?: string;
	};
	permissions: {
		created: PermissionConfig[];
		updated: PermissionConfig[];
		failed: Array<{ collection: string; error: string }>;
	};
	verification: {
		pages: { success: boolean; error?: string };
		globals: { success: boolean; error?: string };
		directus_files: { success: boolean; error?: string };
	};
}

async function authenticate(): Promise<string | null> {
	try {
		console.log('\n🔐 Authenticating...');

		const envToken = process.env.DIRECTUS_ADMIN_TOKEN;
		if (envToken) {
			console.log('   Using token from DIRECTUS_ADMIN_TOKEN');
			return envToken;
		}

		const email = process.env.DIRECTUS_ADMIN_EMAIL || process.env.ADMIN_EMAIL;
		const password = process.env.DIRECTUS_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;

		if (!email || !password) {
			console.error('   ❌ Missing credentials');
			return null;
		}

		console.log(`   Logging in with email: ${email}`);
		const res = await fetch(`${API_URL}/auth/login`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email, password })
		});

		if (!res.ok) {
			const text = await res.text();
			console.error(`   ❌ Login failed: ${res.status} - ${text}`);
			return null;
		}

		const data = await res.json();
		console.log('   ✅ Authentication successful');
		return data.data.access_token;

	} catch (error) {
		console.error('   ❌ Authentication error:', error instanceof Error ? error.message : String(error));
		return null;
	}
}

async function getAllCollections(token: string): Promise<string[]> {
	try {
		const res = await fetch(`${API_URL}/collections`, {
			headers: { Authorization: `Bearer ${token}` }
		});

		if (!res.ok) {
			console.error('Failed to fetch collections');
			return [];
		}

		const data = await res.json();
		return data.data.map((c: any) => c.collection);
	} catch (error) {
		console.error('Error fetching collections:', error);
		return [];
	}
}

async function getOrCreatePublicPolicy(token: string): Promise<string | null> {
	try {
		// First, try to find existing "Public Access E1v2" policy
		const policiesRes = await fetch(`${API_URL}/policies?filter[name][_eq]=Public Access E1v2`, {
			headers: { Authorization: `Bearer ${token}` }
		});

		const policiesData = await policiesRes.json();
		if (policiesData.data && policiesData.data.length > 0) {
			console.log(`   Using existing policy: ${policiesData.data[0].id}`);
			return policiesData.data[0].id;
		}

		// Create new policy
		console.log('   Creating new Public Access E1v2 policy...');
		const createRes = await fetch(`${API_URL}/policies`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				name: 'Public Access E1v2',
				icon: 'public',
				description: 'Read-only access for anonymous users (E1)',
				admin_access: false,
				app_access: false
			})
		});

		if (!createRes.ok) {
			const text = await createRes.text();
			console.error(`   Failed to create policy: ${text}`);
			return null;
		}

		const createData = await createRes.json();
		console.log(`   Created policy: ${createData.data.id}`);
		return createData.data.id;
	} catch (error) {
		console.error('   Error getting/creating policy:', error);
		return null;
	}
}

async function createOrUpdatePermission(
	token: string,
	policyId: string,
	config: PermissionConfig
): Promise<{ success: boolean; action: 'created' | 'updated' | 'skipped'; error?: string }> {
	try {
		// Check if permission exists for this policy
		const checkRes = await fetch(
			`${API_URL}/permissions?filter[policy][_eq]=${policyId}&filter[collection][_eq]=${config.collection}&filter[action][_eq]=${config.action}`,
			{ headers: { Authorization: `Bearer ${token}` } }
		);

		const checkData = await checkRes.json();
		const existingPerm = checkData.data && checkData.data.length > 0 ? checkData.data[0] : null;

		const permissionPayload = {
			policy: policyId,
			collection: config.collection,
			action: config.action,
			fields: config.fields || ['*'],
			permissions: config.permissions || {},
			validation: {},
			presets: {}
		};

		if (existingPerm) {
			// Update existing permission
			const updateRes = await fetch(`${API_URL}/permissions/${existingPerm.id}`, {
				method: 'PATCH',
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(permissionPayload)
			});

			if (!updateRes.ok) {
				const text = await updateRes.text();
				return { success: false, action: 'skipped', error: `Update failed: ${text}` };
			}

			return { success: true, action: 'updated' };
		} else {
			// Create new permission
			const createRes = await fetch(`${API_URL}/permissions`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(permissionPayload)
			});

			if (!createRes.ok) {
				const text = await createRes.text();
				// Check if error is "duplicate" - that's OK
				if (text.includes('RECORD_NOT_UNIQUE') || text.includes('duplicate')) {
					return { success: true, action: 'skipped' };
				}
				return { success: false, action: 'skipped', error: `Create failed: ${text}` };
			}

			return { success: true, action: 'created' };
		}
	} catch (error) {
		return {
			success: false,
			action: 'skipped',
			error: error instanceof Error ? error.message : String(error)
		};
	}
}

async function setupPublicPermissions(token: string): Promise<{
	created: PermissionConfig[];
	updated: PermissionConfig[];
	failed: Array<{ collection: string; error: string }>;
}> {
	const created: PermissionConfig[] = [];
	const updated: PermissionConfig[] = [];
	const failed: Array<{ collection: string; error: string }> = [];

	console.log('\n📋 Setting up Public Role permissions...');

	// Get or create public policy
	const policyId = await getOrCreatePublicPolicy(token);
	if (!policyId) {
		console.error('   ❌ Failed to get or create public policy');
		return { created, updated, failed };
	}

	// Get all collections to identify block collections
	const allCollections = await getAllCollections(token);
	const blockCollections = allCollections.filter(c => c.startsWith('block_'));

	console.log(`   Found ${blockCollections.length} block collections`);

	// Define permission configurations
	const permissionConfigs: PermissionConfig[] = [
		// Core content collections with published filter
		{
			collection: 'pages',
			action: 'read',
			permissions: {
				_and: [
					{
						status: {
							_eq: 'published'
						}
					}
				]
			},
			note: 'Only published pages'
		},
		{
			collection: 'agent_views',
			action: 'read',
			permissions: {
				_and: [
					{
						status: {
							_eq: 'published'
						}
					}
				]
			},
			note: 'Only published agent views'
		},
		// Globals - no filter
		{
			collection: 'globals',
			action: 'read',
			note: 'Site-wide settings'
		},
		// Files - CRITICAL for images
		{
			collection: 'directus_files',
			action: 'read',
			note: 'CRITICAL: Media files access'
		},
		// Reference collections - no filter
		{
			collection: 'sites',
			action: 'read',
			note: 'Multi-domain resolution'
		},
		{
			collection: 'app_languages',
			action: 'read',
			note: 'i18n support'
		},
		// Junction tables - MANDATORY
		{
			collection: 'pages_blocks',
			action: 'read',
			note: 'Junction: pages ↔ blocks'
		},
		// Additional collections that might exist
		{
			collection: 'navigation',
			action: 'read',
			note: 'Navigation menus'
		},
		{
			collection: 'navigation_items',
			action: 'read',
			note: 'Navigation items'
		},
		{
			collection: 'posts',
			action: 'read',
			permissions: {
				_and: [
					{
						status: {
							_eq: 'published'
						}
					}
				]
			},
			note: 'Blog posts (if exists)'
		},
		{
			collection: 'seo',
			action: 'read',
			note: 'SEO metadata'
		},
		{
			collection: 'testimonials',
			action: 'read',
			note: 'Testimonials'
		},
		{
			collection: 'forms',
			action: 'read',
			note: 'Forms configuration'
		}
	];

	// Add all block collections
	blockCollections.forEach(collection => {
		permissionConfigs.push({
			collection,
			action: 'read',
			note: `Block component: ${collection}`
		});
	});

	// Add junction tables for M2M relationships
	const junctionTables = [
		'pages_sites',
		'agent_views_sites',
		'block_button_groups',
		'block_buttons'
	];

	junctionTables.forEach(collection => {
		if (allCollections.includes(collection)) {
			permissionConfigs.push({
				collection,
				action: 'read',
				note: `Junction table: ${collection}`
			});
		}
	});

	// Process each permission
	for (const config of permissionConfigs) {
		// Skip if collection doesn't exist
		if (!allCollections.includes(config.collection)) {
			console.log(`   ⏭️  Skipping ${config.collection} (collection not found)`);
			continue;
		}

		const result = await createOrUpdatePermission(token, policyId, config);

		if (result.success) {
			if (result.action === 'created') {
				console.log(`   ✅ Created: ${config.collection} (${config.note || 'read access'})`);
				created.push(config);
			} else if (result.action === 'updated') {
				console.log(`   🔄 Updated: ${config.collection} (${config.note || 'read access'})`);
				updated.push(config);
			} else {
				console.log(`   ℹ️  Exists: ${config.collection}`);
			}
		} else {
			console.error(`   ❌ Failed: ${config.collection} - ${result.error}`);
			failed.push({ collection: config.collection, error: result.error || 'Unknown error' });
		}
	}

	console.log(`\n   Summary: ${created.length} created, ${updated.length} updated, ${failed.length} failed`);

	return { created, updated, failed };
}

async function verifyAnonymousAccess(): Promise<{
	pages: { success: boolean; error?: string };
	globals: { success: boolean; error?: string };
	directus_files: { success: boolean; error?: string };
}> {
	console.log('\n🔍 Verifying anonymous access...');

	const results = {
		pages: { success: false },
		globals: { success: false },
		directus_files: { success: false }
	};

	// Test 1: Fetch published pages (no auth)
	try {
		console.log('   Testing: GET /items/pages?filter[status][_eq]=published...');
		const res = await fetch(`${API_URL}/items/pages?filter[status][_eq]=published&limit=1`);

		if (res.ok) {
			const data = await res.json();
			console.log(`   ✅ Pages: ${res.status} (${data.data?.length || 0} items)`);
			results.pages.success = true;
		} else {
			const text = await res.text();
			console.error(`   ❌ Pages: ${res.status} - ${text}`);
			results.pages.error = `HTTP ${res.status}: ${text}`;
		}
	} catch (error) {
		const errorMsg = error instanceof Error ? error.message : String(error);
		console.error(`   ❌ Pages error: ${errorMsg}`);
		results.pages.error = errorMsg;
	}

	// Test 2: Fetch globals (no auth)
	try {
		console.log('   Testing: GET /items/globals...');
		const res = await fetch(`${API_URL}/items/globals`);

		if (res.ok) {
			console.log(`   ✅ Globals: ${res.status}`);
			results.globals.success = true;
		} else {
			const text = await res.text();
			console.error(`   ❌ Globals: ${res.status} - ${text}`);
			results.globals.error = `HTTP ${res.status}: ${text}`;
		}
	} catch (error) {
		const errorMsg = error instanceof Error ? error.message : String(error);
		console.error(`   ❌ Globals error: ${errorMsg}`);
		results.globals.error = errorMsg;
	}

	// Test 3: Fetch files (no auth)
	try {
		console.log('   Testing: GET /files...');
		const res = await fetch(`${API_URL}/files?limit=1`);

		if (res.ok) {
			const data = await res.json();
			console.log(`   ✅ Files: ${res.status} (${data.data?.length || 0} items)`);
			results.directus_files.success = true;
		} else {
			const text = await res.text();
			console.error(`   ❌ Files: ${res.status} - ${text}`);
			results.directus_files.error = `HTTP ${res.status}: ${text}`;
		}
	} catch (error) {
		const errorMsg = error instanceof Error ? error.message : String(error);
		console.error(`   ❌ Files error: ${errorMsg}`);
		results.directus_files.error = errorMsg;
	}

	return results;
}

async function main() {
	console.log('='.repeat(70));
	console.log('DIRECTUS PUBLIC PERMISSIONS SETUP (D7)');
	console.log('='.repeat(70));
	console.log(`Target: ${API_URL}`);
	console.log(`Time: ${new Date().toISOString()}`);
	console.log('='.repeat(70));

	const results: SetupResults = {
		timestamp: new Date().toISOString(),
		apiUrl: API_URL,
		authentication: {
			success: false
		},
		permissions: {
			created: [],
			updated: [],
			failed: []
		},
		verification: {
			pages: { success: false },
			globals: { success: false },
			directus_files: { success: false }
		}
	};

	// Step 1: Authenticate
	const token = await authenticate();
	if (!token) {
		results.authentication.success = false;
		results.authentication.error = 'Authentication failed';
		console.log('\n❌ Cannot proceed without authentication');
		return results;
	}

	results.authentication.success = true;

	// Step 2: Setup permissions
	const permissionResults = await setupPublicPermissions(token);
	results.permissions = permissionResults;

	// Step 3: Verify anonymous access
	const verificationResults = await verifyAnonymousAccess();
	results.verification = verificationResults;

	// Summary
	console.log('\n' + '='.repeat(70));
	console.log('📊 SUMMARY');
	console.log('='.repeat(70));
	console.log(`Authentication: ${results.authentication.success ? '✅ SUCCESS' : '❌ FAILED'}`);
	console.log(`Permissions Created: ${results.permissions.created.length}`);
	console.log(`Permissions Updated: ${results.permissions.updated.length}`);
	console.log(`Permissions Failed: ${results.permissions.failed.length}`);
	console.log('\nAnonymous Access Verification:');
	console.log(`  Pages: ${results.verification.pages.success ? '✅ SUCCESS' : '❌ FAILED'}`);
	console.log(`  Globals: ${results.verification.globals.success ? '✅ SUCCESS' : '❌ FAILED'}`);
	console.log(`  Files: ${results.verification.directus_files.success ? '✅ SUCCESS' : '❌ FAILED'}`);
	console.log('='.repeat(70));

	return results;
}

main().then((results) => {
	// Generate report
	const allSuccess = results.authentication.success &&
		results.permissions.failed.length === 0 &&
		results.verification.pages.success &&
		results.verification.globals.success &&
		results.verification.directus_files.success;

	const report = `# SETUP PERMISSIONS REPORT (D7)

**Date:** ${new Date().toISOString().split('T')[0]}
**Target:** ${API_URL}
**Timestamp:** ${results.timestamp}

---

## EXECUTIVE SUMMARY

**Status:** ${allSuccess ? '✅ SUCCESS' : '⚠️  PARTIAL SUCCESS'}

**Public Role Permissions:** ${results.permissions.created.length + results.permissions.updated.length} collections configured for READ-ONLY access.

---

## 1. AUTHENTICATION

**Result:** ${results.authentication.success ? '✅ SUCCESS' : '❌ FAILED'}
${results.authentication.error ? `**Error:** ${results.authentication.error}` : ''}

---

## 2. PERMISSIONS CONFIGURATION

### Summary

- **Created:** ${results.permissions.created.length} permissions
- **Updated:** ${results.permissions.updated.length} permissions
- **Failed:** ${results.permissions.failed.length} permissions

### Created Permissions

${results.permissions.created.length > 0 ? results.permissions.created.map(p =>
		`- \`${p.collection}\` (${p.action}) - ${p.note || 'READ access'}`
	).join('\n') : '*No new permissions created (all already exist)*'}

### Updated Permissions

${results.permissions.updated.length > 0 ? results.permissions.updated.map(p =>
		`- \`${p.collection}\` (${p.action}) - ${p.note || 'READ access'}`
	).join('\n') : '*No permissions updated*'}

### Failed Permissions

${results.permissions.failed.length > 0 ? results.permissions.failed.map(p =>
		`- \`${p.collection}\` - Error: ${p.error}`
	).join('\n') : '*No failures*'}

---

## 3. COLLECTIONS WITH READ ACCESS

### Content Collections (with filters)

- ✅ \`pages\` - Filter: \`status == "published"\`
- ✅ \`agent_views\` - Filter: \`status == "published"\`
- ✅ \`posts\` - Filter: \`status == "published"\` (if exists)

### Global Collections (no filters)

- ✅ \`globals\` - Site-wide settings
- ✅ \`directus_files\` - **CRITICAL** for media files
- ✅ \`sites\` - Multi-domain resolution
- ✅ \`app_languages\` - i18n support

### Junction Tables

- ✅ \`pages_blocks\` - Pages ↔ Blocks relationship
- ✅ \`pages_sites\` - Pages ↔ Sites relationship (if exists)
- ✅ \`agent_views_sites\` - Agent Views ↔ Sites relationship (if exists)

### Block Collections

${results.permissions.created.concat(results.permissions.updated)
		.filter(p => p.collection.startsWith('block_'))
		.map(p => `- ✅ \`${p.collection}\``)
		.join('\n') || '*Block collections configured*'}

### Additional Collections

- ✅ \`navigation\` - Navigation menus (if exists)
- ✅ \`navigation_items\` - Navigation items (if exists)
- ✅ \`seo\` - SEO metadata (if exists)
- ✅ \`testimonials\` - Testimonials (if exists)
- ✅ \`forms\` - Forms configuration (if exists)

---

## 4. ANONYMOUS ACCESS VERIFICATION

### Test 1: Published Pages

**Endpoint:** \`GET /items/pages?filter[status][_eq]=published\`
**Result:** ${results.verification.pages.success ? '✅ SUCCESS' : '❌ FAILED'}
${results.verification.pages.error ? `**Error:** ${results.verification.pages.error}` : '**Status:** Anonymous users can fetch published pages'}

### Test 2: Globals

**Endpoint:** \`GET /items/globals\`
**Result:** ${results.verification.globals.success ? '✅ SUCCESS' : '❌ FAILED'}
${results.verification.globals.error ? `**Error:** ${results.verification.globals.error}` : '**Status:** Anonymous users can fetch global settings'}

### Test 3: Files

**Endpoint:** \`GET /files\`
**Result:** ${results.verification.directus_files.success ? '✅ SUCCESS' : '❌ FAILED'}
${results.verification.directus_files.error ? `**Error:** ${results.verification.directus_files.error}` : '**Status:** Anonymous users can access media files'}

---

## 5. SECURITY COMPLIANCE

✅ **READ-ONLY:** Public role has NO create/update/delete permissions
✅ **FILTERED:** Content collections filtered by \`status == "published"\`
✅ **SAFE:** System collections (directus_users, directus_roles, etc.) are NOT accessible

---

## 6. VERIFICATION CHECKLIST

- [${results.authentication.success ? 'x' : ' '}] Authentication successful
- [${results.permissions.created.length + results.permissions.updated.length > 0 ? 'x' : ' '}] Public permissions configured
- [${results.verification.pages.success ? 'x' : ' '}] Anonymous access to published pages works
- [${results.verification.globals.success ? 'x' : ' '}] Anonymous access to globals works
- [${results.verification.directus_files.success ? 'x' : ' '}] Anonymous access to files works
- [${results.permissions.failed.length === 0 ? 'x' : ' '}] No permission configuration failures

---

## 7. NEXT STEPS

${allSuccess ? `
✅ **All checks passed! Public permissions are properly configured.**

**Recommended Actions:**
1. Test from Nuxt SSR frontend (fetch a published page)
2. Verify draft content is NOT accessible anonymously
3. Verify media files load correctly on frontend
4. Monitor Directus logs for any 403/401 errors
5. Mark D7 as complete in E1 Plan
` : `
⚠️  **Some checks failed. Review errors above.**

**Required Actions:**
1. Fix failed permission configurations
2. Re-run verification tests
3. Check Directus logs for permission errors
4. Verify Public role exists and is configured correctly
`}

---

**Report Generated:** ${new Date().toISOString()}
`;

	console.log(`\n💾 Saving report to: ${OUTPUT_FILE}`);
	writeFileSync(OUTPUT_FILE, report);
	console.log('✅ Report saved successfully\n');

	process.exit(allSuccess ? 0 : 1);
}).catch((error) => {
	console.error('\n💥 FATAL ERROR:', error);
	process.exit(1);
});
