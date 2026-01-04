/**
 * Directus Flows Setup & Schema Patch Script
 *
 * Purpose: Configure Directus automation layer and patch missing schema fields
 * Reference: E1 Plan + Task 7 and Task 0 Item D6
 *
 * Tasks:
 * 1. Patch directus_users schema (add managed_site field)
 * 2. Create Flow FL1: Cache Warmer (multi-site async)
 * 3. Create Flow FL3: Sync Agent Data (scheduled)
 *
 * Usage:
 *   DIRECTUS_URL="..." DIRECTUS_ADMIN_EMAIL="..." DIRECTUS_ADMIN_PASSWORD="..." npx tsx scripts/setup_flows.ts
 */

import { writeFileSync } from 'fs';
import { resolve } from 'path';

const API_URL = process.env.DIRECTUS_URL || "https://directus-test-812872501910.asia-southeast1.run.app";
const OUTPUT_FILE = resolve(__dirname, '../../reports/SETUP_FLOWS_REPORT.md');

interface SetupResults {
	timestamp: string;
	apiUrl: string;
	authentication: {
		success: boolean;
		error?: string;
	};
	schemaPatch: {
		managed_site: {
			success: boolean;
			exists?: boolean;
			created?: boolean;
			error?: string;
		};
	};
	flows: {
		fl1_cache_warmer: {
			success: boolean;
			flowId?: string;
			error?: string;
		};
		fl3_sync_agent_data: {
			success: boolean;
			flowId?: string;
			error?: string;
		};
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

async function patchManagedSiteField(token: string): Promise<{ success: boolean; exists?: boolean; created?: boolean; error?: string }> {
	try {
		console.log('\n📝 Patching Schema: directus_users.managed_site...');

		// Check if field already exists
		const checkRes = await fetch(`${API_URL}/fields/directus_users/managed_site`, {
			headers: { Authorization: `Bearer ${token}` }
		});

		if (checkRes.ok) {
			console.log('   ℹ️  Field managed_site already exists');
			return { success: true, exists: true };
		}

		// Create the field
		console.log('   Creating Many-to-One relationship to sites...');
		const createRes = await fetch(`${API_URL}/fields/directus_users`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				field: 'managed_site',
				type: 'uuid',
				meta: {
					interface: 'select-dropdown-m2o',
					special: ['m2o'],
					options: {
						template: '{{code}} - {{domain}}'
					},
					display: 'related-values',
					display_options: {
						template: '{{code}}'
					},
					note: 'Site managed by this user (for Site Manager role)'
				},
				schema: {
					foreign_key_table: 'sites',
					foreign_key_column: 'id'
				}
			})
		});

		if (!createRes.ok) {
			const text = await createRes.text();
			console.error(`   ❌ Failed to create field: ${createRes.status} - ${text}`);
			return { success: false, error: `HTTP ${createRes.status}: ${text}` };
		}

		console.log('   ✅ Field managed_site created successfully');
		return { success: true, created: true };

	} catch (error) {
		const errorMsg = error instanceof Error ? error.message : String(error);
		console.error('   ❌ Schema patch error:', errorMsg);
		return { success: false, error: errorMsg };
	}
}

