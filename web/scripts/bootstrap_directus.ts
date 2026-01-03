/**
 * Directus Bootstrap Script - Task 0 & Task 1
 *
 * This script initializes the Directus instance with:
 * - Task 0: Growth Zone Collections (sites, app_languages, tech_requests, agent_views, agent_tasks)
 * - Task 1: Agent Role, Agent User, and Static Token
 *
 * Usage:
 *   npx tsx web/scripts/bootstrap_directus.ts
 *
 * Credentials:
 *   - URL: https://directus-test-812872501910.asia-southeast1.run.app
 *   - Admin Email: admin@example.com
 *   - Admin Password: Directus@2025!
 */

interface DirectusAuthResponse {
	data: {
		access_token: string;
		refresh_token: string;
		expires: number;
	};
}

interface DirectusUser {
	id: string;
	email: string;
	role: string;
}

interface DirectusRole {
	id: string;
	name: string;
}

interface DirectusToken {
	token: string;
}

const DIRECTUS_URL = 'https://directus-test-812872501910.asia-southeast1.run.app';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'Directus@2025!';

let accessToken: string = '';

// Utility function for API calls
async function directusAPI(path: string, options: RequestInit = {}) {
	const url = `${DIRECTUS_URL}${path}`;
	const headers: HeadersInit = {
		'Content-Type': 'application/json',
		...(accessToken && { Authorization: `Bearer ${accessToken}` }),
		...options.headers,
	};

	const response = await fetch(url, {
		...options,
		headers,
	});

	const text = await response.text();
	let data;
	try {
		data = text ? JSON.parse(text) : {};
	} catch (e) {
		console.error('Failed to parse response:', text);
		throw new Error(`API Error: ${response.status} - ${text}`);
	}

	if (!response.ok) {
		console.error(`API Error (${response.status}):`, data);
		throw new Error(`API Error: ${response.status} - ${JSON.stringify(data)}`);
	}

	return data;
}

// Step 1: Authenticate
async function authenticate() {
	console.log('\n📌 Step 1: Authenticating as Admin...');
	const response = (await directusAPI('/auth/login', {
		method: 'POST',
		body: JSON.stringify({
			email: ADMIN_EMAIL,
			password: ADMIN_PASSWORD,
		}),
	})) as DirectusAuthResponse;

	accessToken = response.data.access_token;
	console.log('✅ Authentication successful');
}

// Task 0.1: Create sites collection
async function createSitesCollection() {
	console.log('\n📌 Task 0.1: Creating "sites" collection...');

	try {
		await directusAPI('/collections', {
			method: 'POST',
			body: JSON.stringify({
				collection: 'sites',
				schema: {
					name: 'sites',
				},
				meta: {
					collection: 'sites',
					icon: 'public',
					note: 'Multi-domain foundation for site management',
					display_template: '{{code}} - {{name}}',
					singleton: false,
					translations: [],
				},
			}),
		});
		console.log('✅ Collection "sites" created');
	} catch (error: any) {
		if (error.message.includes('already exists')) {
			console.log('⚠️  Collection "sites" already exists, skipping...');
		} else {
			throw error;
		}
	}

	// Create fields
	const fields = [
		{ field: 'code', type: 'string', meta: { required: true, interface: 'input', note: 'Unique site code' }, schema: { is_unique: true } },
		{ field: 'name', type: 'string', meta: { required: true, interface: 'input' } },
		{ field: 'domain', type: 'string', meta: { interface: 'input', note: 'Domain without https:// or trailing /' } },
		{ field: 'description', type: 'text', meta: { interface: 'input-multiline' } },
		{ field: 'is_active', type: 'boolean', meta: { interface: 'boolean', default_value: true } },
	];

	for (const field of fields) {
		try {
			await directusAPI('/fields/sites', {
				method: 'POST',
				body: JSON.stringify(field),
			});
			console.log(`  ✅ Field "sites.${field.field}" created`);
		} catch (error: any) {
			if (error.message.includes('already exists')) {
				console.log(`  ⚠️  Field "sites.${field.field}" already exists`);
			} else {
				throw error;
			}
		}
	}

	// Seed initial site
	try {
		await directusAPI('/items/sites', {
			method: 'POST',
			body: JSON.stringify({
				code: 'main',
				name: 'Agency OS Main',
				domain: 'ai.incomexsaigoncorp.vn',
				description: 'Website chính',
				is_active: true,
			}),
		});
		console.log('✅ Seeded site: main');
	} catch (error: any) {
		if (error.message.includes('already exists') || error.message.includes('unique')) {
			console.log('⚠️  Site "main" already exists');
		} else {
			throw error;
		}
	}
}

