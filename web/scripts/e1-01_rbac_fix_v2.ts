/**
 * RBAC Fix Script v2 - Directus v10+ Policy Linkage
 *
 * Fixes orphaned permissions by linking Agent Role -> Policy -> Permissions.
 *
 * Usage:
 *   DIRECTUS_URL="..." \
 *   DIRECTUS_ADMIN_EMAIL="..." \
 *   DIRECTUS_ADMIN_PASSWORD="..." \
 *   DIRECTUS_AGENT_EMAIL="agent@example.com" \
 *   DIRECTUS_AGENT_PASSWORD="..." \
 *   npx tsx web/scripts/e1-01_rbac_fix_v2.ts
 */

type PermissionAction = 'create' | 'read' | 'update';

type JsonObject = Record<string, unknown>;

interface DirectusResponse<T> {
	data: T;
}

interface DirectusAuthResponse {
	data: {
		access_token?: string;
	};
}

interface DirectusRole {
	id: string;
	name: string;
	policies?: string[];
}

interface DirectusPolicy {
	id: string;
	name: string;
}

interface DirectusAccessRecord {
	id: string;
	role: string;
	policy: string;
}

interface DirectusPermission {
	id: number | string;
	collection: string;
	action: string;
	policy: string;
	role?: null;
	permissions?: JsonObject | null;
	validation?: JsonObject | null;
	presets?: JsonObject | null;
	fields?: string[] | string;
}

interface PermissionSpec {
	collection: string;
	action: PermissionAction;
	fields: string[] | string;
	permissions: JsonObject | null;
	validation: JsonObject | null;
	presets: JsonObject | null;
}

class HttpError extends Error {
	status: number;
	body: string;

	constructor(status: number, body: string) {
		super(`HTTP ${status}: ${body}`);
		this.status = status;
		this.body = body;
	}
}

const AGENT_ROLE_NAMES = ['Agent', 'Agent Bot'];
const POLICY_NAME = 'Agent Content Policy';
const COLLECTION_NAME = 'content_requests';
const DEFAULT_TIMEOUT_MS = 30000;

const PERMISSIONS: PermissionSpec[] = [
	{
		collection: COLLECTION_NAME,
		action: 'create',
		fields: ['*'],
		permissions: null,
		validation: null,
		presets: null,
	},
	{
		collection: COLLECTION_NAME,
		action: 'read',
		fields: ['*'],
		permissions: null,
		validation: null,
		presets: null,
	},
	{
		collection: COLLECTION_NAME,
		action: 'update',
		fields: ['*'],
		permissions: null,
		validation: null,
		presets: null,
	},
];

function normalizeBaseUrl(url: string): string {
	return url.replace(/\/+$/, '');
}

function requireEnv(key: string): string {
	const value = process.env[key];
	if (!value) {
		console.error(`Missing required environment variable: ${key}`);
		process.exit(1);
	}
	return value;
}

function getBaseUrl(): string {
	const url = process.env.DIRECTUS_URL || process.env.NUXT_PUBLIC_DIRECTUS_URL;
	if (!url) {
		console.error('Missing required environment variable: DIRECTUS_URL');
		process.exit(1);
	}
	return normalizeBaseUrl(url);
}

async function fetchJson<T>(url: string, options: RequestInit = {}): Promise<T> {
	const response = await fetch(url, { ...options, signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS) });
	const text = await response.text();
	if (!response.ok) {
		throw new HttpError(response.status, text || response.statusText);
	}
	if (!text.trim()) {
		return {} as T;
	}
	try {
		return JSON.parse(text) as T;
	} catch (error) {
		throw new Error(`Invalid JSON response from ${url}: ${text}`);
	}
}

async function authenticate(baseUrl: string, email: string, password: string): Promise<string> {
	const url = `${baseUrl}/auth/login`;
	const data = await fetchJson<DirectusAuthResponse>(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ email, password }),
	});

	const token = data?.data?.access_token;
	if (!token) {
		throw new Error('Authentication response missing access_token');
	}
	return token;
}

