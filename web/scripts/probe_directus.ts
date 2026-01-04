/**
 * Directus Diagnostic Probe Script
 *
 * Purpose: Verify the current state of the Directus instance to determine
 * if the database is truly empty or if previous diagnostic attempts were flawed.
 *
 * Usage:
 *   DIRECTUS_ADMIN_EMAIL=admin@example.com DIRECTUS_ADMIN_PASSWORD=password npx tsx scripts/probe_directus.ts
 *   OR
 *   DIRECTUS_ADMIN_TOKEN=xxx npx tsx scripts/probe_directus.ts
 */

import { writeFileSync } from 'fs';
import { resolve } from 'path';

const API_URL = process.env.DIRECTUS_URL || "https://directus-test-812872501910.asia-southeast1.run.app";
const OUTPUT_FILE = resolve(__dirname, '../../reports/probe_output.json');

interface ProbeResults {
	timestamp: string;
	apiUrl: string;
	connectivity: {
		health: any;
		status: number;
		error?: string;
	};
	authentication: {
		success: boolean;
		token?: string;
		error?: string;
	};
	collections: {
		raw: any;
		count: number;
		nonSystemCollections: string[];
		error?: string;
	};
	users: {
		raw: any;
		count: number;
		emails: string[];
		error?: string;
	};
}

async function checkHealth(): Promise<{ status: number; data: any; error?: string }> {
	try {
		console.log('🏥 Checking server health...');
		const res = await fetch(`${API_URL}/server/health`);
		const data = await res.json();
		console.log(`   Status: ${res.status}`);
		console.log(`   Response:`, data);
		return { status: res.status, data };
	} catch (error) {
		const errorMsg = error instanceof Error ? error.message : String(error);
		console.error('   ❌ Health check failed:', errorMsg);
		return { status: 0, data: null, error: errorMsg };
	}
}

async function authenticate(): Promise<{ success: boolean; token?: string; error?: string }> {
	try {
		console.log('\n🔐 Authenticating...');

		// Check if token is provided
		const envToken = process.env.DIRECTUS_ADMIN_TOKEN;
		if (envToken) {
			console.log('   Using token from DIRECTUS_ADMIN_TOKEN');
			return { success: true, token: envToken };
		}

		// Try email/password authentication
		const email = process.env.DIRECTUS_ADMIN_EMAIL || process.env.ADMIN_EMAIL;
		const password = process.env.DIRECTUS_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;

		if (!email || !password) {
			const errorMsg = 'Missing credentials. Provide DIRECTUS_ADMIN_TOKEN or DIRECTUS_ADMIN_EMAIL + DIRECTUS_ADMIN_PASSWORD';
			console.error(`   ❌ ${errorMsg}`);
			return { success: false, error: errorMsg };
		}

		console.log(`   Logging in with email: ${email}`);
		const res = await fetch(`${API_URL}/auth/login`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email, password })
		});

		if (!res.ok) {
			const text = await res.text();
			const errorMsg = `Login failed: ${res.status} - ${text}`;
			console.error(`   ❌ ${errorMsg}`);
			return { success: false, error: errorMsg };
		}

		const data = await res.json();
		const token = data.data.access_token;
		console.log('   ✅ Authentication successful');
		return { success: true, token };

	} catch (error) {
		const errorMsg = error instanceof Error ? error.message : String(error);
		console.error('   ❌ Authentication error:', errorMsg);
		return { success: false, error: errorMsg };
	}
}

async function getCollections(token: string): Promise<{ raw: any; count: number; nonSystemCollections: string[]; error?: string }> {
	try {
		console.log('\n📚 Fetching collections...');
		const res = await fetch(`${API_URL}/collections`, {
			headers: { Authorization: `Bearer ${token}` }
		});

		const data = await res.json();

		if (!res.ok) {
			const errorMsg = `Failed to fetch collections: ${res.status}`;
			console.error(`   ❌ ${errorMsg}`);
			return { raw: data, count: 0, nonSystemCollections: [], error: errorMsg };
		}

		if (!data.data || !Array.isArray(data.data)) {
			console.warn('   ⚠️  No collections data found');
			return { raw: data, count: 0, nonSystemCollections: [] };
		}

		// Filter out system collections (those starting with directus_)
		const allCollections = data.data.map((c: any) => c.collection);
		const nonSystemCollections = allCollections.filter((name: string) => !name.startsWith('directus_'));

		console.log(`   Total collections: ${allCollections.length}`);
		console.log(`   Non-system collections: ${nonSystemCollections.length}`);

		if (nonSystemCollections.length > 0) {
			console.log('   Collections found:');
			nonSystemCollections.forEach((name: string) => {
				console.log(`     - ${name}`);
			});
		} else {
			console.log('   ⚠️  NO non-system collections found');
		}

		return {
			raw: data,
			count: nonSystemCollections.length,
			nonSystemCollections
		};

	} catch (error) {
		const errorMsg = error instanceof Error ? error.message : String(error);
		console.error('   ❌ Collections fetch error:', errorMsg);
		return { raw: null, count: 0, nonSystemCollections: [], error: errorMsg };
	}
}

