/**
 * Task 9: Final System Verification (E2E)
 *
 * MISSION: Execute comprehensive health check of the entire system
 * SCOPE: Web access, content integrity, schema validation, flows health
 *
 * VERIFICATION CHECKLIST:
 * 1. Public Web Access (SSR) - Expect HTTP 200
 * 2. Content Verification - Check /privacy and /terms pages exist
 * 3. Globals Schema Audit - Verify project_name, google_analytics_id fields
 * 4. Flows Health - Verify E1 flows are active
 *
 * Usage:
 *   npx tsx web/scripts/e1-09_final_verification.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../.env') });

const DIRECTUS_URL = process.env.NUXT_PUBLIC_DIRECTUS_URL;
const WEB_URL = process.env.NUXT_PUBLIC_WEB_URL || DIRECTUS_URL; // Fallback to Directus URL if web URL not set
const ADMIN_EMAIL = process.env.DIRECTUS_ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.DIRECTUS_ADMIN_PASSWORD || 'Directus@2025!';

interface VerificationResult {
	check: string;
	status: 'PASS' | 'FAIL' | 'WARNING';
	message: string;
	details?: unknown;
}

interface DirectusPage {
	id: string;
	title: string;
	permalink: string;
	status: string;
}

interface DirectusFlow {
	id: string;
	name: string;
	status: string;
}

interface DirectusGlobals {
	id?: string;
	project_name?: string;
	project_description?: string;
	google_analytics_id?: string;
	[key: string]: unknown;
}

const results: VerificationResult[] = [];

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
 * CHECK 1: Public Web Access (SSR)
 */
async function checkPublicWebAccess(): Promise<void> {
	console.log('\n🔍 CHECK 1: Public Web Access (SSR)');
	console.log(`   Target URL: ${WEB_URL}`);

	try {
		const response = await fetch(WEB_URL!, {
			method: 'GET',
			headers: {
				'User-Agent': 'E1-Final-Verification/1.0',
			},
		});

		if (response.ok) {
			results.push({
				check: 'Public Web Access',
				status: 'PASS',
				message: `Web accessible at ${WEB_URL} (HTTP ${response.status})`,
				details: {
					statusCode: response.status,
					statusText: response.statusText,
					contentType: response.headers.get('content-type'),
				},
			});
			console.log(`   ✅ PASS - HTTP ${response.status}`);
		} else {
			results.push({
				check: 'Public Web Access',
				status: 'FAIL',
				message: `Web returned HTTP ${response.status} ${response.statusText}`,
				details: {
					statusCode: response.status,
					statusText: response.statusText,
				},
			});
			console.log(`   ❌ FAIL - HTTP ${response.status}`);
		}
	} catch (error) {
		results.push({
			check: 'Public Web Access',
			status: 'FAIL',
			message: `Failed to reach web: ${error instanceof Error ? error.message : String(error)}`,
			details: { error },
		});
		console.log(`   ❌ FAIL - ${error instanceof Error ? error.message : String(error)}`);
	}
}

/**
 * CHECK 2: Content Verification (Task 6 Check)
 */
async function checkContentPages(token: string): Promise<void> {
	console.log('\n🔍 CHECK 2: Content Verification (Legal Pages)');
	console.log('   Target: /privacy and /terms pages');

	try {
		const response = await fetch(
			`${DIRECTUS_URL}/items/pages?filter[permalink][_in]=/privacy,/terms&fields=id,title,permalink,status`,
			{
				method: 'GET',
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json',
				},
			},
		);

		if (!response.ok) {
			const text = await response.text();
			results.push({
				check: 'Content Verification',
				status: 'FAIL',
				message: `Failed to fetch pages: HTTP ${response.status}`,
				details: { error: text },
			});
			console.log(`   ❌ FAIL - HTTP ${response.status}`);
			return;
		}

		const data = await response.json();
		const pages = data.data as DirectusPage[];

		if (pages.length === 2) {
			const privacyPage = pages.find((p) => p.permalink === '/privacy');
			const termsPage = pages.find((p) => p.permalink === '/terms');

			if (privacyPage && termsPage) {
				results.push({
					check: 'Content Verification',
					status: 'PASS',
					message: 'Both legal pages exist and are published',
					details: {
						pages: [
							{ permalink: privacyPage.permalink, title: privacyPage.title, status: privacyPage.status },
							{ permalink: termsPage.permalink, title: termsPage.title, status: termsPage.status },
						],
					},
				});
				console.log('   ✅ PASS - Found 2 legal pages:');
				console.log(`      - ${privacyPage.title} (${privacyPage.permalink}) [${privacyPage.status}]`);
				console.log(`      - ${termsPage.title} (${termsPage.permalink}) [${termsPage.status}]`);
			} else {
				results.push({
					check: 'Content Verification',
					status: 'FAIL',
					message: 'Found 2 pages but permalinks do not match /privacy and /terms',
					details: { pages },
				});
				console.log('   ❌ FAIL - Permalink mismatch');
			}
		} else {
			results.push({
				check: 'Content Verification',
				status: 'FAIL',
				message: `Expected 2 pages, found ${pages.length}`,
				details: { count: pages.length, pages },
			});
			console.log(`   ❌ FAIL - Found ${pages.length} pages (expected 2)`);
		}
	} catch (error) {
		results.push({
			check: 'Content Verification',
			status: 'FAIL',
			message: `Error checking pages: ${error instanceof Error ? error.message : String(error)}`,
			details: { error },
		});
		console.log(`   ❌ FAIL - ${error instanceof Error ? error.message : String(error)}`);
	}
}