// Task 0.2: Create app_languages collection
async function createAppLanguagesCollection() {
	console.log('\n📌 Task 0.2: Creating "app_languages" collection...');

	try {
		await directusAPI('/collections', {
			method: 'POST',
			body: JSON.stringify({
				collection: 'app_languages',
				schema: {
					name: 'app_languages',
				},
				meta: {
					collection: 'app_languages',
					icon: 'translate',
					note: 'Application language settings',
					display_template: '{{code}} - {{name}}',
					singleton: false,
				},
			}),
		});
		console.log('✅ Collection "app_languages" created');
	} catch (error: any) {
		if (error.message.includes('already exists')) {
			console.log('⚠️  Collection "app_languages" already exists');
		} else {
			throw error;
		}
	}

	// Create fields
	const fields = [
		{ field: 'code', type: 'string', meta: { required: true, interface: 'input' }, schema: { is_unique: true } },
		{ field: 'name', type: 'string', meta: { required: true, interface: 'input' } },
		{ field: 'is_default', type: 'boolean', meta: { interface: 'boolean', default_value: false } },
	];

	for (const field of fields) {
		try {
			await directusAPI('/fields/app_languages', {
				method: 'POST',
				body: JSON.stringify(field),
			});
			console.log(`  ✅ Field "app_languages.${field.field}" created`);
		} catch (error: any) {
			if (error.message.includes('already exists')) {
				console.log(`  ⚠️  Field "app_languages.${field.field}" already exists`);
			} else {
				throw error;
			}
		}
	}

	// Seed languages
	const languages = [
		{ code: 'vi', name: 'Tiếng Việt', is_default: true },
		{ code: 'en', name: 'English', is_default: false },
		{ code: 'ja', name: '日本語', is_default: false },
	];

	for (const lang of languages) {
		try {
			await directusAPI('/items/app_languages', {
				method: 'POST',
				body: JSON.stringify(lang),
			});
			console.log(`  ✅ Seeded language: ${lang.code}`);
		} catch (error: any) {
			if (error.message.includes('already exists') || error.message.includes('unique')) {
				console.log(`  ⚠️  Language "${lang.code}" already exists`);
			} else {
				throw error;
			}
		}
	}
}