async function getUsers(token: string): Promise<{ raw: any; count: number; emails: string[]; error?: string }> {
	try {
		console.log('\n👥 Fetching users...');
		const res = await fetch(`${API_URL}/users?limit=-1`, {
			headers: { Authorization: `Bearer ${token}` }
		});

		const data = await res.json();

		if (!res.ok) {
			const errorMsg = `Failed to fetch users: ${res.status}`;
			console.error(`   ❌ ${errorMsg}`);
			return { raw: data, count: 0, emails: [], error: errorMsg };
		}

		if (!data.data || !Array.isArray(data.data)) {
			console.warn('   ⚠️  No users data found');
			return { raw: data, count: 0, emails: [] };
		}

		const emails = data.data.map((u: any) => u.email).filter(Boolean);

		console.log(`   Total users: ${data.data.length}`);

		if (emails.length > 0) {
			console.log('   User emails:');
			emails.forEach((email: string) => {
				console.log(`     - ${email}`);
			});
		} else {
			console.log('   ⚠️  NO users found');
		}

		return {
			raw: data,
			count: data.data.length,
			emails
		};

	} catch (error) {
		const errorMsg = error instanceof Error ? error.message : String(error);
		console.error('   ❌ Users fetch error:', errorMsg);
		return { raw: null, count: 0, emails: [], error: errorMsg };
	}
}

async function main() {
	console.log('='.repeat(70));
	console.log('DIRECTUS DIAGNOSTIC PROBE');
	console.log('='.repeat(70));
	console.log(`Target: ${API_URL}`);
	console.log(`Time: ${new Date().toISOString()}`);
	console.log('='.repeat(70));

	const results: ProbeResults = {
		timestamp: new Date().toISOString(),
		apiUrl: API_URL,
		connectivity: {
			health: null,
			status: 0
		},
		authentication: {
			success: false
		},
		collections: {
			raw: null,
			count: 0,
			nonSystemCollections: []
		},
		users: {
			raw: null,
			count: 0,
			emails: []
		}
	};

	// Step 1: Check health
	const healthCheck = await checkHealth();
	results.connectivity = healthCheck;

	// Step 2: Authenticate
	const auth = await authenticate();
	results.authentication = auth;

	if (!auth.success || !auth.token) {
		console.log('\n❌ Cannot proceed without authentication');
		console.log('\n💾 Saving results to:', OUTPUT_FILE);
		writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
		process.exit(1);
	}

	// Step 3: Get collections
	const collections = await getCollections(auth.token);
	results.collections = collections;

	// Step 4: Get users
	const users = await getUsers(auth.token);
	results.users = users;

	// Save results
	console.log('\n' + '='.repeat(70));
	console.log('💾 SAVING RESULTS');
	console.log('='.repeat(70));
	console.log(`Output file: ${OUTPUT_FILE}`);
	writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
	console.log('✅ Results saved successfully');

	// Summary
	console.log('\n' + '='.repeat(70));
	console.log('📊 SUMMARY');
	console.log('='.repeat(70));
	console.log(`Health Status: ${healthCheck.status === 200 ? '✅ OK' : '❌ FAILED'}`);
	console.log(`Authentication: ${auth.success ? '✅ SUCCESS' : '❌ FAILED'}`);
	console.log(`Collections Found: ${collections.count}`);
	console.log(`Users Found: ${users.count}`);
	console.log('\n🔍 VERDICT:');

	if (collections.count === 0) {
		console.log('❌ DATABASE APPEARS TO BE EMPTY (No non-system collections)');
	} else {
		console.log(`✅ DATABASE CONTAINS DATA (${collections.count} collections found)`);
	}

	console.log('='.repeat(70));
}

main().catch((error) => {
	console.error('\n💥 FATAL ERROR:', error);
	process.exit(1);
});