async function fetchRoles(baseUrl: string, token: string): Promise<DirectusRole[]> {
	const params = new URLSearchParams({ limit: '-1', fields: 'id,name,policies' });
	const url = `${baseUrl}/roles?${params.toString()}`;
	const data = await fetchJson<DirectusResponse<DirectusRole[]>>(url, {
		headers: { Authorization: `Bearer ${token}` },
	});
	return data.data ?? [];
}

function findAgentRole(roles: DirectusRole[]): DirectusRole {
	for (const name of AGENT_ROLE_NAMES) {
		const match = roles.find((role) => role.name.toLowerCase() === name.toLowerCase());
		if (match) {
			return match;
		}
	}
	throw new Error(`Agent role not found (expected one of: ${AGENT_ROLE_NAMES.join(', ')})`);
}

async function fetchPolicyByName(baseUrl: string, token: string, name: string): Promise<DirectusPolicy | undefined> {
	const params = new URLSearchParams({
		limit: '1',
		fields: 'id,name',
		'filter[name][_eq]': name,
	});
	const url = `${baseUrl}/policies?${params.toString()}`;
	const data = await fetchJson<DirectusResponse<DirectusPolicy[]>>(url, {
		headers: { Authorization: `Bearer ${token}` },
	});
	return data.data?.[0];
}

async function createPolicy(baseUrl: string, token: string, name: string): Promise<DirectusPolicy> {
	const url = `${baseUrl}/policies`;
	const payload = {
		name,
		icon: 'smart_toy',
		description: 'Agent policy for content_requests (CRU only)',
		admin_access: false,
		app_access: true,
	};
	const data = await fetchJson<DirectusResponse<DirectusPolicy>>(url, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(payload),
	});
	return data.data;
}

async function getOrCreatePolicy(baseUrl: string, token: string, name: string): Promise<DirectusPolicy> {
	const existing = await fetchPolicyByName(baseUrl, token, name);
	if (existing) {
		return existing;
	}
	return createPolicy(baseUrl, token, name);
}

async function ensureAccessLink(
	baseUrl: string,
	token: string,
	endpoint: string,
	roleId: string,
	policyId: string,
): Promise<boolean> {
	const params = new URLSearchParams({
		limit: '1',
		fields: 'id,role,policy',
		'filter[role][_eq]': roleId,
		'filter[policy][_eq]': policyId,
	});
	const listUrl = `${baseUrl}${endpoint}?${params.toString()}`;

	try {
		const data = await fetchJson<DirectusResponse<DirectusAccessRecord[]>>(listUrl, {
			headers: { Authorization: `Bearer ${token}` },
		});
		if (data.data?.length) {
			console.log('  Access link already exists.');
			return true;
		}
	} catch (error) {
		if (error instanceof HttpError && (error.status === 403 || error.status === 404)) {
			return false;
		}
		throw error;
	}

	const createUrl = `${baseUrl}${endpoint}`;
	try {
		await fetchJson<DirectusResponse<DirectusAccessRecord>>(createUrl, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ role: roleId, policy: policyId }),
		});
		console.log('  Access link created.');
		return true;
	} catch (error) {
		if (error instanceof HttpError && (error.status === 403 || error.status === 404)) {
			return false;
		}
		throw error;
	}
}

async function fetchRoleById(baseUrl: string, token: string, roleId: string): Promise<DirectusRole> {
	const params = new URLSearchParams({ fields: 'id,name,policies' });
	const url = `${baseUrl}/roles/${encodeURIComponent(roleId)}?${params.toString()}`;
	const data = await fetchJson<DirectusResponse<DirectusRole>>(url, {
		headers: { Authorization: `Bearer ${token}` },
	});
	return data.data;
}

