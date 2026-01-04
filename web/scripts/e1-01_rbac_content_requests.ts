/**
 * Task E1-01: RBAC Setup Script for content_requests (Agent Role)
 *
 * Applies CRU permissions on content_requests and full access on
 * content_requests_translations using dynamic admin login.
 */

type PermissionAction = 'create' | 'read' | 'update' | 'delete';
type PermissionFilter = Record<string, unknown> | null;
type FieldsSpec = string[] | string;

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
}

type PolicyRoleRef = { id: string } | string;

interface DirectusPolicy {
	id: string;
	name: string;
	roles?: PolicyRoleRef[];
}

interface DirectusPermission {
	id: number | string;
	policy: string;
	collection: string;
	action: string;
	fields?: FieldsSpec;
	permissions?: PermissionFilter;
	validation?: PermissionFilter;
}

interface DirectusAccessRecord {
	id: string;
	role: string;
	policy: string;
}

interface PermissionSpec {
	collection: string;
	action: PermissionAction;
	fields: FieldsSpec;
	permissions: PermissionFilter;
	validation: PermissionFilter;
}

const REQUIRED_ENV = ['DIRECTUS_URL', 'DIRECTUS_ADMIN_EMAIL', 'DIRECTUS_ADMIN_PASSWORD'] as const;
const AGENT_ROLE_NAMES = ['Agent', 'Agent Bot'] as const;
const DEFAULT_TIMEOUT_MS = 30000;

const PERMISSIONS: PermissionSpec[] = [
	{ collection: 'content_requests', action: 'create', fields: ['*'], permissions: null, validation: null },
	{ collection: 'content_requests', action: 'read', fields: ['*'], permissions: null, validation: null },
	{ collection: 'content_requests', action: 'update', fields: ['*'], permissions: null, validation: null },
	{ collection: 'content_requests_translations', action: 'create', fields: ['*'], permissions: null, validation: null },
	{ collection: 'content_requests_translations', action: 'read', fields: ['*'], permissions: null, validation: null },
	{ collection: 'content_requests_translations', action: 'update', fields: ['*'], permissions: null, validation: null },
	{ collection: 'content_requests_translations', action: 'delete', fields: ['*'], permissions: null, validation: null },
];

function getRequiredEnv(key: (typeof REQUIRED_ENV)[number]): string {
	const value = process.env[key];
	if (!value) {
		console.error(`Missing required environment variable: ${key}`);
		process.exit(1);
	}
	return value;
}

function normalizeBaseUrl(url: string): string {
	return url.replace(/\/+$/, '');
}

function roleRefToId(role: PolicyRoleRef): string {
	return typeof role === 'string' ? role : role.id;
}

async function fetchJson<T>(url: string, options: RequestInit = {}): Promise<T> {
	const response = await fetch(url, { ...options, signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS) });
	if (!response.ok) {
		const body = await response.text();
		const detail = body ? ` - ${body}` : '';
		throw new Error(`Request failed: ${response.status} ${response.statusText}${detail}`);
	}
	return (await response.json()) as T;
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
	const params = new URLSearchParams({ limit: '-1', fields: 'id,name' });
	const url = `${baseUrl}/roles?${params.toString()}`;
	const data = await fetchJson<DirectusResponse<DirectusRole[]>>(url, {
		headers: { Authorization: `Bearer ${token}` },
	});
	return data.data ?? [];
}

function selectAgentRole(roles: DirectusRole[]): DirectusRole {
	for (const name of AGENT_ROLE_NAMES) {
		const match = roles.find((role) => role.name.toLowerCase() === name.toLowerCase());
		if (match) {
			return match;
		}
	}
	throw new Error(`Role not found. Expected one of: ${AGENT_ROLE_NAMES.join(', ')}`);
}

async function fetchPolicies(baseUrl: string, token: string): Promise<DirectusPolicy[]> {
	const params = new URLSearchParams({ limit: '-1', fields: 'id,name,roles' });
	const url = `${baseUrl}/policies?${params.toString()}`;
	const data = await fetchJson<DirectusResponse<DirectusPolicy[]>>(url, {
		headers: { Authorization: `Bearer ${token}` },
	});
	return data.data ?? [];
}