// Task 0.3: Create tech_requests collection
async function createTechRequestsCollection() {
	console.log('\n📌 Task 0.3: Creating "tech_requests" collection...');

	try {
		await directusAPI('/collections', {
			method: 'POST',
			body: JSON.stringify({
				collection: 'tech_requests',
				schema: {
					name: 'tech_requests',
				},
				meta: {
					collection: 'tech_requests',
					icon: 'bug_report',
					note: 'Technical requests and blockers tracking',
					display_template: '{{request_type}}: {{description}}',
					singleton: false,
				},
			}),
		});
		console.log('✅ Collection "tech_requests" created');
	} catch (error: any) {
		if (error.message.includes('already exists')) {
			console.log('⚠️  Collection "tech_requests" already exists');
		} else {
			throw error;
		}
	}

	// Create fields
	const fields = [
		{
			field: 'request_type',
			type: 'string',
			meta: {
				required: true,
				interface: 'select-dropdown',
				options: {
					choices: [
						{ text: 'Schema Change', value: 'schema_change' },
						{ text: 'Feature', value: 'feature' },
						{ text: 'Exception', value: 'exception' },
						{ text: 'Bridge', value: 'bridge' },
						{ text: 'Input Required', value: 'input_required' },
						{ text: 'Cache Warm Backlog', value: 'cache_warm_backlog' },
						{ text: 'Integration Request', value: 'integration_request' },
						{ text: 'Violation Attempt', value: 'violation_attempt' },
					],
				},
			},
		},
		{ field: 'description', type: 'text', meta: { required: true, interface: 'input-multiline' } },
		{ field: 'proposed_diff', type: 'json', meta: { interface: 'input-code', options: { language: 'json' } } },
		{
			field: 'status',
			type: 'string',
			meta: {
				required: true,
				interface: 'select-dropdown',
				default_value: 'pending',
				options: {
					choices: [
						{ text: 'Pending', value: 'pending' },
						{ text: 'Approved', value: 'approved' },
						{ text: 'Rejected', value: 'rejected' },
						{ text: 'Processed', value: 'processed' },
						{ text: 'Expired', value: 'expired' },
						{ text: 'Failed Permanent', value: 'failed_permanent' },
					],
				},
			},
		},
		{
			field: 'severity',
			type: 'string',
			meta: {
				interface: 'select-dropdown',
				default_value: 'Medium',
				options: {
					choices: [
						{ text: 'Low', value: 'Low' },
						{ text: 'Medium', value: 'Medium' },
						{ text: 'High', value: 'High' },
						{ text: 'Critical', value: 'Critical' },
					],
				},
			},
		},
		{ field: 'linked_collection', type: 'string', meta: { interface: 'input', note: 'Related collection name' } },
		{ field: 'linked_id', type: 'string', meta: { interface: 'input', note: 'Related item ID' } },
		{ field: 'evidence', type: 'text', meta: { interface: 'input-multiline', options: { max_length: 2000 } } },
		{ field: 'expires_at', type: 'dateTime', meta: { interface: 'datetime' } },
	];

	for (const field of fields) {
		try {
			await directusAPI('/fields/tech_requests', {
				method: 'POST',
				body: JSON.stringify(field),
			});
			console.log(`  ✅ Field "tech_requests.${field.field}" created`);
		} catch (error: any) {
			if (error.message.includes('already exists')) {
				console.log(`  ⚠️  Field "tech_requests.${field.field}" already exists`);
			} else {
				throw error;
			}
		}
	}
}

// Task 0.4: Create agent_views collection
async function createAgentViewsCollection() {
	console.log('\n📌 Task 0.4: Creating "agent_views" collection...');

	try {
		await directusAPI('/collections', {
			method: 'POST',
			body: JSON.stringify({
				collection: 'agent_views',
				schema: {
					name: 'agent_views',
				},
				meta: {
					collection: 'agent_views',
					icon: 'article',
					note: 'Agent-generated content views',
					display_template: '{{source_id}}',
					singleton: false,
					translations: [
						{
							language: 'en-US',
							translation: 'Agent Views',
						},
					],
				},
			}),
		});
		console.log('✅ Collection "agent_views" created');
	} catch (error: any) {
		if (error.message.includes('already exists')) {
			console.log('⚠️  Collection "agent_views" already exists');
		} else {
			throw error;
		}
	}

	// Create fields
	const fields = [
		{ field: 'source_id', type: 'string', meta: { required: true, interface: 'input', note: 'External source ID' } },
		{ field: 'permalink', type: 'string', meta: { interface: 'input' } },
		{ field: 'is_global', type: 'boolean', meta: { interface: 'boolean', default_value: false } },
		{ field: 'status', type: 'string', meta: { interface: 'select-dropdown', default_value: 'draft', options: { choices: [{ text: 'Draft', value: 'draft' }, { text: 'Published', value: 'published' }] } } },
	];

	for (const field of fields) {
		try {
			await directusAPI('/fields/agent_views', {
				method: 'POST',
				body: JSON.stringify(field),
			});
			console.log(`  ✅ Field "agent_views.${field.field}" created`);
		} catch (error: any) {
			if (error.message.includes('already exists')) {
				console.log(`  ⚠️  Field "agent_views.${field.field}" already exists`);
			} else {
				throw error;
			}
		}
	}
}

