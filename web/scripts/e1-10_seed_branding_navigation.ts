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

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../.env') });

const DIRECTUS_URL = process.env.NUXT_PUBLIC_DIRECTUS_URL;
const ADMIN_EMAIL = process.env.DIRECTUS_ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.DIRECTUS_ADMIN_PASSWORD || 'Directus@2025!';

const TARGET_WEBSITE = 'incomexsaigoncorp.vn';
const CLEARBIT_LOGO_URL = `https://logo.clearbit.com/${TARGET_WEBSITE}`;
const FALLBACK_LOGO_URL = 'https://placehold.co/400x100/ffffff/000000/png?text=INCOMEX+SAIGON';

interface DirectusFile {
	id: string;
	filename_download: string;
	title: string;
	type: string;
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

	const response = await fetch(`${DIRECTUS_URL}/items/globals`, {
		method: 'PATCH',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(updates),
	});

	if (!response.ok) {
		const text = await response.text();
		throw new Error(`Failed to update globals: ${response.status} - ${text}`);
	}

	const result = await response.json();
	console.log('  ✅ Globals branding updated successfully');
	console.log(`     - project_name: "${result.data.project_name}"`);
	console.log(`     - project_description: "${result.data.project_description}"`);
	console.log(`     - logo_on_light_bg: ${result.data.logo_on_light_bg}`);
	console.log(`     - public_favicon: ${result.data.public_favicon}`);
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

	const response = await fetch(`${DIRECTUS_URL}/items/globals`, {
		method: 'PATCH',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			social_links: navigationLinks,
		}),
	});

	if (!response.ok) {
		const text = await response.text();
		throw new Error(`Failed to update navigation: ${response.status} - ${text}`);
	}

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

		// Step 2: Smart Logo Fetch
		console.log('Step 2: Smart Logo Fetch');
		const logoInfo = await fetchLogoUrl();
		console.log(`  Source: ${logoInfo.source}`);
		console.log(`  URL: ${logoInfo.url}`);
		console.log();

		// Step 3: Import Logo File
		console.log('Step 3: Import Logo to Directus');
		const logoFileId = await importLogoFile(token, logoInfo.url);
		console.log();

		// Step 4: Update Globals Branding
		console.log('Step 4: Update Globals (Identity)');
		await updateGlobalsBranding(token, logoFileId);
		console.log();

		// Step 5: Update Navigation
		console.log('Step 5: Seed Navigation Structure');
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
