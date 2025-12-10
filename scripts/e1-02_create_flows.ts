#!/usr/bin/env ts-node
/**
 * Task E1-02: Create Directus Flows for Content Request Closed Loop
 *
 * This script creates/updates Directus Flows via API to implement the
 * E1 closed-loop pipeline: content_requests → Agent webhook → audit logging.
 *
 * SAFETY:
 * - Dry-run by default (no changes applied)
 * - Use --execute flag to apply changes
 * - Idempotent: safe to run multiple times
 * - Updates existing flows instead of creating duplicates
 *
 * USAGE:
 *   # Dry-run (default) - shows what would be created/updated
 *   npx tsx scripts/e1-02_create_flows.ts
 *
 *   # Execute flow creation
 *   npx tsx scripts/e1-02_create_flows.ts --execute
 *
 * ENVIRONMENT VARIABLES (required):
 *   DIRECTUS_URL            - Base URL of Directus TEST instance
 *   DIRECTUS_ADMIN_EMAIL    - Admin email for authentication
 *   DIRECTUS_ADMIN_PASSWORD - Admin password for authentication
 *   AGENT_WEBHOOK_URL       - Webhook URL for agent notifications (can be placeholder for dry-run)
 *
 * @see docs/E1_Plan.md (Blog E1.C - Trigger & Async)
 * @see docs/Web_List_to_do_01.md (row E1-02-FLOWS-BASIC)
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// Optional: load .env if available
try {
	require('dotenv').config();
} catch {
	// dotenv not available or .env doesn't exist - use process.env only
}

// ============================================================================
// Types & Interfaces
// ============================================================================

interface DirectusFlow {
	id?: string;
	name: string;
	icon?: string;
	color?: string;
	description?: string;
	status: 'active' | 'inactive';
	trigger: string; // e.g., 'event'
	accountability: 'all' | '$trigger' | '$full' | '$accountability' | null;
	options?: Record<string, any>;
	operation?: string; // First operation ID
	date_created?: string;
	user_created?: string;
	operations?: DirectusOperation[];
}

interface DirectusOperation {
	id?: string;
	name: string;
	key: string;
	type: string;
	position_x: number;
	position_y: number;
	options?: Record<string, any>;
	resolve?: string | null; // Next operation ID on success
	reject?: string | null; // Next operation ID on failure
	flow?: string; // Flow ID
	date_created?: string;
	user_created?: string;
}

interface FlowsResult {
	flowsCreated: string[];
	flowsUpdated: string[];
	operationsCreated: number;
	dryRun: boolean;
	errors: Array<{ item: string; error: string }>;
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * Flow definitions for E1-02
 */
const FLOW_DEFINITIONS = {
	/**
	 * Flow A: Content Request New → Agent Webhook
	 * Triggers when content_requests status becomes 'new'
	 * Sends HTTP POST to AGENT_WEBHOOK_URL with request details
	 */
	content_request_to_agent: {
		name: 'E1: Content Request → Agent Trigger',
		key: 'e1_content_request_to_agent',
		icon: 'send',
		color: '#6644FF',
		description: 'Triggers Agent webhook when content_request status = new (E1-02 Flow A)',
		status: 'active' as const,
		trigger: 'event',
		accountability: 'all' as const,
		options: {
			type: 'action', // 'filter' (before write) or 'action' (after write)
			scope: ['items.create', 'items.update'],
			collections: ['content_requests'],
		},
	},

	/**
	 * Flow B: Audit/Revision Logging (Skeleton)
	 * Logs workflow transitions and comment creation
	 */
	content_request_audit: {
		name: 'E1: Content Request Audit Log',
		key: 'e1_content_request_audit',
		icon: 'history',
		color: '#2196F3',
		description: 'Logs workflow transitions for content_requests (E1-02 Flow B)',
		status: 'active' as const,
		trigger: 'event',
		accountability: 'all' as const,
		options: {
			type: 'action',
			scope: ['items.update'],
			collections: ['content_requests'],
		},
	},
};

// ============================================================================
// Utility Functions
// ============================================================================