async function fetchAccessPolicyId(baseUrl: string, token: string, roleId: string): Promise<string | undefined> {
	const params = new URLSearchParams({
		limit: '1',
		fields: 'id,role,policy',
		'filter[role][_eq]': roleId,
	});
	const endpoints = [`${baseUrl}/access?${params.toString()}`, `${baseUrl}/items/directus_access?${params.toString()}`];
	let lastError: Error | undefined;

	for (const url of endpoints) {
		try {
			const data = await fetchJson<DirectusResponse<DirectusAccessRecord[]>>(url, {
				headers: { Authorization: `Bearer ${token}` },
			});
			return data.data?.[0]?.policy;
		} catch (error: unknown) {
			lastError = error instanceof Error ? error : new Error(String(error));
		}
	}

	if (lastError) {
		throw lastError;
	}
	return undefined;
}

function resolvePolicyByRole(policies: DirectusPolicy[], roleId: string): DirectusPolicy | undefined {
	return policies.find((policy) => (policy.roles ?? []).map(roleRefToId).includes(roleId));
}

function resolvePolicyByName(policies: DirectusPolicy[], roleName: string): DirectusPolicy | undefined {
	const candidates = new Set([`${roleName} Policy`, 'Agent Policy', 'Agent Bot Policy']);
	return policies.find((policy) => candidates.has(policy.name));
}

async function fetchExistingPermission(
	baseUrl: string,
	token: string,
	policyId: string,
	collection: string,
	action: PermissionAction,
): Promise<DirectusPermission | undefined> {
	const params = new URLSearchParams({
		limit: '1',
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
	const existing = await fetchExistingPermission(baseUrl, token, policyId, spec.collection, spec.action);
	if (existing?.id !== undefined) {
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
		}),
	});
	return 'created';
}

async function main(): Promise<void> {
	console.log('RBAC setup: content_requests (Agent role)');

	const baseUrl = normalizeBaseUrl(getRequiredEnv('DIRECTUS_URL'));
	const email = getRequiredEnv('DIRECTUS_ADMIN_EMAIL');
	const password = getRequiredEnv('DIRECTUS_ADMIN_PASSWORD');

	console.log('Authenticating...');
	const token = await authenticate(baseUrl, email, password);
	console.log('Authenticated.');

	const roles = await fetchRoles(baseUrl, token);
	const agentRole = selectAgentRole(roles);
	console.log(`Using role: ${agentRole.name} (${agentRole.id})`);

	let accessPolicyId: string | undefined;
	try {
		accessPolicyId = await fetchAccessPolicyId(baseUrl, token, agentRole.id);
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error);
		console.warn(`Warning: failed to resolve policy via access lookup: ${message}`);
	}

	let policies: DirectusPolicy[] = [];
	let policyFromList: DirectusPolicy | undefined;
	try {
		policies = await fetchPolicies(baseUrl, token);
		policyFromList = resolvePolicyByRole(policies, agentRole.id) ?? resolvePolicyByName(policies, agentRole.name);
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error);
		if (!accessPolicyId) {
			throw new Error(`Policy lookup failed: ${message}`);
		}
		console.warn(`Warning: failed to fetch policies list: ${message}`);
	}

	const policyId = accessPolicyId ?? policyFromList?.id;
	const policyName =
		policyFromList?.name ?? policies.find((policy) => policy.id === accessPolicyId)?.name ?? undefined;

	if (!policyId) {
		throw new Error('Policy not found for Agent role. Ensure an Agent policy exists and is linked to the role.');
	}

	console.log(`Using policy: ${policyName ?? policyId} (${policyId})`);

	let created = 0;
	let updated = 0;

	for (const spec of PERMISSIONS) {
		const result = await upsertPermission(baseUrl, token, policyId, spec);
		if (result === 'created') {
			created += 1;
		} else {
			updated += 1;
		}
		console.log(`Applied ${spec.action} on ${spec.collection} (${result}).`);
	}

	console.log(`Permissions applied. Created: ${created}, Updated: ${updated}.`);
	console.log('RBAC configuration complete.');
}

main().catch((error: unknown) => {
	const message = error instanceof Error ? error.message : String(error);
	console.error(`RBAC setup failed: ${message}`);
	process.exit(1);
});
