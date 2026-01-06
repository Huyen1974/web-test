/**
 * Task 7.2 + Task 8: Maintenance Batch Flows (Directus SDK)
 *
 * Creates/updates:
 * - E1: Process Cache Warm Backlog (schedule)
 * - E1: Cleanup Expired Tech Requests (schedule)
 * - Helper flow for per-domain warm requests (operation trigger)
 *
 * Usage:
 *   DIRECTUS_URL="..." \
 *   DIRECTUS_ADMIN_EMAIL="..." \
 *   DIRECTUS_ADMIN_PASSWORD="..." \
 *   npx tsx web/scripts/e1-08_setup_maintenance_flows.ts
 */

import {
	authentication,
	createDirectus,
	createFlow,
	createOperation,
	deleteOperations,
	readFlows,
	readOperations,
	rest,
	updateFlow,
	updateOperation,
	type AuthenticationMode,
	type RestClient,
} from '@directus/sdk';
import { config } from 'dotenv';
import { resolve } from 'path';

type FlowRecord = {
	id: string;
	name: string;
	operation?: string | null;
	status?: string;
	trigger?: string;
};

type OperationRecord = {
	id: string;
	key: string;
};

type OperationTemplate = {
	key: string;
	name: string;
	type: string;
	position: { x: number; y: number };
	options?: Record<string, unknown>;
	resolve?: string;
	reject?: string;
};

type FlowPayload = {
	name: string;
	status: 'active' | 'inactive';
	trigger: string;
	accountability: string | null;
	options?: Record<string, unknown>;
	description?: string;
	color?: string;
	icon?: string;
};

type DirectusClient = RestClient<Record<string, unknown>> & {
	login: (email: string, password: string, options?: { mode?: AuthenticationMode }) => Promise<unknown>;
};

const FLOW_NAMES = {
	backlog: 'E1: Process Cache Warm Backlog',
	worker: 'E1: Cache Warm Backlog (Warm Domain)',
	cleanup: 'E1: Cleanup Expired Tech Requests',
};

const EXPECTED_BACKLOG_KEYS = ['read_backlog', 'backlog_meta', 'check_backlog', 'mark_processing', 'loop_domains', 'mark_processed'];
const EXPECTED_WORKER_KEYS = ['read_processing', 'loop_domains', 'warm_req', 'log_failure'];
const EXPECTED_CLEANUP_KEYS = ['delete_expired'];

config({ path: resolve(__dirname, '../.env') });

function normalizeUrl(url: string): string {
	return url.replace(/\/+$/, '');
}

function requireEnv(key: string): string {
	const value = process.env[key];
	if (!value) {
		throw new Error(`Missing required environment variable: ${key}`);
	}
	return value;
}

function getDirectusUrl(): string {
	const url = process.env.DIRECTUS_URL || process.env.NUXT_PUBLIC_DIRECTUS_URL;
	if (!url) {
		throw new Error('Missing DIRECTUS_URL (or NUXT_PUBLIC_DIRECTUS_URL)');
	}
	return normalizeUrl(url);
}

async function getFlowByName(client: DirectusClient, name: string): Promise<FlowRecord | null> {
	const flows = await client.request(
		readFlows({
			filter: { name: { _eq: name } },
			limit: 1,
			fields: ['id', 'name', 'operation', 'status', 'trigger'],
		}),
	);
	return flows[0] ?? null;
}

async function upsertFlow(client: DirectusClient, payload: FlowPayload): Promise<FlowRecord> {
	const existing = await getFlowByName(client, payload.name);
	if (existing) {
		const updated = await client.request(updateFlow(existing.id, payload));
		return { id: updated.id, name: updated.name, operation: updated.operation ?? null };
	}

	const created = await client.request(createFlow(payload));
	return { id: created.id, name: created.name, operation: created.operation ?? null };
}

async function clearFlowOperations(client: DirectusClient, flowId: string): Promise<void> {
	const operations = await client.request(
		readOperations({
			filter: { flow: { _eq: flowId } },
			fields: ['id', 'key'],
			limit: -1,
		}),
	);

	if (operations.length === 0) return;
	await client.request(deleteOperations(operations.map((op) => op.id)));
}