async function ensureRolePolicyLink(
	baseUrl: string,
	token: string,
	roleId: string,
	policyId: string,
): Promise<void> {
	const role = await fetchRoleById(baseUrl, token, roleId);
	const policies = new Set(role.policies ?? []);
	if (policies.has(policyId)) {
		console.log('  Role already linked to policy via policies array.');
		return;
	}
	policies.add(policyId);

	const url = `${baseUrl}/roles/${encodeURIComponent(roleId)}`;
	await fetchJson<DirectusResponse<DirectusRole>>(url, {
		method: 'PATCH',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ policies: Array.from(policies) }),
	});
	console.log('  Role policies updated.');
}

async function linkPolicyToRole(baseUrl: string, token: string, roleId: string, policyId: string): Promise<void> {
	console.log('Step B: Linking policy to role...');
	const accessEndpoints = ['/access', '/items/directus_access'];
	for (const endpoint of accessEndpoints) {
		const linked = await ensureAccessLink(baseUrl, token, endpoint, roleId, policyId);
		if (linked) {
			return;
		}
	}

	console.log('  Access endpoint unavailable; falling back to role.policies update.');
	await ensureRolePolicyLink(baseUrl, token, roleId, policyId);
}

async function fetchPermission(
	baseUrl: string,
	token: string,
	policyId: string,
	collection: string,
	action: string,
): Promise<DirectusPermission | undefined> {
	const params = new URLSearchParams({
		limit: '1',
		fields: 'id,collection,action,policy',
		'filter[policy][_eq]': policyId,
		'filter[collection][_eq]': collection,
		'filter[action][_eq]': action,
	});
	const url = `${baseUrl}/permissions?${params.toString()}`;
	const data = await fetchJson<DirectusResponse<DirectusPermission[]>>(url, {
		headers: { Authorization: `Bearer ${token}` },
	});
	return data.data?.[0];
}

async function upsertPermission(
	baseUrl: string,
	token: string,
	policyId: string,
	spec: PermissionSpec,
): Promise<'created' | 'updated'> {
	const existing = await fetchPermission(baseUrl, token, policyId, spec.collection, spec.action);
	if (existing) {
		const url = `${baseUrl}/permissions/${encodeURIComponent(String(existing.id))}`;
		await fetchJson<DirectusResponse<DirectusPermission>>(url, {
			method: 'PATCH',
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				fields: spec.fields,
				permissions: spec.permissions,
				validation: spec.validation,
				presets: spec.presets,
			}),
		});
		return 'updated';
	}

	const url = `${baseUrl}/permissions`;
	await fetchJson<DirectusResponse<DirectusPermission>>(url, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			policy: policyId,
			collection: spec.collection,
			action: spec.action,
			fields: spec.fields,
			permissions: spec.permissions,
			validation: spec.validation,
			presets: spec.presets,
			role: null,
		}),
	});
	return 'created';
}

async function removeDeletePermission(baseUrl: string, token: string, policyId: string, collection: string): Promise<void> {
	const params = new URLSearchParams({
		limit: '-1',
		fields: 'id,collection,action,policy',
		'filter[policy][_eq]': policyId,
		'filter[collection][_eq]': collection,
		'filter[action][_eq]': 'delete',
	});
	const url = `${baseUrl}/permissions?${params.toString()}`;
	const data = await fetchJson<DirectusResponse<DirectusPermission[]>>(url, {
		headers: { Authorization: `Bearer ${token}` },
	});

	const deletions = data.data ?? [];
	if (!deletions.length) {
		return;
	}

	console.log(`  Removing ${deletions.length} delete permission(s) for ${collection}...`);
	for (const perm of deletions) {
		const deleteUrl = `${baseUrl}/permissions/${encodeURIComponent(String(perm.id))}`;
		await fetchJson<DirectusResponse<DirectusPermission>>(deleteUrl, {
			method: 'DELETE',
			headers: { Authorization: `Bearer ${token}` },
		});
	}
}