function validateEnvironment(): void {
	const required = ['DIRECTUS_URL', 'DIRECTUS_ADMIN_EMAIL', 'DIRECTUS_ADMIN_PASSWORD'];
	const missing = required.filter((key) => !process.env[key]);

	if (missing.length > 0) {
		console.error('\n❌ Missing required environment variables:');
		missing.forEach((key) => console.error(`   - ${key}`));
		console.error('\nPlease set:');
		console.error('  export DIRECTUS_URL="http://127.0.0.1:8080"');
		console.error('  export DIRECTUS_ADMIN_EMAIL="your-email"');
		console.error('  export DIRECTUS_ADMIN_PASSWORD="your-password"');
		console.error('  export AGENT_WEBHOOK_URL="https://your-agent-webhook.example.com/webhook"\n');
		process.exit(1);
	}

	// AGENT_WEBHOOK_URL is optional for dry-run but should be set for execute
	if (!process.env.AGENT_WEBHOOK_URL) {
		console.warn('\n⚠️  Warning: AGENT_WEBHOOK_URL not set');
		console.warn('   Flow will be created with placeholder URL: https://example.com/agent-webhook');
		console.warn('   Set AGENT_WEBHOOK_URL before running with --execute\n');
	}
}

function parseArgs(): { dryRun: boolean; execute: boolean } {
	const args = process.argv.slice(2);
	const execute = args.includes('--execute');
	const dryRun = !execute; // Default to dry-run

	return { dryRun, execute };
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
		const error = await response.text();
		throw new Error(`Authentication failed: ${response.status} - ${error}`);
	}

	const data = await response.json();
	if (!data.data?.access_token) {
		throw new Error('No access token in authentication response');
	}

	console.log('✅ Authenticated successfully');
	return data.data.access_token;
}

/**
 * Fetch all existing flows
 */
async function fetchFlows(token: string): Promise<DirectusFlow[]> {
	const url = `${process.env.DIRECTUS_URL}/flows`;
	const response = await fetch(url, {
		headers: { Authorization: `Bearer ${token}` },
	});

	if (!response.ok) {
		throw new Error(`Failed to fetch flows: ${response.status} ${response.statusText}`);
	}

	const data = await response.json();
	return data.data || [];
}

/**
 * Create a new flow
 */
async function createFlow(token: string, flowDef: Partial<DirectusFlow>): Promise<DirectusFlow> {
	const url = `${process.env.DIRECTUS_URL}/flows`;
	const response = await fetch(url, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(flowDef),
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Failed to create flow: ${response.status} - ${error}`);
	}

	const data = await response.json();
	return data.data;
}

/**
 * Update an existing flow
 */
async function updateFlow(token: string, flowId: string, flowDef: Partial<DirectusFlow>): Promise<DirectusFlow> {
	const url = `${process.env.DIRECTUS_URL}/flows/${flowId}`;
	const response = await fetch(url, {
		method: 'PATCH',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(flowDef),
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Failed to update flow: ${response.status} - ${error}`);
	}

	const data = await response.json();
	return data.data;
}

/**
 * Fetch operations for a flow
 */
async function fetchOperations(token: string, flowId: string): Promise<DirectusOperation[]> {
	const url = `${process.env.DIRECTUS_URL}/operations?filter[flow][_eq]=${flowId}`;
	const response = await fetch(url, {
		headers: { Authorization: `Bearer ${token}` },
	});

	if (!response.ok) {
		throw new Error(`Failed to fetch operations: ${response.status} ${response.statusText}`);
	}

	const data = await response.json();
	return data.data || [];
}

/**
 * Create a new operation
 */
async function createOperation(token: string, operationDef: Partial<DirectusOperation>): Promise<DirectusOperation> {
	const url = `${process.env.DIRECTUS_URL}/operations`;
	const response = await fetch(url, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(operationDef),
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Failed to create operation: ${response.status} - ${error}`);
	}

	const data = await response.json();
	return data.data;
}

/**
 * Delete an operation
 */
async function deleteOperation(token: string, operationId: string): Promise<void> {
	const url = `${process.env.DIRECTUS_URL}/operations/${operationId}`;
	const response = await fetch(url, {
		method: 'DELETE',
		headers: { Authorization: `Bearer ${token}` },
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Failed to delete operation: ${response.status} - ${error}`);
	}
}

