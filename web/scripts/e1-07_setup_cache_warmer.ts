/**
 * Task 7: Cache Warmer Flow Setup (Directus SDK)
 *
 * Creates/updates two flows:
 * 1) E1: Cache Warmer (Dispatch) - event trigger on pages publish/update
 * 2) E1: Cache Warmer (Warm URL) - operation trigger, executed per site item
 *
 * Usage:
 *   DIRECTUS_URL="..." \
 *   DIRECTUS_ADMIN_EMAIL="..." \
 *   DIRECTUS_ADMIN_PASSWORD="..." \
 *   npx tsx web/scripts/e1-07_setup_cache_warmer.ts
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

type FlowRecord = {
	id: string;
	name: string;
	operation?: string | null;
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

type DirectusClient = RestClient<Record<string, unknown>> & {
	login: (email: string, password: string, options?: { mode?: AuthenticationMode }) => Promise<unknown>;
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

const FLOW_NAMES = {
	dispatch: 'E1: Cache Warmer (Dispatch)',
	worker: 'E1: Cache Warmer (Warm URL)',
};

// Adjust if your site payload nests the domain/permalink differently.
const REQUEST_URL_TEMPLATE = 'https://{{site_item.domain}}{{site_item.permalink}}';

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
			fields: ['id', 'name', 'operation'],
		}),
	);
	return flows[0] ?? null;
}

async function upsertFlow(
	client: DirectusClient,
	payload: FlowPayload,
): Promise<FlowRecord> {
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

function buildWorkerOperations(): OperationTemplate[] {
	return [
		{
			key: 'site_item',
			name: 'Site Item',
			type: 'transform',
			position: { x: 20, y: 0 },
			options: {
				json: '{{$trigger}}',
			},
			resolve: 'warm_request',
		},
		{
			key: 'warm_request',
			name: 'Warm URL',
			type: 'request',
			position: { x: 40, y: 0 },
			options: {
				method: 'GET',
				url: REQUEST_URL_TEMPLATE,
				timeout: 30000,
			},
			reject: 'log_failure',
		},
		{
			key: 'log_failure',
			name: 'Log Warm Failure',
			type: 'log',
			position: { x: 60, y: 10 },
			options: {
				message: 'Warm failed for {{site_item.domain}}',
			},
		},
	];
}

function buildDispatchOperations(workerFlowId: string): OperationTemplate[] {
	return [
		{
			key: 'read_full_page',
			name: 'Read Full Page',
			type: 'item-read',
			position: { x: 20, y: 0 },
			options: {
				collection: 'pages',
				key: '{{$trigger.keys[0]}}',
				query: {
					fields: ['permalink', 'is_global', 'sites.sites_id.domain'],
				},
				permissions: '$trigger',
				emitEvents: false,
			},
			resolve: 'check_global',
		},
		{
			key: 'check_global',
			name: 'Check Global',
			type: 'condition',
			position: { x: 20, y: 18 },
			options: {
				filter: {
					read_full_page: {
						is_global: { _eq: true },
					},
				},
			},
			resolve: 'all_sites',
			reject: 'trigger_specific',
		},
		{
			key: 'all_sites',
			name: 'Read Active Sites',
			type: 'item-read',
			position: { x: 40, y: 18 },
			options: {
				collection: 'sites',
				query: {
					filter: { is_active: { _eq: true } },
					fields: ['domain'],
				},
				permissions: '$trigger',
				emitEvents: false,
			},
			resolve: 'trigger_global',
		},
		{
			key: 'trigger_global',
			name: 'Warm Global Sites',
			type: 'trigger',
			position: { x: 60, y: 18 },
			options: {
				flow: workerFlowId,
				payload: '{{all_sites}}',
				iterationMode: 'parallel',
			},
		},
		{
			key: 'trigger_specific',
			name: 'Warm Specific Sites',
			type: 'trigger',
			position: { x: 20, y: 36 },
			options: {
				flow: workerFlowId,
				payload: '{{read_full_page.sites}}',
				iterationMode: 'parallel',
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
	});

	await clearFlowOperations(client, workerFlow.id);
	await createFlowOperations(client, workerFlow.id, buildWorkerOperations(), 'site_item');

	const dispatchFlow = await upsertFlow(client, {
		name: FLOW_NAMES.dispatch,
		status: 'active',
		trigger: 'event',
		accountability: 'all',
		options: {
			type: 'action',
			scope: ['items.create', 'items.update'],
			collections: ['pages'],
			filter: { status: { _eq: 'published' } },
		},
	});

	await clearFlowOperations(client, dispatchFlow.id);
	await createFlowOperations(client, dispatchFlow.id, buildDispatchOperations(workerFlow.id), 'read_full_page');

	console.log('Cache warmer flows are configured:');
	console.log(`- ${FLOW_NAMES.dispatch}`);
	console.log(`- ${FLOW_NAMES.worker}`);
}

main().catch((error) => {
	console.error('Cache warmer flow setup failed:', error instanceof Error ? error.message : String(error));
	process.exit(1);
});