async function createCacheWarmerFlow(token: string): Promise<{ success: boolean; flowId?: string; error?: string }> {
	try {
		console.log('\n🚀 Creating Flow: FL1 - Cache Warmer...');

		// Check if flow already exists
		const checkRes = await fetch(`${API_URL}/flows?filter[name][_eq]=Cache Warmer`, {
			headers: { Authorization: `Bearer ${token}` }
		});

		if (checkRes.ok) {
			const checkData = await checkRes.json();
			if (checkData.data && checkData.data.length > 0) {
				console.log(`   ℹ️  Flow already exists: ${checkData.data[0].id}`);
				return { success: true, flowId: checkData.data[0].id };
			}
		}

		// Create the flow
		const flowPayload = {
			name: 'Cache Warmer',
			icon: 'bolt',
			color: '#6644FF',
			description: 'Automatically warm cache for all related domains when pages are published',
			status: 'active',
			trigger: 'event',
			accountability: 'all',
			options: {
				type: 'action',
				scope: ['items.create', 'items.update'],
				collections: ['pages']
			}
		};

		const createFlowRes = await fetch(`${API_URL}/flows`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(flowPayload)
		});

		if (!createFlowRes.ok) {
			const text = await createFlowRes.text();
			console.error(`   ❌ Failed to create flow: ${createFlowRes.status} - ${text}`);
			return { success: false, error: `HTTP ${createFlowRes.status}: ${text}` };
		}

		const flowData = await createFlowRes.json();
		const flowId = flowData.data.id;
		console.log(`   ✅ Flow created: ${flowId}`);

		// Create operations for the flow
		console.log('   Creating operations...');

		// Operation 1: Read Full Page
		const op1 = await fetch(`${API_URL}/operations`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				flow: flowId,
				name: 'Read Full Page',
				key: 'read_full_page',
				type: 'item-read',
				position_x: 19,
				position_y: 1,
				options: {
					collection: 'pages',
					key: '{{$trigger.keys[0]}}'
				}
			})
		});

		if (!op1.ok) {
			console.error(`   ⚠️  Failed to create operation 1: ${await op1.text()}`);
		} else {
			console.log('   ✅ Operation 1: Read Full Page');
		}

		// Operation 2: Condition - Check if published
		const op1Data = await op1.json();
		const op2 = await fetch(`${API_URL}/operations`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				flow: flowId,
				name: 'Check Published Status',
				key: 'check_published',
				type: 'condition',
				position_x: 19,
				position_y: 19,
				resolve: op1Data.data.id,
				options: {
					filter: {
						_and: [
							{
								read_full_page: {
									status: {
										_eq: 'published'
									}
								}
							}
						]
					}
				}
			})
		});

		if (!op2.ok) {
			console.error(`   ⚠️  Failed to create operation 2: ${await op2.text()}`);
		} else {
			console.log('   ✅ Operation 2: Check Published Status');
		}

		// Operation 3: Request URL (simplified for E1 - single domain warm)
		const op2Data = await op2.json();
		const op3 = await fetch(`${API_URL}/operations`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				flow: flowId,
				name: 'Warm Cache',
				key: 'warm_request',
				type: 'request',
				position_x: 37,
				position_y: 19,
				resolve: op2Data.data.id,
				options: {
					method: 'GET',
					url: '{{$env.WEB_URL}}/{{read_full_page.permalink}}',
					timeout: 30000
				}
			})
		});

		if (!op3.ok) {
			console.error(`   ⚠️  Failed to create operation 3: ${await op3.text()}`);
		} else {
			console.log('   ✅ Operation 3: Warm Cache');
		}

		console.log(`   ✅ Flow FL1 setup complete: ${flowId}`);
		return { success: true, flowId };

	} catch (error) {
		const errorMsg = error instanceof Error ? error.message : String(error);
		console.error('   ❌ Cache Warmer flow error:', errorMsg);
		return { success: false, error: errorMsg };
	}
}