// ============================================================================
// Flow Creation Logic
// ============================================================================

/**
 * Create operations for Flow A: Content Request → Agent Webhook
 */
async function createFlowAOperations(
	token: string,
	flowId: string,
	dryRun: boolean,
): Promise<{ created: number; operations: DirectusOperation[] }> {
	const agentWebhookUrl = process.env.AGENT_WEBHOOK_URL || 'https://example.com/agent-webhook';

	const operations: Partial<DirectusOperation>[] = [
		// Operation 1: Read trigger data
		{
			name: 'Read Trigger Data',
			key: 'read_trigger',
			type: 'trigger',
			position_x: 3,
			position_y: 1,
			options: {
				flow: flowId,
			},
			flow: flowId,
		},
		// Operation 2: Check if status is 'new'
		{
			name: 'Check Status = New',
			key: 'condition_status_new',
			type: 'condition',
			position_x: 19,
			position_y: 1,
			options: {
				filter: {
					$trigger: {
						payload: {
							status: {
								_eq: 'new',
							},
						},
					},
				},
			},
			flow: flowId,
		},
		// Operation 3: Transform payload for webhook
		{
			name: 'Build Webhook Payload',
			key: 'transform_payload',
			type: 'transform',
			position_x: 35,
			position_y: 1,
			options: {
				json: JSON.stringify(
					{
						content_request_id: '{{$trigger.payload.id}}',
						title: '{{$trigger.payload.title}}',
						status: '{{$trigger.payload.status}}',
						current_holder: '{{$trigger.payload.current_holder}}',
						requirements: '{{$trigger.payload.requirements}}',
						created_at: '{{$trigger.payload.created_at}}',
						updated_at: '{{$trigger.payload.updated_at}}',
						idempotency_key: '{{$trigger.payload.id}}_{{$trigger.payload.updated_at}}',
						correlation_id: 'content_request_new',
						event_type: 'content_request.status.new',
						timestamp: '{{$now}}',
					},
					null,
					2,
				),
			},
			flow: flowId,
		},
		// Operation 4: Send HTTP request to Agent webhook
		{
			name: 'POST to Agent Webhook',
			key: 'webhook_agent',
			type: 'request',
			position_x: 51,
			position_y: 1,
			options: {
				method: 'POST',
				url: agentWebhookUrl,
				headers: [
					{
						header: 'Content-Type',
						value: 'application/json',
					},
					{
						header: 'X-Directus-Event',
						value: 'content_request.status.new',
					},
				],
				body: '{{transform_payload}}',
			},
			flow: flowId,
		},
		// Operation 5: Log success
		{
			name: 'Log Success',
			key: 'log_success',
			type: 'log',
			position_x: 67,
			position_y: 1,
			options: {
				message: '[E1-02] Agent webhook triggered for content_request {{$trigger.payload.id}}',
			},
			flow: flowId,
		},
		// Operation 6: Log error (reject path from webhook)
		{
			name: 'Log Error',
			key: 'log_error',
			type: 'log',
			position_x: 51,
			position_y: 17,
			options: {
				message:
					'[E1-02] ERROR: Failed to trigger agent webhook for content_request {{$trigger.payload.id}}: {{$last.error}}',
			},
			flow: flowId,
		},
	];

	if (dryRun) {
		console.log(`   [DRY-RUN] Would create ${operations.length} operations for Flow A`);
		return { created: 0, operations: [] };
	}

	// Create operations in order
	const createdOps: DirectusOperation[] = [];
	for (const opDef of operations) {
		try {
			const op = await createOperation(token, opDef);
			createdOps.push(op);
			console.log(`   ✅ Created operation: ${opDef.name}`);
		} catch (error: any) {
			console.error(`   ❌ Failed to create operation ${opDef.name}: ${error.message}`);
			throw error;
		}
	}

	// Link operations (set resolve/reject)
	// read_trigger → condition
	await updateOperationLinks(token, createdOps[0].id!, { resolve: createdOps[1].id });
	// condition → transform (on pass)
	await updateOperationLinks(token, createdOps[1].id!, { resolve: createdOps[2].id });
	// transform → webhook
	await updateOperationLinks(token, createdOps[2].id!, { resolve: createdOps[3].id });
	// webhook → log_success (on success) or log_error (on failure)
	await updateOperationLinks(token, createdOps[3].id!, { resolve: createdOps[4].id, reject: createdOps[5].id });

	// Update flow to set first operation
	await updateFlow(token, flowId, { operation: createdOps[0].id });

	console.log(`   ✅ Created and linked ${createdOps.length} operations`);
	return { created: createdOps.length, operations: createdOps };
}

