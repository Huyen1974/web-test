/**
 * Agent Data Connection Verification Script
 *
 * This script verifies that the frontend can successfully connect to the
 * Agent Data RAG backend using the /info endpoint.
 *
 * Usage:
 *   npx tsx scripts/verify_agent_connection.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env file
config({ path: resolve(__dirname, '../.env') });

interface SystemInfo {
	status: string;
	backend: string;
	version?: string;
	/** Additional dynamic fields (use unknown for safety) */
	[key: string]: unknown;
}

async function verifyConnection(): Promise<void> {
	const baseUrl = process.env.NUXT_PUBLIC_AGENT_DATA_BASE_URL;
	const apiKey = process.env.AGENT_DATA_API_KEY;
	const enabled = process.env.NUXT_PUBLIC_AGENT_DATA_ENABLED === 'true';

	console.log('='.repeat(60));
	console.log('Agent Data Connection Verification');
	console.log('='.repeat(60));
	console.log();

	// Check configuration
	console.log('Configuration:');
	console.log(`  Base URL: ${baseUrl || '(not set)'}`);
	console.log(`  API Key: ${apiKey ? `${apiKey.substring(0, 8)}...` : '(not set)'}`);
	console.log(`  Enabled: ${enabled}`);
	console.log();

	if (!baseUrl) {
		console.error('❌ NUXT_PUBLIC_AGENT_DATA_BASE_URL is not set in .env');
		process.exit(1);
	}

	if (!apiKey) {
		console.warn('⚠️  AGENT_DATA_API_KEY is not set (may be optional)');
	}

	if (!enabled) {
		console.warn('⚠️  Agent Data is disabled (NUXT_PUBLIC_AGENT_DATA_ENABLED=false)');
	}

	// Test /info endpoint
	console.log('Testing connection...');
	console.log(`  Endpoint: ${baseUrl}/info`);
	console.log();

	try {
		const response = await fetch(`${baseUrl}/info`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				...(apiKey && { Authorization: `Bearer ${apiKey}` }),
			},
			signal: AbortSignal.timeout(60000), // 60 second timeout (for cold starts)
		});

		console.log(`Status: ${response.status} ${response.statusText}`);
		console.log();

		if (!response.ok) {
			console.error(`❌ Request failed with status ${response.status}`);

			if (response.status === 401) {
				console.error('   Reason: Unauthorized - Check API key');
			} else if (response.status === 403) {
				console.error('   Reason: Forbidden - Check IAM permissions');
			} else if (response.status === 404) {
				console.error('   Reason: Not Found - /info endpoint may not exist');
			}

			const text = await response.text();
			if (text) {
				console.error('   Response:', text.substring(0, 200));
			}

			process.exit(1);
		}

		// Parse response
		const data: SystemInfo = await response.json();

		console.log('✅ Connection successful!');
		console.log();
		console.log('System Info:');
		console.log(JSON.stringify(data, null, 2));
		console.log();

		// Verify expected fields
		if (data.status) {
			console.log(`✅ Status: ${data.status}`);
		}

		if (data.backend) {
			console.log(`✅ Backend: ${data.backend}`);
		}

		console.log();
		console.log('='.repeat(60));
		console.log('Verification completed successfully!');
		console.log('='.repeat(60));

	} catch (error) {
		console.error('❌ Connection failed:');

		if (error instanceof Error) {
			console.error(`   Error: ${error.message}`);

			if (error.name === 'AbortError') {
				console.error('   Reason: Request timeout (10s)');
			} else if (error.message.includes('fetch')) {
				console.error('   Reason: Network error - Check if service is running');
			}
		} else {
			console.error(`   Error: ${String(error)}`);
		}

		process.exit(1);
	}
}

// Run verification
verifyConnection().catch((error) => {
	console.error('Unexpected error:', error);
	process.exit(1);
});