async function createSyncAgentDataFlow(token: string): Promise<{ success: boolean; flowId?: string; error?: string }> {
	try {
		console.log('\n🔄 Creating Flow: FL3 - Sync Agent Data...');

		// Check if flow already exists
		const checkRes = await fetch(`${API_URL}/flows?filter[name][_eq]=Sync Agent Data`, {
			headers: { Authorization: `Bearer ${token}` }
		});

		if (checkRes.ok) {
			const checkData = await checkRes.json();
			if (checkData.data && checkData.data.length > 0) {
				console.log(`   ℹ️  Flow already exists: ${checkData.data[0].id}`);
				return { success: true, flowId: checkData.data[0].id };
			}
		}

		// Create the flow
		const flowPayload = {
			name: 'Sync Agent Data',
			icon: 'sync',
			color: '#00C897',
			description: 'Scheduled sync with Agent Data backend (every 5 minutes)',
			status: 'active',
			trigger: 'schedule',
			accountability: 'all',
			options: {
				cron: '*/5 * * * *'
			}
		};

		const createFlowRes = await fetch(`${API_URL}/flows`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(flowPayload)
		});

		if (!createFlowRes.ok) {
			const text = await createFlowRes.text();
			console.error(`   ❌ Failed to create flow: ${createFlowRes.status} - ${text}`);
			return { success: false, error: `HTTP ${createFlowRes.status}: ${text}` };
		}

		const flowData = await createFlowRes.json();
		const flowId = flowData.data.id;
		console.log(`   ✅ Flow created: ${flowId}`);

		// Create operation: Request URL
		console.log('   Creating operation...');

		const op1 = await fetch(`${API_URL}/operations`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				flow: flowId,
				name: 'Fetch Agent Info',
				key: 'fetch_data',
				type: 'request',
				position_x: 19,
				position_y: 1,
				options: {
					method: 'GET',
					url: '{{$env.AGENT_DATA_URL}}/info',
					headers: [
						{
							header: 'Authorization',
							value: 'Bearer {{$env.AGENT_DATA_API_KEY}}'
						}
					],
					timeout: 60000
				}
			})
		});

		if (!op1.ok) {
			console.error(`   ⚠️  Failed to create operation: ${await op1.text()}`);
		} else {
			console.log('   ✅ Operation: Fetch Agent Info');
		}

		console.log(`   ✅ Flow FL3 setup complete: ${flowId}`);
		return { success: true, flowId };

	} catch (error) {
		const errorMsg = error instanceof Error ? error.message : String(error);
		console.error('   ❌ Sync Agent Data flow error:', errorMsg);
		return { success: false, error: errorMsg };
	}
}