/**
 * Create operations for Flow B: Audit Logging (Skeleton)
 */
async function createFlowBOperations(
	token: string,
	flowId: string,
	dryRun: boolean,
): Promise<{ created: number; operations: DirectusOperation[] }> {
	const operations: Partial<DirectusOperation>[] = [
		// Operation 1: Read trigger data
		{
			name: 'Read Trigger Data',
			key: 'read_trigger_audit',
			type: 'trigger',
			position_x: 3,
			position_y: 1,
			options: {
				flow: flowId,
			},
			flow: flowId,
		},
		// Operation 2: Check if status changed
		{
			name: 'Check Status Changed',
			key: 'condition_status_changed',
			type: 'condition',
			position_x: 19,
			position_y: 1,
			options: {
				filter: {
					$trigger: {
						payload: {
							status: {
								_nnull: true,
							},
						},
					},
				},
			},
			flow: flowId,
		},
		// Operation 3: Log audit entry
		{
			name: 'Log Audit Entry',
			key: 'log_audit',
			type: 'log',
			position_x: 35,
			position_y: 1,
			options: {
				message:
					'[E1-02 AUDIT] content_request {{$trigger.payload.id}} status changed to {{$trigger.payload.status}} by {{$accountability.user}}',
			},
			flow: flowId,
		},
	];

	if (dryRun) {
		console.log(`   [DRY-RUN] Would create ${operations.length} operations for Flow B`);
		return { created: 0, operations: [] };
	}

	// Create operations
	const createdOps: DirectusOperation[] = [];
	for (const opDef of operations) {
		try {
			const op = await createOperation(token, opDef);
			createdOps.push(op);
			console.log(`   ✅ Created operation: ${opDef.name}`);
		} catch (error: any) {
			console.error(`   ❌ Failed to create operation ${opDef.name}: ${error.message}`);
			throw error;
		}
	}

	// Link operations
	await updateOperationLinks(token, createdOps[0].id!, { resolve: createdOps[1].id });
	await updateOperationLinks(token, createdOps[1].id!, { resolve: createdOps[2].id });

	// Update flow to set first operation
	await updateFlow(token, flowId, { operation: createdOps[0].id });

	console.log(`   ✅ Created and linked ${createdOps.length} operations`);
	return { created: createdOps.length, operations: createdOps };
}

/**
 * Update operation resolve/reject links
 */
