/**
 * E1-10: Seed Branding & Navigation
 *
 * MISSION: Seed the Branding & Navigation to achieve "ALL GREEN"
 * CONTEXT: Closing Appendix 16 (Prerequisites) - INCOMEX SAIGON CORP
 *
 * OPERATIONS:
 * 1. Seed Logo - Smart fetch from Clearbit with fallback
 * 2. Update Globals - Project identity (name, description, logo, favicon)
 * 3. Seed Navigation - Social links as menu placeholder
 *
 * Usage:
 *   npx tsx web/scripts/e1-10_seed_branding_navigation.ts
 */

import { randomUUID } from 'crypto';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../.env') });

const DIRECTUS_URL = process.env.NUXT_PUBLIC_DIRECTUS_URL || process.env.DIRECTUS_URL;

function requireEnv(key: string): string {
	const value = process.env[key];
	if (!value) {
		throw new Error(`Missing required environment variable: ${key}`);
	}
	return value;
}

if (!DIRECTUS_URL) {
	throw new Error('Missing DIRECTUS_URL (or NUXT_PUBLIC_DIRECTUS_URL)');
}

const ADMIN_EMAIL = requireEnv('DIRECTUS_ADMIN_EMAIL');
const ADMIN_PASSWORD = requireEnv('DIRECTUS_ADMIN_PASSWORD');

const TARGET_WEBSITE = 'incomexsaigoncorp.vn';
const CLEARBIT_LOGO_URL = `https://logo.clearbit.com/${TARGET_WEBSITE}`;
const FALLBACK_LOGO_URL = 'https://placehold.co/400x100/ffffff/000000/png?text=INCOMEX+SAIGON';

interface DirectusFile {
	id: string;
	filename_download: string;
	title: string;
	type: string;
}

interface DirectusField {
	field: string;
}

interface FieldDefinition {
	field: string;
	type: string;
	meta: {
		interface: string;
		options: Record<string, unknown>;
		display: string;
		readonly: boolean;
		hidden: boolean;
		width: string;
	};
	schema: {
		name: string;
		data_type: string;
		max_length: number | null;
		is_nullable: boolean;
		default_value: string | null;
	};
}

interface DirectusGlobals {
	id?: string;
	project_name?: string;
	project_description?: string;
	logo_on_light_bg?: string;
	public_favicon?: string;
	social_links?: NavigationLink[];
	[key: string]: unknown;
}

interface NavigationLink {
	label: string;
	url: string;
	icon?: string;
}

const REQUIRED_GLOBAL_FIELDS: FieldDefinition[] = [
	{
		field: 'project_name',
		type: 'string',
		meta: {
			interface: 'input',
			options: {},
			display: 'raw',
			readonly: false,
			hidden: false,
			width: 'full',
		},
		schema: {
			name: 'project_name',
			data_type: 'varchar',
			max_length: 255,
			is_nullable: true,
			default_value: null,
		},
	},
	{
		field: 'project_description',
		type: 'text',
		meta: {
			interface: 'input-multiline',
			options: {},
			display: 'raw',
			readonly: false,
			hidden: false,
			width: 'full',
		},
		schema: {
			name: 'project_description',
			data_type: 'text',
			max_length: null,
			is_nullable: true,
			default_value: null,
		},
	},
];

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

async function ensureGlobalsFields(token: string): Promise<void> {
	console.log('  Ensuring globals fields exist...');
	const response = await fetch(`${DIRECTUS_URL}/fields/globals`, {
		method: 'GET',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
	});

	if (!response.ok) {
		const text = await response.text();
		throw new Error(`Failed to fetch globals fields: ${response.status} - ${text}`);
	}

	const data = await response.json();
	const existingFields = new Set((data.data as DirectusField[]).map((field) => field.field));

	for (const fieldDef of REQUIRED_GLOBAL_FIELDS) {
		if (existingFields.has(fieldDef.field)) {
			continue;
		}

		const createResponse = await fetch(`${DIRECTUS_URL}/fields/globals`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(fieldDef),
		});

		if (!createResponse.ok) {
			const text = await createResponse.text();
			if (text.includes('already exists') || text.includes('duplicate') || createResponse.status === 409) {
				continue;
			}
			throw new Error(`Failed to create globals field ${fieldDef.field}: ${createResponse.status} - ${text}`);
		}

		console.log(`  ✅ Created globals field: ${fieldDef.field}`);
	}
}