async function main() {
	console.log('='.repeat(70));
	console.log('DIRECTUS FLOWS SETUP & SCHEMA PATCH');
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
		schemaPatch: {
			managed_site: {
				success: false
			}
		},
		flows: {
			fl1_cache_warmer: {
				success: false
			},
			fl3_sync_agent_data: {
				success: false
			}
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

	// Step 2: Patch Schema (D6)
	const schemaPatch = await patchManagedSiteField(token);
	results.schemaPatch.managed_site = schemaPatch;

	// Step 3: Create Flow FL1 (Cache Warmer)
	const fl1 = await createCacheWarmerFlow(token);
	results.flows.fl1_cache_warmer = fl1;

	// Step 4: Create Flow FL3 (Sync Agent Data)
	const fl3 = await createSyncAgentDataFlow(token);
	results.flows.fl3_sync_agent_data = fl3;

	// Summary
	console.log('\n' + '='.repeat(70));
	console.log('📊 SUMMARY');
	console.log('='.repeat(70));
	console.log(`Authentication: ${results.authentication.success ? '✅ SUCCESS' : '❌ FAILED'}`);
	console.log(`Schema Patch (D6): ${results.schemaPatch.managed_site.success ? '✅ SUCCESS' : '❌ FAILED'}`);
	console.log(`Flow FL1 (Cache Warmer): ${results.flows.fl1_cache_warmer.success ? '✅ SUCCESS' : '❌ FAILED'}`);
	console.log(`Flow FL3 (Sync Agent Data): ${results.flows.fl3_sync_agent_data.success ? '✅ SUCCESS' : '❌ FAILED'}`);
	console.log('='.repeat(70));

	return results;
}

main().then((results) => {
	// Generate report
	const report = `# SETUP FLOWS REPORT

**Date:** ${new Date().toISOString().split('T')[0]}
**Target:** ${API_URL}
**Timestamp:** ${results.timestamp}

---

## EXECUTIVE SUMMARY

**Status:** ${results.authentication.success && results.schemaPatch.managed_site.success && results.flows.fl1_cache_warmer.success && results.flows.fl3_sync_agent_data.success ? '✅ SUCCESS' : '⚠️  PARTIAL SUCCESS'}

---

## 1. AUTHENTICATION

**Result:** ${results.authentication.success ? '✅ SUCCESS' : '❌ FAILED'}
${results.authentication.error ? `**Error:** ${results.authentication.error}` : ''}

---

## 2. SCHEMA PATCH (Task 0 - Item D6)

### D6: managed_site Field

**Result:** ${results.schemaPatch.managed_site.success ? '✅ SUCCESS' : '❌ FAILED'}
${results.schemaPatch.managed_site.exists ? '**Status:** Field already exists (no action needed)' : ''}
${results.schemaPatch.managed_site.created ? '**Status:** Field created successfully' : ''}
${results.schemaPatch.managed_site.error ? `**Error:** ${results.schemaPatch.managed_site.error}` : ''}

**Details:**
- Collection: \`directus_users\`
- Field: \`managed_site\`
- Type: Many-to-One → \`sites\`
- Purpose: Enable Site Manager role filtering

---

## 3. FLOWS CONFIGURATION (Task 7)

### FL1: Cache Warmer

**Result:** ${results.flows.fl1_cache_warmer.success ? '✅ SUCCESS' : '❌ FAILED'}
${results.flows.fl1_cache_warmer.flowId ? `**Flow ID:** ${results.flows.fl1_cache_warmer.flowId}` : ''}
${results.flows.fl1_cache_warmer.error ? `**Error:** ${results.flows.fl1_cache_warmer.error}` : ''}

**Configuration:**
- **Trigger:** Event Hook (Action) on \`pages\`
- **Scope:** \`items.create\`, \`items.update\`
- **Filter:** \`status == "published"\`
- **Operations:**
  1. Read Full Page
  2. Check Published Status
  3. Warm Cache (GET {{$env.WEB_URL}}/{{permalink}})

**Note:** Simplified version for E1. Multi-site loop deferred to E2.

---

### FL3: Sync Agent Data

**Result:** ${results.flows.fl3_sync_agent_data.success ? '✅ SUCCESS' : '❌ FAILED'}
${results.flows.fl3_sync_agent_data.flowId ? `**Flow ID:** ${results.flows.fl3_sync_agent_data.flowId}` : ''}
${results.flows.fl3_sync_agent_data.error ? `**Error:** ${results.flows.fl3_sync_agent_data.error}` : ''}

**Configuration:**
- **Trigger:** Schedule (cron: \`*/5 * * * *\`)
- **Operations:**
  1. Fetch Agent Info (GET {{$env.AGENT_DATA_URL}}/info)

**Purpose:** Periodic health check and sync with Agent Data backend.

---

## 4. VERIFICATION CHECKLIST

- [${results.authentication.success ? 'x' : ' '}] Authentication successful
- [${results.schemaPatch.managed_site.success ? 'x' : ' '}] Field \`managed_site\` exists in \`directus_users\`
- [${results.flows.fl1_cache_warmer.success ? 'x' : ' '}] Flow FL1 (Cache Warmer) created
- [${results.flows.fl3_sync_agent_data.success ? 'x' : ' '}] Flow FL3 (Sync Agent Data) created

---

## 5. NEXT STEPS

${results.authentication.success && results.schemaPatch.managed_site.success && results.flows.fl1_cache_warmer.success && results.flows.fl3_sync_agent_data.success ? `
✅ **All tasks completed successfully!**

**Recommended Actions:**
1. Verify ENV variables are set correctly:
   - \`WEB_URL\`
   - \`AGENT_DATA_URL\`
   - \`AGENT_DATA_API_KEY\`
   - \`FLOWS_ENV_ALLOW_LIST\`
2. Test FL1 by publishing a page in Directus
3. Monitor FL3 execution logs (every 5 minutes)
4. Proceed with remaining E1 tasks
` : `
⚠️  **Some tasks failed. Review errors above.**

**Required Actions:**
1. Fix authentication if failed
2. Manually create failed schema fields via Directus UI
3. Manually create failed flows via Directus UI
4. Re-run this script if needed
`}

---

**Report Generated:** ${new Date().toISOString()}
`;

	console.log(`\n💾 Saving report to: ${OUTPUT_FILE}`);
	writeFileSync(OUTPUT_FILE, report);
	console.log('✅ Report saved successfully\n');

	process.exit(results.authentication.success && results.schemaPatch.managed_site.success && results.flows.fl1_cache_warmer.success && results.flows.fl3_sync_agent_data.success ? 0 : 1);
}).catch((error) => {
	console.error('\n💥 FATAL ERROR:', error);
	process.exit(1);
});