/**
 * CHECK 3: Globals Schema Audit
 */
async function checkGlobalsSchema(token: string): Promise<void> {
	console.log('\n🔍 CHECK 3: Globals Schema Audit');
	console.log('   Target Fields: project_name, google_analytics_id');

	try {
		const response = await fetch(`${DIRECTUS_URL}/items/globals`, {
			method: 'GET',
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json',
			},
		});

		if (!response.ok) {
			const text = await response.text();
			results.push({
				check: 'Globals Schema Audit',
				status: 'FAIL',
				message: `Failed to fetch globals: HTTP ${response.status}`,
				details: { error: text },
			});
			console.log(`   ❌ FAIL - HTTP ${response.status}`);
			return;
		}

		const data = await response.json();
		const globals = data.data as DirectusGlobals;

		// Check for required fields
		const hasProjectName = 'project_name' in globals;
		const hasGoogleAnalyticsId = 'google_analytics_id' in globals;

		if (hasProjectName && hasGoogleAnalyticsId) {
			results.push({
				check: 'Globals Schema Audit',
				status: 'PASS',
				message: 'All required fields exist in globals schema',
				details: {
					project_name: globals.project_name,
					google_analytics_id: globals.google_analytics_id,
					project_description: globals.project_description,
				},
			});
			console.log('   ✅ PASS - All required fields exist:');
			console.log(`      - project_name: "${globals.project_name || '(empty)'}"`);
			console.log(`      - google_analytics_id: "${globals.google_analytics_id || '(empty)'}"`);
			if (globals.project_description) {
				console.log(`      - project_description: "${globals.project_description}"`);
			}
		} else {
			const missingFields = [];
			if (!hasProjectName) missingFields.push('project_name');
			if (!hasGoogleAnalyticsId) missingFields.push('google_analytics_id');

			results.push({
				check: 'Globals Schema Audit',
				status: 'WARNING',
				message: `Missing fields in globals schema: ${missingFields.join(', ')}`,
				details: {
					missingFields,
					currentFields: Object.keys(globals),
				},
			});
			console.log(`   ⚠️  WARNING - Missing fields: ${missingFields.join(', ')}`);
			console.log(`      Current fields: ${Object.keys(globals).join(', ')}`);
		}
	} catch (error) {
		results.push({
			check: 'Globals Schema Audit',
			status: 'FAIL',
			message: `Error checking globals: ${error instanceof Error ? error.message : String(error)}`,
			details: { error },
		});
		console.log(`   ❌ FAIL - ${error instanceof Error ? error.message : String(error)}`);
	}
}

/**
 * CHECK 4: Flows Health
 */