async function createFlowOperations(
	client: DirectusClient,
	flowId: string,
	templates: OperationTemplate[],
	firstKey: string,
): Promise<Record<string, OperationRecord>> {
	const created: Record<string, OperationRecord> = {};

	for (const template of templates) {
		const operation = await client.request(
			createOperation({
				flow: flowId,
				key: template.key,
				name: template.name,
				type: template.type,
				position_x: template.position.x,
				position_y: template.position.y,
				options: template.options ?? {},
			}),
		);

		created[template.key] = { id: operation.id, key: operation.key };
	}

	for (const template of templates) {
		if (!template.resolve && !template.reject) continue;

		await client.request(
			updateOperation(created[template.key].id, {
				resolve: template.resolve ? created[template.resolve].id : null,
				reject: template.reject ? created[template.reject].id : null,
			}),
		);
	}

	await client.request(updateFlow(flowId, { operation: created[firstKey].id }));

	return created;
}

async function verifyFlow(
	client: DirectusClient,
	name: string,
	expectedTrigger: string,
	expectedKeys: string[],
): Promise<void> {
	const flow = await getFlowByName(client, name);
	if (!flow) {
		throw new Error(`Flow not found after creation: ${name}`);
	}
	if (!flow.operation) {
		throw new Error(`Flow missing root operation: ${name}`);
	}
	if (flow.trigger && flow.trigger !== expectedTrigger) {
		throw new Error(`Flow trigger mismatch for ${name}: expected ${expectedTrigger}, got ${flow.trigger}`);
	}

	const operations = await client.request(
		readOperations({
			filter: { flow: { _eq: flow.id } },
			fields: ['id', 'key'],
			limit: -1,
		}),
	);
	const keys = new Set(operations.map((op) => op.key));
	const missing = expectedKeys.filter((key) => !keys.has(key));
	if (missing.length > 0) {
		throw new Error(`Flow ${name} missing operations: ${missing.join(', ')}`);
	}
}

function buildBacklogWorkerOperations(): OperationTemplate[] {
	return [
		{
			key: 'read_processing',
			name: 'Read Processing Backlog',
			type: 'item-read',
			position: { x: 20, y: 0 },
			options: {
				collection: 'tech_requests',
				query: {
					filter: {
						_and: [
							{ request_type: { _eq: 'cache_warm_backlog' } },
							{ status: { _eq: 'processing' } },
						],
					},
					limit: 1,
					fields: ['proposed_diff'],
				},
				permissions: '$full',
				emitEvents: false,
			},
			resolve: 'loop_domains',
		},
		{
			key: 'loop_domains',
			name: 'Loop Domains (Item)',
			type: 'transform',
			position: { x: 40, y: 0 },
			options: {
				json: {
					item: '{{$trigger}}',
				},
			},
			resolve: 'warm_req',
		},
		{
			key: 'warm_req',
			name: 'Warm Request',
			type: 'request',
			position: { x: 60, y: 0 },
			options: {
				method: 'GET',
				url: 'https://{{loop_domains.item}}/{{read_processing[0].proposed_diff.permalink}}',
				timeout: 30000,
			},
			reject: 'log_failure',
		},
		{
			key: 'log_failure',
			name: 'Log Warm Failure',
			type: 'log',
			position: { x: 80, y: 10 },
			options: {
				message: 'Warm failed for {{loop_domains.item}}',
			},
		},
	];
}

function buildBacklogOperations(workerFlowId: string): OperationTemplate[] {
	return [
		{
			key: 'read_backlog',
			name: 'Read Backlog',
			type: 'item-read',
			position: { x: 20, y: 0 },
			options: {
				collection: 'tech_requests',
				query: {
					filter: {
						_and: [
							{ request_type: { _eq: 'cache_warm_backlog' } },
							{ status: { _eq: 'pending' } },
						],
					},
					limit: 1,
					fields: ['id', 'proposed_diff'],
				},
				permissions: '$full',
				emitEvents: false,
			},
			resolve: 'backlog_meta',
		},
		{
			key: 'backlog_meta',
			name: 'Backlog Meta',
			type: 'transform',
			position: { x: 40, y: 0 },
			options: {
				json: {
					backlog_length: '{{read_backlog.length}}',
				},
			},
			resolve: 'check_backlog',
		},
		{
			key: 'check_backlog',
			name: 'Check Backlog',
			type: 'condition',
			position: { x: 60, y: 0 },
			options: {
				filter: {
					backlog_meta: {
						backlog_length: { _gt: 0 },
					},
				},
			},
			resolve: 'mark_processing',
		},
		{
			key: 'mark_processing',
			name: 'Mark Processing',
			type: 'item-update',
			position: { x: 80, y: 0 },
			options: {
				collection: 'tech_requests',
				key: '{{read_backlog[0].id}}',
				payload: {
					status: 'processing',
				},
				permissions: '$full',
				emitEvents: false,
			},
			resolve: 'loop_domains',
		},
		{
			key: 'loop_domains',
			name: 'Loop Domains',
			type: 'trigger',
			position: { x: 100, y: 0 },
			options: {
				flow: workerFlowId,
				payload: '{{read_backlog[0].proposed_diff.pending_domains}}',
				iterationMode: 'parallel',
			},
			resolve: 'mark_processed',
		},
		{
			key: 'mark_processed',
			name: 'Mark Processed',
			type: 'item-update',
			position: { x: 120, y: 0 },
			options: {
				collection: 'tech_requests',
				key: '{{read_backlog[0].id}}',
				payload: {
					status: 'processed',
				},
				permissions: '$full',
				emitEvents: false,
			},
		},
	];
}