/**
 * Smart Logo Fetch - Try Clearbit, fallback to placeholder
 */
async function fetchLogoUrl(): Promise<{ url: string; source: string }> {
	console.log(`  Trying Clearbit logo: ${CLEARBIT_LOGO_URL}...`);

	try {
		const response = await fetch(CLEARBIT_LOGO_URL, {
			method: 'HEAD',
			redirect: 'follow',
		});

		if (response.ok) {
			console.log('  ✅ Clearbit logo available');
			return { url: CLEARBIT_LOGO_URL, source: 'clearbit' };
		}
	} catch (error) {
		console.log(`  ⚠️  Clearbit fetch failed: ${error instanceof Error ? error.message : String(error)}`);
	}

	console.log('  ℹ️  Using fallback placeholder logo');
	return { url: FALLBACK_LOGO_URL, source: 'placeholder' };
}

/**
 * Import logo file to Directus
 */
async function importLogoFile(token: string, logoUrl: string): Promise<string> {
	console.log(`  Importing logo from: ${logoUrl}...`);

	// Use Directus import file endpoint
	const response = await fetch(`${DIRECTUS_URL}/files/import`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			url: logoUrl,
			data: {
				title: 'Project Logo - INCOMEX SAIGON CORP',
				folder: null,
			},
		}),
	});

	if (!response.ok) {
		const text = await response.text();
		throw new Error(`Failed to import logo: ${response.status} - ${text}`);
	}

	const result = await response.json();
	const fileId = result.data.id as string;

	console.log(`  ✅ Logo imported (File ID: ${fileId})`);
	return fileId;
}

async function upsertGlobals(token: string, payload: Partial<DirectusGlobals>): Promise<DirectusGlobals> {
	const patchSingleton = await fetch(`${DIRECTUS_URL}/items/globals`, {
		method: 'PATCH',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(payload),
	});

	if (patchSingleton.ok) {
		const result = await patchSingleton.json();
		return result.data as DirectusGlobals;
	}

	const singletonErrorText = await patchSingleton.text();
	const requiresId = singletonErrorText.includes('"id"') || singletonErrorText.toLowerCase().includes('id');
	if (!requiresId) {
		throw new Error(`Failed to update globals: ${patchSingleton.status} - ${singletonErrorText}`);
	}

	const listResponse = await fetch(`${DIRECTUS_URL}/items/globals`, {
		method: 'GET',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
	});

	if (!listResponse.ok) {
		const text = await listResponse.text();
		throw new Error(`Failed to fetch globals list: ${listResponse.status} - ${text}`);
	}

	const listData = await listResponse.json();
	const existing = Array.isArray(listData.data)
		? (listData.data as DirectusGlobals[])[0]
		: (listData.data as DirectusGlobals | null | undefined);

	if (existing?.id) {
		const updateResponse = await fetch(`${DIRECTUS_URL}/items/globals/${existing.id}`, {
			method: 'PATCH',
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(payload),
		});

		if (!updateResponse.ok) {
			const text = await updateResponse.text();
			throw new Error(`Failed to update globals by id: ${updateResponse.status} - ${text}`);
		}

		const updated = await updateResponse.json();
		return updated.data as DirectusGlobals;
	}

	const generatedId = randomUUID();
	const createResponse = await fetch(`${DIRECTUS_URL}/items/globals`, {
		method: 'PATCH',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ id: generatedId, ...payload }),
	});

	if (createResponse.ok) {
		const created = await createResponse.json();
		return created.data as DirectusGlobals;
	}

	const createText = await createResponse.text();
	const postResponse = await fetch(`${DIRECTUS_URL}/items/globals`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ id: generatedId, ...payload }),
	});

	if (!postResponse.ok) {
		const text = await postResponse.text();
		throw new Error(
			`Failed to create globals: patch=${createResponse.status} ${createText} | post=${postResponse.status} ${text}`,
		);
	}

	const created = await postResponse.json();
	return created.data as DirectusGlobals;
}