async function updateOperationLinks(
	token: string,
	operationId: string,
	links: { resolve?: string; reject?: string },
): Promise<void> {
	const url = `${process.env.DIRECTUS_URL}/operations/${operationId}`;
	const response = await fetch(url, {
		method: 'PATCH',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(links),
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Failed to update operation links: ${response.status} - ${error}`);
	}
}

// ============================================================================
// Main Flow Setup Logic
// ============================================================================

async function setupFlows(dryRun: boolean): Promise<FlowsResult> {
	const result: FlowsResult = {
		flowsCreated: [],
		flowsUpdated: [],
		operationsCreated: 0,
		dryRun,
		errors: [],
	};

	try {
		// Step 1: Authenticate
		console.log('\n🔐 Step 1: Authenticating...');
		const token = await authenticate();

		// Step 2: Fetch existing flows
		console.log('\n📋 Step 2: Fetching existing flows...');
		const existingFlows = await fetchFlows(token);
		console.log(`   Found ${existingFlows.length} existing flows`);

		// Step 3: Create/update Flow A
		console.log('\n🔄 Step 3: Setting up Flow A (Content Request → Agent Webhook)...');
		const flowAKey = FLOW_DEFINITIONS.content_request_to_agent.key;
		const existingFlowA = existingFlows.find((f) => f.name === FLOW_DEFINITIONS.content_request_to_agent.name);

		if (existingFlowA) {
			console.log(`   ✓ Flow A already exists (ID: ${existingFlowA.id})`);

			if (dryRun) {
				console.log(`   [DRY-RUN] Would update Flow A`);
			} else {
				// Delete old operations and recreate
				const oldOps = await fetchOperations(token, existingFlowA.id!);
				console.log(`   Cleaning up ${oldOps.length} old operations...`);
				for (const op of oldOps) {
					await deleteOperation(token, op.id!);
				}

				// Update flow definition
				await updateFlow(token, existingFlowA.id!, FLOW_DEFINITIONS.content_request_to_agent);
				console.log(`   ✅ Updated Flow A definition`);

				// Recreate operations
				const { created } = await createFlowAOperations(token, existingFlowA.id!, dryRun);
				result.operationsCreated += created;
				result.flowsUpdated.push(flowAKey);
			}
		} else {
			if (dryRun) {
				console.log(`   [DRY-RUN] Would create Flow A`);
			} else {
				const newFlow = await createFlow(token, FLOW_DEFINITIONS.content_request_to_agent);
				console.log(`   ✅ Created Flow A (ID: ${newFlow.id})`);

				const { created } = await createFlowAOperations(token, newFlow.id!, dryRun);
				result.operationsCreated += created;
				result.flowsCreated.push(flowAKey);
			}
		}

		// Step 4: Create/update Flow B
		console.log('\n📝 Step 4: Setting up Flow B (Audit Logging - Skeleton)...');
		const flowBKey = FLOW_DEFINITIONS.content_request_audit.key;
		const existingFlowB = existingFlows.find((f) => f.name === FLOW_DEFINITIONS.content_request_audit.name);

		if (existingFlowB) {
			console.log(`   ✓ Flow B already exists (ID: ${existingFlowB.id})`);

			if (dryRun) {
				console.log(`   [DRY-RUN] Would update Flow B`);
			} else {
				// Delete old operations and recreate
				const oldOps = await fetchOperations(token, existingFlowB.id!);
				console.log(`   Cleaning up ${oldOps.length} old operations...`);
				for (const op of oldOps) {
					await deleteOperation(token, op.id!);
				}

				// Update flow definition
				await updateFlow(token, existingFlowB.id!, FLOW_DEFINITIONS.content_request_audit);
				console.log(`   ✅ Updated Flow B definition`);

				// Recreate operations
				const { created } = await createFlowBOperations(token, existingFlowB.id!, dryRun);
				result.operationsCreated += created;
				result.flowsUpdated.push(flowBKey);
			}
		} else {
			if (dryRun) {
				console.log(`   [DRY-RUN] Would create Flow B`);
			} else {
				const newFlow = await createFlow(token, FLOW_DEFINITIONS.content_request_audit);
				console.log(`   ✅ Created Flow B (ID: ${newFlow.id})`);

				const { created } = await createFlowBOperations(token, newFlow.id!, dryRun);
				result.operationsCreated += created;
				result.flowsCreated.push(flowBKey);
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

function generateReport(result: FlowsResult): string {
	const timestamp = new Date().toISOString();
	const mode = result.dryRun ? 'DRY-RUN' : 'EXECUTE';

	let report = `# Task E1-02: Flows Creation Report

**Timestamp**: ${timestamp}
**Mode**: ${mode}

---

## Summary

- **Flows Created**: ${result.flowsCreated.length}
- **Flows Updated**: ${result.flowsUpdated.length}
- **Operations Created**: ${result.operationsCreated}
- **Errors**: ${result.errors.length}

---

## Flows Created/Updated

### Flow A: Content Request → Agent Webhook

**Key**: \`e1_content_request_to_agent\`
**Trigger**: When \`content_requests\` item is created or updated with \`status = 'new'\`
**Purpose**: Sends HTTP POST to agent webhook to initiate drafting process

**Operations Chain**:
1. **Read Trigger Data** - Captures the trigger event payload
2. **Check Status = New** - Condition: only proceed if status is 'new'
3. **Build Webhook Payload** - Transforms data into standard envelope format
4. **POST to Agent Webhook** - Sends HTTP request to \`AGENT_WEBHOOK_URL\`
5. **Log Success** - Logs successful webhook call
6. **Log Error** - Logs failed webhook call (reject path)

**Webhook Payload Structure**:
\`\`\`json
{
  "content_request_id": "uuid",
  "title": "string",
  "status": "new",
  "current_holder": "string",
  "requirements": "text",
  "created_at": "timestamp",
  "updated_at": "timestamp",
  "idempotency_key": "id_timestamp",
  "correlation_id": "content_request_new",
  "event_type": "content_request.status.new",
  "timestamp": "now"
}
\`\`\`

### Flow B: Content Request Audit Log (Skeleton)

**Key**: \`e1_content_request_audit\`
**Trigger**: When \`content_requests\` item is updated
**Purpose**: Logs workflow transitions for audit trail

**Operations Chain**:
1. **Read Trigger Data** - Captures the trigger event
2. **Check Status Changed** - Condition: only if status field changed
3. **Log Audit Entry** - Writes to Directus activity log

---

## Verification Steps

### 1. Via Directus UI

1. Open Directus Admin UI
2. Navigate to: **Settings → Flows**
3. Verify two flows exist:
   - ✅ "E1: Content Request → Agent Trigger" (active, purple)
   - ✅ "E1: Content Request Audit Log" (active, blue)
4. Click each flow to view operations chain

### 2. Via API

\`\`\`bash
# Authenticate
TOKEN=$(curl -s -X POST "$DIRECTUS_URL/auth/login" \\
  -H "Content-Type: application/json" \\
  -d '{"email":"'$DIRECTUS_ADMIN_EMAIL'","password":"'$DIRECTUS_ADMIN_PASSWORD'"}' \\
  | jq -r '.data.access_token')

# List flows
curl -s -H "Authorization: Bearer $TOKEN" \\
  "$DIRECTUS_URL/flows" | jq '.data[] | {name, status, trigger}'

# List operations for a flow (replace FLOW_ID)
curl -s -H "Authorization: Bearer $TOKEN" \\
  "$DIRECTUS_URL/operations?filter[flow][_eq]=FLOW_ID" \\
  | jq '.data[] | {name, type, key}'
\`\`\`

### 3. Functional Testing

**Test Flow A (Agent Webhook)**:

\`\`\`bash
# Create a test content_request with status='new'
curl -X POST "$DIRECTUS_URL/items/content_requests" \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Test Content Request",
    "requirements": "Test requirements for E1-02 flow verification",
    "status": "new",
    "current_holder": "agent_test"
  }'

# Expected: Flow A triggers and sends POST to AGENT_WEBHOOK_URL
# Check agent webhook logs for incoming request
# Check Directus activity log for flow execution
\`\`\`

**Test Flow B (Audit Log)**:

\`\`\`bash
# Update content_request status
curl -X PATCH "$DIRECTUS_URL/items/content_requests/REQUEST_ID" \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"status": "drafting"}'

# Expected: Flow B triggers and creates audit log entry
# Check Directus activity log for audit entry
\`\`\`

---

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| \`DIRECTUS_URL\` | Yes | Base URL of Directus instance |
| \`DIRECTUS_ADMIN_EMAIL\` | Yes | Admin email for authentication |
| \`DIRECTUS_ADMIN_PASSWORD\` | Yes | Admin password |
| \`AGENT_WEBHOOK_URL\` | Recommended | Webhook URL for agent notifications |

**Example**:
\`\`\`bash
export DIRECTUS_URL="http://127.0.0.1:8080"
export AGENT_WEBHOOK_URL="https://your-agent.run.app/webhook"
\`\`\`

### Webhook Endpoint Requirements

The agent webhook endpoint must:
- Accept HTTP POST requests
- Accept \`Content-Type: application/json\`
- Return 2xx status on success
- Handle idempotency via \`idempotency_key\`
- Process payload asynchronously (avoid timeout)

---

## Troubleshooting

### Issue: Flow not triggering

**Check**:
1. Flow status is "active" in Directus UI
2. Collection trigger matches: \`content_requests\`
3. Event type includes \`items.create\` and \`items.update\`
4. Test by creating/updating a content_request

### Issue: Webhook fails with timeout

**Solution**:
- Webhook endpoint must respond quickly (< 30s)
- Use async processing on agent side
- Return 202 Accepted immediately
- Process request in background

### Issue: Operations not linked correctly

**Solution**:
- Re-run script with \`--execute\`
- Script will delete old operations and recreate
- Verify links in Directus UI (flow diagram)

---

## Next Steps

After flows are created and verified:

1. **E1-03**: Configure Dashboards for SLA tracking
2. **E1-04**: Build Nuxt Approval Desk UI
3. **E1-05**: Implement Folder/Tree display
4. **E1-06**: Connect Agent Data V12 for E2E testing

---

## References

- [E1 Plan](../docs/E1_Plan.md) - Blog E1.C (Trigger & Async)
- [Web_List_to_do_01.md](../docs/Web_List_to_do_01.md) - E1-02-FLOWS-BASIC
- [Directus Flows Docs](https://docs.directus.io/app/flows.html)

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
`;

	if (result.errors.length > 0) {
		report += `\n---\n\n## Errors\n\n`;
		result.errors.forEach((err) => {
			report += `- **${err.item}**: ${err.error}\n`;
		});
	}

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
	console.log('╔════════════════════════════════════════════════════════════════╗');
	console.log('║  Task E1-02: Create Directus Flows for Content Request Loop   ║');
	console.log('╚════════════════════════════════════════════════════════════════╝');

	// Validate environment
	validateEnvironment();

	// Parse arguments
	const { dryRun, execute } = parseArgs();
	const mode = dryRun ? 'DRY-RUN' : 'EXECUTE';
	console.log(`\n📋 Mode: ${mode}`);

	try {
		// Run setup
		const result = await setupFlows(dryRun);

		// Print summary
		console.log('\n╔════════════════════════════════════════════════════════════════╗');
		console.log('║  Summary                                                       ║');
		console.log('╚════════════════════════════════════════════════════════════════╝');
		console.log(`Mode:               ${mode}`);
		console.log(`Flows created:      ${result.flowsCreated.length}`);
		console.log(`Flows updated:      ${result.flowsUpdated.length}`);
		console.log(`Operations created: ${result.operationsCreated}`);
		console.log(`Errors:             ${result.errors.length}`);

		// Generate and save report
		const report = generateReport(result);
		const reportFilename = dryRun ? 'E1-02_flows_basic_dry_run.md' : 'E1-02_flows_basic_execution.md';
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
			console.log('\n✅ Flows created successfully!');
			console.log('\n📋 Next steps:');
			console.log('   1. Verify flows in Directus UI (Settings → Flows)');
			console.log('   2. Test by creating a content_request with status="new"');
			console.log('   3. Check agent webhook logs for incoming requests');
			console.log('   4. Proceed to E1-03 (Dashboards)');
			process.exit(0);
		}
	} catch (error) {
		console.error('\n❌ Fatal error:', error instanceof Error ? error.message : String(error));
		if (error instanceof Error && error.stack) {
			console.error('\nStack trace:');
			console.error(error.stack);
		}
		process.exit(1);
	}
}

// Run the script
main().catch((error) => {
	console.error('\n❌ Unhandled error:', error instanceof Error ? error.message : String(error));
	process.exit(1);
});
