/**
 * Task 6: Seed Legal Pages & Configure Globals
 *
 * MISSION: Create legal pages (/privacy, /terms) and configure global SEO settings
 *
 * OPERATIONS:
 * 1. Create /privacy page (published, placeholder content)
 * 2. Create /terms page (published, placeholder content)
 * 3. Update globals singleton (project_name, project_description, google_analytics_id)
 *
 * IDEMPOTENCY: Checks if pages exist before creating (by permalink)
 *
 * Usage:
 *   npx tsx web/scripts/e1-06_seed_legal_globals.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../.env') });

const DIRECTUS_URL = process.env.NUXT_PUBLIC_DIRECTUS_URL;
const ADMIN_EMAIL = process.env.DIRECTUS_ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.DIRECTUS_ADMIN_PASSWORD || 'Directus@2025!';

interface DirectusPage {
	id?: string;
	title: string;
	permalink: string;
	content?: string;
	status: 'published' | 'draft' | 'archived';
	[key: string]: unknown;
}

interface DirectusGlobals {
	id?: string;
	project_name?: string;
	project_description?: string;
	google_analytics_id?: string;
	[key: string]: unknown;
}

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

async function checkPageExists(token: string, permalink: string): Promise<string | null> {
	const response = await fetch(
		`${DIRECTUS_URL}/items/pages?filter[permalink][_eq]=${encodeURIComponent(permalink)}&fields=id`,
		{
			method: 'GET',
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json',
			},
		},
	);

	if (!response.ok) {
		return null;
	}

	const data = await response.json();
	const pages = data.data as DirectusPage[];

	return pages.length > 0 ? pages[0].id! : null;
}

async function createPage(token: string, page: DirectusPage): Promise<string> {
	console.log(`  Creating page: ${page.permalink}...`);

	// Check if exists
	const existingId = await checkPageExists(token, page.permalink);
	if (existingId) {
		console.log(`  ℹ️  Page already exists (ID: ${existingId})`);
		return existingId;
	}

	// Create new page
	const response = await fetch(`${DIRECTUS_URL}/items/pages`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(page),
	});

	if (!response.ok) {
		const text = await response.text();
		throw new Error(`Failed to create page ${page.permalink}: ${response.status} - ${text}`);
	}

	const data = await response.json();
	const pageId = data.data.id as string;
	console.log(`  ✅ Page created (ID: ${pageId})`);

	return pageId;
}

async function updateGlobals(token: string, updates: Partial<DirectusGlobals>): Promise<void> {
	console.log('  Updating globals singleton...');

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

	console.log('  ✅ Globals updated');
}

async function seedLegalAndGlobals(): Promise<void> {
	console.log('='.repeat(80));
	console.log('Task 6: Seed Legal Pages & Configure Globals');
	console.log('='.repeat(80));
	console.log();

	try {
		// Step 1: Authenticate
		console.log('Step 1: Admin Authentication');
		const token = await authenticateAdmin();
		console.log();

		// Step 2: Create Privacy Page
		console.log('Step 2: Create Privacy Page');
		await createPage(token, {
			title: 'Privacy Policy',
			permalink: '/privacy',
			status: 'published',
			content: `
				<h1>Privacy Policy</h1>
				<p><strong>Last Updated:</strong> January 2026</p>

				<h2>1. Introduction</h2>
				<p>This Privacy Policy describes how we collect, use, and protect your personal information.</p>

				<h2>2. Information We Collect</h2>
				<p>We collect information you provide directly to us, such as when you create an account,
				submit content, or contact us for support.</p>

				<h2>3. How We Use Your Information</h2>
				<p>We use the information we collect to provide, maintain, and improve our services,
				communicate with you, and protect our users.</p>

				<h2>4. Data Security</h2>
				<p>We implement appropriate technical and organizational measures to protect your personal information.</p>

				<h2>5. Your Rights</h2>
				<p>You have the right to access, correct, or delete your personal information.
				Please contact us to exercise these rights.</p>

				<h2>6. Contact Us</h2>
				<p>If you have questions about this Privacy Policy, please contact us at privacy@example.com</p>
			`.trim(),
		});
		console.log();

		// Step 3: Create Terms Page
		console.log('Step 3: Create Terms of Service Page');
		await createPage(token, {
			title: 'Terms of Service',
			permalink: '/terms',
			status: 'published',
			content: `
				<h1>Terms of Service</h1>
				<p><strong>Last Updated:</strong> January 2026</p>

				<h2>1. Acceptance of Terms</h2>
				<p>By accessing or using our service, you agree to be bound by these Terms of Service.</p>

				<h2>2. User Accounts</h2>
				<p>You are responsible for maintaining the confidentiality of your account credentials
				and for all activities that occur under your account.</p>

				<h2>3. Content Guidelines</h2>
				<p>You agree not to post content that is illegal, harmful, threatening, abusive,
				harassing, defamatory, or otherwise objectionable.</p>

				<h2>4. Intellectual Property</h2>
				<p>All content on this service is protected by copyright and other intellectual property laws.
				You may not reproduce, distribute, or create derivative works without permission.</p>

				<h2>5. Limitation of Liability</h2>
				<p>We are not liable for any indirect, incidental, special, consequential, or punitive damages
				arising from your use of the service.</p>

				<h2>6. Changes to Terms</h2>
				<p>We reserve the right to modify these terms at any time.
				Continued use of the service constitutes acceptance of modified terms.</p>

				<h2>7. Contact</h2>
				<p>For questions about these Terms, please contact us at legal@example.com</p>
			`.trim(),
		});
		console.log();

		// Step 4: Update Globals
		console.log('Step 4: Configure Global SEO Settings');
		await updateGlobals(token, {
			project_name: 'Agency OS Knowledge Base',
			project_description:
				'Comprehensive knowledge management and content approval system for modern agencies',
			google_analytics_id: 'UA-XXXXX-X', // Placeholder - replace with real ID
		});
		console.log();

		console.log('='.repeat(80));
		console.log('✅ Task 6 Complete: Legal pages created and globals configured');
		console.log('='.repeat(80));
		console.log();
		console.log('Next Steps:');
		console.log('  1. Update google_analytics_id in Directus admin with real GA tracking ID');
		console.log('  2. Review and customize legal page content');
		console.log('  3. Verify pages are accessible at /privacy and /terms');
	} catch (error) {
		console.error('❌ Task 6 failed:', error);
		throw error;
	}
}

// Run the script
seedLegalAndGlobals().catch((error) => {
	console.error('Script failed:', error);
	process.exit(1);
});