/**
 * Update globals singleton with branding data
 */
async function updateGlobalsBranding(token: string, logoFileId: string): Promise<void> {
	console.log('  Updating globals with branding data...');

	const updates: Partial<DirectusGlobals> = {
		project_name: 'INCOMEX SAIGON CORP',
		project_description: 'Cổng tri thức dùng chung giữa Con người và AI',
		logo_on_light_bg: logoFileId,
		public_favicon: logoFileId,
	};

	const result = await upsertGlobals(token, updates);
	console.log('  ✅ Globals branding updated successfully');
	console.log(`     - project_name: "${result.project_name}"`);
	console.log(`     - project_description: "${result.project_description}"`);
	console.log(`     - logo_on_light_bg: ${result.logo_on_light_bg}`);
	console.log(`     - public_favicon: ${result.public_favicon}`);
}

/**
 * Update navigation structure (using social_links as placeholder)
 */
async function updateNavigation(token: string): Promise<void> {
	console.log('  Updating navigation structure...');

	const navigationLinks: NavigationLink[] = [
		{
			label: 'Home',
			url: '/',
			icon: 'home',
		},
		{
			label: 'Kho Tri Thức',
			url: '/knowledge',
			icon: 'book',
		},
		{
			label: 'Công cụ AI',
			url: '/tools',
			icon: 'auto_awesome',
		},
		{
			label: 'Quản trị',
			url: '/admin',
			icon: 'admin_panel_settings',
		},
	];

	await upsertGlobals(token, { social_links: navigationLinks });

	console.log('  ✅ Navigation updated successfully');
	navigationLinks.forEach((link) => {
		console.log(`     - ${link.label}: ${link.url}`);
	});
}

/**
 * Main seeding function
 */
async function seedBrandingNavigation(): Promise<void> {
	console.log('='.repeat(80));
	console.log('E1-10: Seed Branding & Navigation - INCOMEX SAIGON CORP');
	console.log('='.repeat(80));
	console.log();
	console.log('Target Website:', TARGET_WEBSITE);
	console.log();

	try {
		// Step 1: Authenticate
		console.log('Step 1: Admin Authentication');
		const token = await authenticateAdmin();
		console.log();

		// Step 2: Ensure Globals Fields
		console.log('Step 2: Ensure Globals Fields');
		await ensureGlobalsFields(token);
		console.log();

		// Step 3: Smart Logo Fetch
		console.log('Step 3: Smart Logo Fetch');
		const logoInfo = await fetchLogoUrl();
		console.log(`  Source: ${logoInfo.source}`);
		console.log(`  URL: ${logoInfo.url}`);
		console.log();

		// Step 4: Import Logo File
		console.log('Step 4: Import Logo to Directus');
		const logoFileId = await importLogoFile(token, logoInfo.url);
		console.log();

		// Step 5: Update Globals Branding
		console.log('Step 5: Update Globals (Identity)');
		await updateGlobalsBranding(token, logoFileId);
		console.log();

		// Step 6: Update Navigation
		console.log('Step 6: Seed Navigation Structure');
		await updateNavigation(token);
		console.log();

		console.log('='.repeat(80));
		console.log('✅ Branding & Navigation Seeding Complete');
		console.log('='.repeat(80));
		console.log();
		console.log('Summary:');
		console.log(`  - Logo imported: ${logoInfo.source === 'clearbit' ? 'Clearbit' : 'Placeholder'} (ID: ${logoFileId})`);
		console.log('  - Project name: INCOMEX SAIGON CORP');
		console.log('  - Navigation items: 4 links seeded');
		console.log();
		console.log('Next Steps:');
		console.log('  1. Verify branding in Directus admin (Settings > Globals)');
		console.log('  2. Check logo appears in frontend');
		console.log('  3. Validate navigation links work correctly');
		console.log('  4. Run Task 9 verification to confirm ALL GREEN status');
	} catch (error) {
		console.error('❌ Branding & navigation seeding failed:', error);
		throw error;
	}
}

// Run the script
seedBrandingNavigation().catch((error) => {
	console.error('Script failed:', error);
	process.exit(1);
});