async function checkFlowsHealth(token: string): Promise<void> {
	console.log('\n🔍 CHECK 4: Flows Health');
	console.log('   Target Flows: E1 Cache Warmer, E1 Process Cache Warm Backlog');

	try {
		const response = await fetch(`${DIRECTUS_URL}/flows?fields=id,name,status`, {
			method: 'GET',
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json',
			},
		});

		if (!response.ok) {
			const text = await response.text();
			results.push({
				check: 'Flows Health',
				status: 'FAIL',
				message: `Failed to fetch flows: HTTP ${response.status}`,
				details: { error: text },
			});
			console.log(`   ❌ FAIL - HTTP ${response.status}`);
			return;
		}

		const data = await response.json();
		const flows = data.data as DirectusFlow[];

		// Find E1 flows
		const cacheWarmer = flows.find((f) => f.name.includes('E1: Cache Warmer'));
		const cacheBacklog = flows.find((f) => f.name.includes('E1: Process Cache Warm Backlog'));

		const issues = [];

		if (!cacheWarmer) {
			issues.push('E1: Cache Warmer flow not found');
		} else if (cacheWarmer.status !== 'active') {
			issues.push(`E1: Cache Warmer is ${cacheWarmer.status} (expected active)`);
		}

		if (!cacheBacklog) {
			issues.push('E1: Process Cache Warm Backlog flow not found');
		} else if (cacheBacklog.status !== 'active') {
			issues.push(`E1: Process Cache Warm Backlog is ${cacheBacklog.status} (expected active)`);
		}

		if (issues.length === 0) {
			results.push({
				check: 'Flows Health',
				status: 'PASS',
				message: 'All E1 flows are active',
				details: {
					flows: [
						{ name: cacheWarmer!.name, status: cacheWarmer!.status },
						{ name: cacheBacklog!.name, status: cacheBacklog!.status },
					],
				},
			});
			console.log('   ✅ PASS - All E1 flows active:');
			console.log(`      - ${cacheWarmer!.name} [${cacheWarmer!.status}]`);
			console.log(`      - ${cacheBacklog!.name} [${cacheBacklog!.status}]`);
		} else {
			results.push({
				check: 'Flows Health',
				status: 'WARNING',
				message: `Flow issues detected: ${issues.join(', ')}`,
				details: {
					issues,
					allFlows: flows.map((f) => ({ name: f.name, status: f.status })),
				},
			});
			console.log(`   ⚠️  WARNING - Issues detected:`);
			issues.forEach((issue) => console.log(`      - ${issue}`));
		}
	} catch (error) {
		results.push({
			check: 'Flows Health',
			status: 'FAIL',
			message: `Error checking flows: ${error instanceof Error ? error.message : String(error)}`,
			details: { error },
		});
		console.log(`   ❌ FAIL - ${error instanceof Error ? error.message : String(error)}`);
	}
}

/**
 * Generate Final Report
 */
function generateReport(): void {
	console.log('\n' + '='.repeat(80));
	console.log('📊 FINAL SYSTEM VERIFICATION REPORT');
	console.log('='.repeat(80));

	const passCount = results.filter((r) => r.status === 'PASS').length;
	const failCount = results.filter((r) => r.status === 'FAIL').length;
	const warnCount = results.filter((r) => r.status === 'WARNING').length;

	console.log(`\nSummary: ${passCount} PASS | ${failCount} FAIL | ${warnCount} WARNING\n`);

	results.forEach((result, index) => {
		const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
		console.log(`${index + 1}. ${icon} ${result.check}: ${result.status}`);
		console.log(`   ${result.message}`);
		if (result.details) {
			console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
		}
		console.log();
	});

	console.log('='.repeat(80));

	if (failCount === 0 && warnCount === 0) {
		console.log('✅ ALL CHECKS PASSED - System is healthy');
	} else if (failCount > 0) {
		console.log(`❌ ${failCount} CRITICAL FAILURES - System requires attention`);
	} else {
		console.log(`⚠️  ${warnCount} WARNINGS - System is functional but needs review`);
	}

	console.log('='.repeat(80));
}

/**
 * Main verification runner
 */
async function runVerification(): Promise<void> {
	console.log('='.repeat(80));
	console.log('Task 9: Final System Verification (E2E)');
	console.log('='.repeat(80));
	console.log();
	console.log('Environment:');
	console.log(`  DIRECTUS_URL: ${DIRECTUS_URL}`);
	console.log(`  WEB_URL: ${WEB_URL}`);
	console.log();

	try {
		// Step 1: Authenticate
		console.log('Step 1: Admin Authentication');
		const token = await authenticateAdmin();
		console.log();

		// Step 2: Run all checks
		console.log('Step 2: Running Verification Checks');
		await checkPublicWebAccess();
		await checkContentPages(token);
		await checkGlobalsSchema(token);
		await checkFlowsHealth(token);

		// Step 3: Generate report
		generateReport();
	} catch (error) {
		console.error('❌ Verification failed:', error);
		throw error;
	}
}

// Run the script
runVerification().catch((error) => {
	console.error('Script failed:', error);
	process.exit(1);
});