function buildCleanupOperations(): OperationTemplate[] {
	return [
		{
			key: 'delete_expired',
			name: 'Delete Expired Requests',
			type: 'item-delete',
			position: { x: 20, y: 0 },
			options: {
				collection: 'tech_requests',
				query: {
					filter: {
						_and: [
							{ expires_at: { _lt: '$NOW' } },
							{
								status: {
									_in: ['processed', 'expired', 'failed_permanent', 'rejected'],
								},
							},
						],
					},
				},
				permissions: '$full',
				emitEvents: false,
			},
		},
	];
}

async function main() {
	const baseUrl = getDirectusUrl();
	const adminEmail = requireEnv('DIRECTUS_ADMIN_EMAIL');
	const adminPassword = requireEnv('DIRECTUS_ADMIN_PASSWORD');

	const client = createDirectus(baseUrl).with(authentication('json')).with(rest());
	await client.login(adminEmail, adminPassword, { mode: 'json' });

	const workerFlow = await upsertFlow(client, {
		name: FLOW_NAMES.worker,
		status: 'active',
		trigger: 'operation',
		accountability: 'all',
		description: 'Worker flow for cache warm backlog domains',
		icon: 'bolt',
		color: '#FF7A00',
	});
	await clearFlowOperations(client, workerFlow.id);
	await createFlowOperations(client, workerFlow.id, buildBacklogWorkerOperations(), 'read_processing');
	await verifyFlow(client, FLOW_NAMES.worker, 'operation', EXPECTED_WORKER_KEYS);

	const backlogFlow = await upsertFlow(client, {
		name: FLOW_NAMES.backlog,
		status: 'active',
		trigger: 'schedule',
		accountability: 'all',
		options: {
			cron: '*/30 * * * *',
		},
		description: 'Processes cache warm backlog entries',
		icon: 'schedule',
		color: '#6644FF',
	});
	await clearFlowOperations(client, backlogFlow.id);
	await createFlowOperations(client, backlogFlow.id, buildBacklogOperations(workerFlow.id), 'read_backlog');
	await verifyFlow(client, FLOW_NAMES.backlog, 'schedule', EXPECTED_BACKLOG_KEYS);

	const cleanupFlow = await upsertFlow(client, {
		name: FLOW_NAMES.cleanup,
		status: 'active',
		trigger: 'schedule',
		accountability: 'all',
		options: {
			cron: '0 2 * * *',
		},
		description: 'Deletes expired tech_requests records',
		icon: 'auto_delete',
		color: '#D7263D',
	});
	await clearFlowOperations(client, cleanupFlow.id);
	await createFlowOperations(client, cleanupFlow.id, buildCleanupOperations(), 'delete_expired');
	await verifyFlow(client, FLOW_NAMES.cleanup, 'schedule', EXPECTED_CLEANUP_KEYS);

	console.log('Maintenance flows configured:');
	console.log(`- ${FLOW_NAMES.backlog}`);
	console.log(`- ${FLOW_NAMES.worker}`);
	console.log(`- ${FLOW_NAMES.cleanup}`);
	process.exit(0);
}

main().catch((error) => {
	console.error('Maintenance flow setup failed:', error instanceof Error ? error.message : String(error));
	process.exit(1);
});