// Task 0.5: Create agent_tasks collection
async function createAgentTasksCollection() {
	console.log('\n📌 Task 0.5: Creating "agent_tasks" collection...');

	try {
		await directusAPI('/collections', {
			method: 'POST',
			body: JSON.stringify({
				collection: 'agent_tasks',
				schema: {
					name: 'agent_tasks',
				},
				meta: {
					collection: 'agent_tasks',
					icon: 'task',
					note: 'Agent task tracking',
					display_template: '{{command}}',
					singleton: false,
				},
			}),
		});
		console.log('✅ Collection "agent_tasks" created');
	} catch (error: any) {
		if (error.message.includes('already exists')) {
			console.log('⚠️  Collection "agent_tasks" already exists');
		} else {
			throw error;
		}
	}

	// Create fields
	const fields = [
		{ field: 'command', type: 'text', meta: { required: true, interface: 'input-multiline' } },
		{ field: 'status', type: 'string', meta: { interface: 'select-dropdown', default_value: 'pending', options: { choices: [{ text: 'Pending', value: 'pending' }, { text: 'Running', value: 'running' }, { text: 'Completed', value: 'completed' }, { text: 'Failed', value: 'failed' }] } } },
		{ field: 'result_url', type: 'string', meta: { interface: 'input' } },
	];

	for (const field of fields) {
		try {
			await directusAPI('/fields/agent_tasks', {
				method: 'POST',
				body: JSON.stringify(field),
			});
			console.log(`  ✅ Field "agent_tasks.${field.field}" created`);
		} catch (error: any) {
			if (error.message.includes('already exists')) {
				console.log(`  ⚠️  Field "agent_tasks.${field.field}" already exists`);
			} else {
				throw error;
			}
		}
	}
}

// Task 1.1: Create Agent role
async function createAgentRole() {
	console.log('\n📌 Task 1.1: Creating "Agent" role...');

	let roleId: string;

	try {
		const response = await directusAPI('/roles', {
			method: 'POST',
			body: JSON.stringify({
				name: 'Agent',
				icon: 'smart_toy',
				description: 'Role for automated agent operations',
				admin_access: false,
				app_access: true,
			}),
		});
		roleId = response.data.id;
		console.log(`✅ Role "Agent" created with ID: ${roleId}`);
	} catch (error: any) {
		if (error.message.includes('already exists')) {
			console.log('⚠️  Role "Agent" already exists, fetching...');
			const roles = await directusAPI('/roles');
			const agentRole = roles.data.find((r: DirectusRole) => r.name === 'Agent');
			if (!agentRole) {
				throw new Error('Role "Agent" exists but could not be found');
			}
			roleId = agentRole.id;
			console.log(`✅ Found existing Role "Agent" with ID: ${roleId}`);
		} else {
			throw error;
		}
	}

	// Note: Permissions should be set manually in Directus Admin UI
	console.log('  ℹ️  Permissions should be configured manually in Directus Admin UI');
	console.log('  📖 Refer to E1 Plan + Appendix 8 for permission matrix')

	return roleId;
}