async function verifyAgentCreate(
	baseUrl: string,
	agentToken: string,
	adminToken: string,
	agentEmail: string,
): Promise<void> {
	console.log('Step D: Self-check Agent CREATE...');
	const payload = {
		title: 'RBAC Fix V2 Test Request',
		status: 'new',
		current_holder: agentEmail,
	};

	const response = await fetch(`${baseUrl}/items/${COLLECTION_NAME}`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${agentToken}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(payload),
	});

	const text = await response.text();
	if (response.status === 403) {
		throw new Error(`Agent CREATE forbidden (403): ${text}`);
	}
	if (!response.ok) {
		throw new Error(`Agent CREATE failed (${response.status}): ${text}`);
	}

	let createdId: string | number | undefined;
	if (text.trim()) {
		try {
			const parsed = JSON.parse(text) as DirectusResponse<{ id: string | number }>;
			createdId = parsed?.data?.id;
		} catch (error) {
			throw new Error('Agent CREATE response was not valid JSON');
		}
	}

	if (!createdId) {
		throw new Error('Agent CREATE succeeded but no item id returned');
	}

	console.log(`  Agent CREATE succeeded (item ${createdId}).`);

	const cleanupResponse = await fetch(`${baseUrl}/items/${COLLECTION_NAME}/${createdId}`, {
		method: 'DELETE',
		headers: { Authorization: `Bearer ${adminToken}` },
	});

	if (!cleanupResponse.ok) {
		const cleanupText = await cleanupResponse.text();
		console.warn(`  Cleanup failed (${cleanupResponse.status}): ${cleanupText}`);
	} else {
		console.log('  Cleanup succeeded.');
	}
}

async function main(): Promise<void> {
	const baseUrl = getBaseUrl();
	const adminEmail = requireEnv('DIRECTUS_ADMIN_EMAIL');
	const adminPassword = requireEnv('DIRECTUS_ADMIN_PASSWORD');
	const agentEmail = process.env.DIRECTUS_AGENT_EMAIL || process.env.AGENT_EMAIL || 'agent@example.com';
	const agentPassword = process.env.DIRECTUS_AGENT_PASSWORD || process.env.AGENT_PASSWORD;

	if (!agentPassword) {
		console.error('Missing required environment variable: DIRECTUS_AGENT_PASSWORD');
		process.exit(1);
	}

	console.log('RBAC Fix v2: Directus v10+ policy-role linkage');
	console.log('Step A: Authenticating as admin...');
	const adminToken = await authenticate(baseUrl, adminEmail, adminPassword);
	console.log('  Admin authenticated.');

	console.log('Step A: Fetching Agent role...');
	const roles = await fetchRoles(baseUrl, adminToken);
	const agentRole = findAgentRole(roles);
	console.log(`  Using role: ${agentRole.name} (${agentRole.id})`);

	console.log('Step A: Get or create policy...');
	const policy = await getOrCreatePolicy(baseUrl, adminToken, POLICY_NAME);
	console.log(`  Using policy: ${policy.name} (${policy.id})`);

	await linkPolicyToRole(baseUrl, adminToken, agentRole.id, policy.id);

	console.log('Step C: Upserting CRU permissions...');
	let created = 0;
	let updated = 0;
	for (const spec of PERMISSIONS) {
		const result = await upsertPermission(baseUrl, adminToken, policy.id, spec);
		if (result === 'created') {
			created += 1;
		} else {
			updated += 1;
		}
		console.log(`  ${spec.action} permission ${result}.`);
	}

	await removeDeletePermission(baseUrl, adminToken, policy.id, COLLECTION_NAME);
	console.log(`Permissions applied. Created: ${created}, Updated: ${updated}.`);

	console.log('Step D: Authenticating as agent...');
	const agentToken = await authenticate(baseUrl, agentEmail, agentPassword);
	await verifyAgentCreate(baseUrl, agentToken, adminToken, agentEmail);

	console.log('RBAC Fix v2 complete.');
}

main().catch((error: unknown) => {
	const message = error instanceof Error ? error.message : String(error);
	console.error(`RBAC Fix v2 failed: ${message}`);
	process.exit(1);
});