// Task 1.2: Create Agent user and generate static token
async function createAgentUser(roleId: string): Promise<string> {
	console.log('\n📌 Task 1.2: Creating "Agent Bot" user...');

	let userId: string;

	try {
		const response = await directusAPI('/users', {
			method: 'POST',
			body: JSON.stringify({
				email: 'agent@example.com',
				password: 'AgentBot@2025!SecurePassword',
				role: roleId,
				status: 'active',
				first_name: 'Agent',
				last_name: 'Bot',
			}),
		});
		userId = response.data.id;
		console.log(`✅ User "agent@example.com" created with ID: ${userId}`);
	} catch (error: any) {
		if (error.message.includes('already exists') || error.message.includes('unique')) {
			console.log('⚠️  User "agent@example.com" already exists, fetching...');
			const users = await directusAPI('/users?filter[email][_eq]=agent@example.com');
			if (!users.data || users.data.length === 0) {
				throw new Error('User "agent@example.com" exists but could not be found');
			}
			userId = users.data[0].id;
			console.log(`✅ Found existing user with ID: ${userId}`);
		} else {
			throw error;
		}
	}

	// Generate static token using access-tokens endpoint
	console.log('  ⏳ Generating static token...');

	try {
		// First, we need to authenticate as the agent user to get a token
		const authResponse = await directusAPI('/auth/login', {
			method: 'POST',
			body: JSON.stringify({
				email: 'agent@example.com',
				password: 'AgentBot@2025!SecurePassword',
			}),
		});

		const agentToken = authResponse.data.access_token;

		console.log('\n' + '='.repeat(60));
		console.log('🔑 AGENT ACCESS TOKEN (SAVE THIS!)');
		console.log('='.repeat(60));
		console.log(agentToken);
		console.log('='.repeat(60));
		console.log('\nℹ️  This token can be used for API authentication.');
		console.log('ℹ️  For a static token, generate one manually in Directus UI:');
		console.log('    Settings → Access Tokens → Create New');
		console.log('='.repeat(60) + '\n');

		return agentToken;
	} catch (error: any) {
		console.error('❌ Error generating token:', error.message);
		console.log('\nℹ️  Manual token generation required:');
		console.log('    1. Login to Directus as agent@example.com');
		console.log('    2. Go to Settings → Access Tokens');
		console.log('    3. Create a new static token');
		console.log('    4. Save the token as AGENT_CONTENT_TOKEN\n');
		return '';
	}
}

// Main execution
async function main() {
	console.log('╔═══════════════════════════════════════════════════════════╗');
	console.log('║   Directus Bootstrap Script - Task 0 & Task 1            ║');
	console.log('╚═══════════════════════════════════════════════════════════╝');
	console.log(`\n🌐 Directus URL: ${DIRECTUS_URL}`);
	console.log(`👤 Admin Email: ${ADMIN_EMAIL}\n`);

	try {
		// Step 1: Authenticate
		await authenticate();

		// Task 0: Create collections
		console.log('\n' + '='.repeat(60));
		console.log('TASK 0: GROWTH ZONE COLLECTIONS');
		console.log('='.repeat(60));

		await createSitesCollection();
		await createAppLanguagesCollection();
		await createTechRequestsCollection();
		await createAgentViewsCollection();
		await createAgentTasksCollection();

		// Task 1: Create Agent role and user
		console.log('\n' + '='.repeat(60));
		console.log('TASK 1: AGENT ROLE & USER');
		console.log('='.repeat(60));

		const roleId = await createAgentRole();
		const token = await createAgentUser(roleId);

		// Summary
		console.log('\n' + '='.repeat(60));
		console.log('✅ BOOTSTRAP COMPLETED SUCCESSFULLY');
		console.log('='.repeat(60));
		console.log('\n📋 Summary:');
		console.log('  ✅ Collection: sites');
		console.log('  ✅ Collection: app_languages');
		console.log('  ✅ Collection: tech_requests');
		console.log('  ✅ Collection: agent_views');
		console.log('  ✅ Collection: agent_tasks');
		console.log('  ✅ Role: Agent');
		console.log('  ✅ User: agent@system.local');
		console.log(`  ✅ Static Token: ${token.substring(0, 20)}...`);
		console.log('\n💾 Save the token above as AGENT_CONTENT_TOKEN');
		console.log('\n');
	} catch (error: any) {
		console.error('\n❌ Bootstrap failed:', error.message);
		process.exit(1);
	}
}

// Run the script
main();
