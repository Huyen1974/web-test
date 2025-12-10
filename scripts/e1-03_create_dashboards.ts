#!/usr/bin/env ts-node
/**
 * Task E1-03: Create Directus Dashboards for Content Operations Queues & SLA
 *
 * This script creates/updates Directus Dashboards via API to provide
 * operational visibility into content_requests queues and SLA metrics.
 *
 * SAFETY:
 * - Dry-run by default (no changes applied)
 * - Use --execute flag to apply changes
 * - Idempotent: safe to run multiple times
 * - Updates existing dashboards/panels instead of creating duplicates
 *
 * USAGE:
 *   # Dry-run (default) - shows what would be created/updated
 *   npx tsx scripts/e1-03_create_dashboards.ts
 *
 *   # Execute dashboard creation
 *   npx tsx scripts/e1-03_create_dashboards.ts --execute
 *
 * ENVIRONMENT VARIABLES (required):
 *   DIRECTUS_URL            - Base URL of Directus TEST instance
 *   DIRECTUS_ADMIN_EMAIL    - Admin email for authentication
 *   DIRECTUS_ADMIN_PASSWORD - Admin password for authentication
 *
 * @see docs/E1_Plan.md (Dashboard & SLA section)
 * @see docs/Web_List_to_do_01.md (row E1-03-DASHBOARD-QUEUES)
 */

import * as fs from 'fs';
import * as path from 'path';

// Optional: load .env if available
try {
	require('dotenv').config();
} catch {
	// dotenv not available or .env doesn't exist - use process.env only
}

// ============================================================================
// Types & Interfaces
// ============================================================================

interface DirectusDashboard {
	id?: string;
	name: string;
	icon?: string;
	note?: string;
	color?: string;
	date_created?: string;
	user_created?: string;
	panels?: DirectusPanel[];
}

interface DirectusPanel {
	id?: string;
	dashboard?: string;
	name: string;
	icon?: string;
	color?: string;
	show_header?: boolean;
	note?: string;
	type: string; // 'list', 'metric', 'time-series', etc.
	position_x: number;
	position_y: number;
	width: number;
	height: number;
	options?: Record<string, any>;
	date_created?: string;
	user_created?: string;
}

interface DashboardResult {
	dashboardsCreated: string[];
	dashboardsUpdated: string[];
	panelsCreated: number;
	panelsUpdated: number;
	dryRun: boolean;
	errors: Array<{ item: string; error: string }>;
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * Dashboard definition for E1-03
 */
const DASHBOARD_DEF = {
	name: 'Content Operations',
	icon: 'dashboard',
	note: 'E1: Content request queues, SLA tracking, and operational metrics',
	color: '#6644FF',
};

/**
 * Panel definitions for Content Operations dashboard
 */
const PANEL_DEFINITIONS = [
	/**
	 * Panel 1: "Cần duyệt ngay" (Need Immediate Review/Approval)
	 * Shows content_requests awaiting human action
	 */
	{
		key: 'e1_queue_need_review',
		name: 'Cần duyệt ngay',
		icon: 'warning',
		color: '#FF9800',
		type: 'list',
		position_x: 1,
		position_y: 1,
		width: 12,
		height: 8,
		show_header: true,
		note: 'Content requests awaiting human review or approval',
		options: {
			collection: 'content_requests',
			query: {
				fields: ['id', 'title', 'status', 'current_holder', 'created_at', 'updated_at'],
				sort: ['-updated_at'],
				filter: {
					_or: [
						{
							status: {
								_eq: 'awaiting_review',
							},
						},
						{
							status: {
								_eq: 'awaiting_approval',
							},
						},
					],
				},
				limit: 25,
			},
		},
	},

	/**
	 * Panel 2: "Agent đang chạy" (Agent Running)
	 * Shows content_requests currently being processed by agents
	 */
	{
		key: 'e1_queue_agent_running',
		name: 'Agent đang chạy',
		icon: 'smart_toy',
		color: '#2196F3',
		type: 'list',
		position_x: 13,
		position_y: 1,
		width: 12,
		height: 8,
		show_header: true,
		note: 'Content requests currently being processed by agents',
		options: {
			collection: 'content_requests',
			query: {
				fields: ['id', 'title', 'status', 'current_holder', 'updated_at'],
				sort: ['-updated_at'],
				filter: {
					_or: [
						{
							status: {
								_eq: 'drafting',
							},
						},
						{
							status: {
								_eq: 'assigned',
							},
						},
					],
				},
				limit: 25,
			},
		},
	},

	/**
	 * Panel 3: "Bài mới trong tuần" (New This Week)
	 * Metric showing count of requests created in last 7 days
	 */
	{
		key: 'e1_metric_new_this_week',
		name: 'Bài mới trong tuần',
		icon: 'fiber_new',
		color: '#4CAF50',
		type: 'metric',
		position_x: 1,
		position_y: 9,
		width: 6,
		height: 4,
		show_header: true,
		note: 'Count of content requests created in the last 7 days',
		options: {
			collection: 'content_requests',
			field: 'id',
			function: 'count',
			filter: {
				created_at: {
					_gte: '$NOW(-7 days)',
				},
			},
		},
	},

	/**
	 * Panel 4: "Tổng bài đang xử lý" (Total In Progress)
	 * Metric showing count of active requests (not published/rejected/canceled)
	 */
	{
		key: 'e1_metric_in_progress',
		name: 'Tổng bài đang xử lý',
		icon: 'pending_actions',
		color: '#00BCD4',
		type: 'metric',
		position_x: 7,
		position_y: 9,
		width: 6,
		height: 4,
		show_header: true,
		note: 'Total content requests currently in progress',
		options: {
			collection: 'content_requests',
			field: 'id',
			function: 'count',
			filter: {
				status: {
					_nin: ['published', 'rejected', 'canceled'],
				},
			},
		},
	},

	/**
	 * Panel 5: "SLA: Quá hạn" (SLA: Overdue)
	 * Shows requests that have been in awaiting_review/approval for more than 24 hours
	 */
	{
		key: 'e1_sla_overdue',
		name: 'SLA: Quá hạn',
		icon: 'schedule',
		color: '#F44336',
		type: 'list',
		position_x: 13,
		position_y: 9,
		width: 12,
		height: 8,
		show_header: true,
		note: 'Content requests overdue for review/approval (>24 hours)',
		options: {
			collection: 'content_requests',
			query: {
				fields: ['id', 'title', 'status', 'current_holder', 'updated_at'],
				sort: ['updated_at'],
				filter: {
					_and: [
						{
							_or: [
								{
									status: {
										_eq: 'awaiting_review',
									},
								},
								{
									status: {
										_eq: 'awaiting_approval',
									},
								},
							],
						},
						{
							updated_at: {
								_lt: '$NOW(-24 hours)',
							},
						},
					],
				},
				limit: 25,
			},
		},
	},

	/**
	 * Panel 6: "Hoàn thành tuần này" (Completed This Week)
	 * Metric showing count of requests published in last 7 days
	 */
	{
		key: 'e1_metric_completed_this_week',
		name: 'Hoàn thành tuần này',
		icon: 'check_circle',
		color: '#4CAF50',
		type: 'metric',
		position_x: 1,
		position_y: 13,
		width: 6,
		height: 4,
		show_header: true,
		note: 'Count of content requests published in the last 7 days',
		options: {
			collection: 'content_requests',
			field: 'id',
			function: 'count',
			filter: {
				_and: [
					{
						status: {
							_eq: 'published',
						},
					},
					{
						updated_at: {
							_gte: '$NOW(-7 days)',
						},
					},
				],
			},
		},
	},
];

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
		console.error('  export DIRECTUS_ADMIN_PASSWORD="your-password"\n');
		process.exit(1);
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
 * Fetch all existing dashboards
 */
async function fetchDashboards(token: string): Promise<DirectusDashboard[]> {
	const url = `${process.env.DIRECTUS_URL}/dashboards`;
	const response = await fetch(url, {
		headers: { Authorization: `Bearer ${token}` },
	});

	if (!response.ok) {
		throw new Error(`Failed to fetch dashboards: ${response.status} ${response.statusText}`);
	}

	const data = await response.json();
	return data.data || [];
}

/**
 * Create a new dashboard
 */
async function createDashboard(token: string, dashboardDef: Partial<DirectusDashboard>): Promise<DirectusDashboard> {
	const url = `${process.env.DIRECTUS_URL}/dashboards`;
	const response = await fetch(url, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(dashboardDef),
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Failed to create dashboard: ${response.status} - ${error}`);
	}

	const data = await response.json();
	return data.data;
}

/**
 * Update an existing dashboard
 */
async function updateDashboard(
	token: string,
	dashboardId: string,
	dashboardDef: Partial<DirectusDashboard>,
): Promise<DirectusDashboard> {
	const url = `${process.env.DIRECTUS_URL}/dashboards/${dashboardId}`;
	const response = await fetch(url, {
		method: 'PATCH',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(dashboardDef),
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Failed to update dashboard: ${response.status} - ${error}`);
	}

	const data = await response.json();
	return data.data;
}

/**
 * Fetch panels for a dashboard
 */
async function fetchPanels(token: string, dashboardId: string): Promise<DirectusPanel[]> {
	const url = `${process.env.DIRECTUS_URL}/panels?filter[dashboard][_eq]=${dashboardId}`;
	const response = await fetch(url, {
		headers: { Authorization: `Bearer ${token}` },
	});

	if (!response.ok) {
		throw new Error(`Failed to fetch panels: ${response.status} ${response.statusText}`);
	}

	const data = await response.json();
	return data.data || [];
}

/**
 * Create a new panel
 */
async function createPanel(token: string, panelDef: Partial<DirectusPanel>): Promise<DirectusPanel> {
	const url = `${process.env.DIRECTUS_URL}/panels`;
	const response = await fetch(url, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(panelDef),
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Failed to create panel: ${response.status} - ${error}`);
	}

	const data = await response.json();
	return data.data;
}

/**
 * Update an existing panel
 */
async function updatePanel(token: string, panelId: string, panelDef: Partial<DirectusPanel>): Promise<DirectusPanel> {
	const url = `${process.env.DIRECTUS_URL}/panels/${panelId}`;
	const response = await fetch(url, {
		method: 'PATCH',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(panelDef),
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Failed to update panel: ${response.status} - ${error}`);
	}

	const data = await response.json();
	return data.data;
}

/**
 * Delete a panel
 */
async function deletePanel(token: string, panelId: string): Promise<void> {
	const url = `${process.env.DIRECTUS_URL}/panels/${panelId}`;
	const response = await fetch(url, {
		method: 'DELETE',
		headers: { Authorization: `Bearer ${token}` },
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Failed to delete panel: ${response.status} - ${error}`);
	}
}

// ============================================================================
// Dashboard Setup Logic
// ============================================================================

/**
 * Ensure dashboard exists and is up to date
 */
async function ensureDashboard(token: string, dryRun: boolean): Promise<{ id: string; created: boolean }> {
	const existingDashboards = await fetchDashboards(token);
	const existing = existingDashboards.find((d) => d.name === DASHBOARD_DEF.name);

	if (existing) {
		console.log(`   ✓ Dashboard already exists (ID: ${existing.id})`);

		if (dryRun) {
			console.log(`   [DRY-RUN] Would update dashboard definition`);
			return { id: existing.id!, created: false };
		} else {
			await updateDashboard(token, existing.id!, DASHBOARD_DEF);
			console.log(`   ✅ Updated dashboard definition`);
			return { id: existing.id!, created: false };
		}
	} else {
		if (dryRun) {
			console.log(`   [DRY-RUN] Would create dashboard: ${DASHBOARD_DEF.name}`);
			return { id: 'dry-run-dashboard-id', created: true };
		} else {
			const newDashboard = await createDashboard(token, DASHBOARD_DEF);
			console.log(`   ✅ Created dashboard (ID: ${newDashboard.id})`);
			return { id: newDashboard.id!, created: true };
		}
	}
}

/**
 * Ensure all panels exist and are up to date
 */
async function ensurePanels(
	token: string,
	dashboardId: string,
	dryRun: boolean,
): Promise<{ created: number; updated: number }> {
	let createdCount = 0;
	let updatedCount = 0;

	// Fetch existing panels for this dashboard
	const existingPanels = dryRun ? [] : await fetchPanels(token, dashboardId);

	for (const panelDef of PANEL_DEFINITIONS) {
		const { key, ...panelData } = panelDef;
		const existing = existingPanels.find((p) => p.name === panelData.name);

		if (existing) {
			if (dryRun) {
				console.log(`   [DRY-RUN] Would update panel: ${panelData.name}`);
			} else {
				await updatePanel(token, existing.id!, {
					...panelData,
					dashboard: dashboardId,
				});
				console.log(`   ✅ Updated panel: ${panelData.name}`);
				updatedCount++;
			}
		} else {
			if (dryRun) {
				console.log(`   [DRY-RUN] Would create panel: ${panelData.name}`);
			} else {
				await createPanel(token, {
					...panelData,
					dashboard: dashboardId,
				});
				console.log(`   ✅ Created panel: ${panelData.name}`);
				createdCount++;
			}
		}
	}

	return { created: createdCount, updated: updatedCount };
}

// ============================================================================
// Main Setup Logic
// ============================================================================

async function setupDashboards(dryRun: boolean): Promise<DashboardResult> {
	const result: DashboardResult = {
		dashboardsCreated: [],
		dashboardsUpdated: [],
		panelsCreated: 0,
		panelsUpdated: 0,
		dryRun,
		errors: [],
	};

	try {
		// Step 1: Authenticate
		console.log('\n🔐 Step 1: Authenticating...');
		const token = await authenticate();

		// Step 2: Ensure dashboard exists
		console.log('\n📊 Step 2: Setting up Content Operations dashboard...');
		const { id: dashboardId, created } = await ensureDashboard(token, dryRun);

		if (created) {
			result.dashboardsCreated.push(DASHBOARD_DEF.name);
		} else {
			result.dashboardsUpdated.push(DASHBOARD_DEF.name);
		}

		// Step 3: Ensure all panels exist
		console.log('\n📋 Step 3: Setting up dashboard panels...');
		const { created: panelsCreated, updated: panelsUpdated } = await ensurePanels(token, dashboardId, dryRun);
		result.panelsCreated = panelsCreated;
		result.panelsUpdated = panelsUpdated;

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

function generateReport(result: DashboardResult): string {
	const timestamp = new Date().toISOString();
	const mode = result.dryRun ? 'DRY-RUN' : 'EXECUTE';

	let report = `# Task E1-03: Dashboard Creation Report

**Timestamp**: ${timestamp}
**Mode**: ${mode}

---

## Summary

- **Dashboards Created**: ${result.dashboardsCreated.length}
- **Dashboards Updated**: ${result.dashboardsUpdated.length}
- **Panels Created**: ${result.panelsCreated}
- **Panels Updated**: ${result.panelsUpdated}
- **Errors**: ${result.errors.length}

---

## Dashboard: Content Operations

**Purpose**: Operational visibility into content request queues and SLA metrics

### Panels Created

${PANEL_DEFINITIONS.map(
	(panel, idx) => `
${idx + 1}. **${panel.name}** (${panel.type})
   - Icon: ${panel.icon}
   - Position: (${panel.position_x}, ${panel.position_y})
   - Size: ${panel.width}x${panel.height}
   - Note: ${panel.note}
`,
).join('')}

---

## Verification Steps

See \`reports/E1-03_dashboards_execution.md\` for detailed verification instructions.

---
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
	console.log('║  Task E1-03: Create Directus Dashboards for Content Ops       ║');
	console.log('╚════════════════════════════════════════════════════════════════╝');

	// Validate environment
	validateEnvironment();

	// Parse arguments
	const { dryRun, execute } = parseArgs();
	const mode = dryRun ? 'DRY-RUN' : 'EXECUTE';
	console.log(`\n📋 Mode: ${mode}`);

	try {
		// Run setup
		const result = await setupDashboards(dryRun);

		// Print summary
		console.log('\n╔════════════════════════════════════════════════════════════════╗');
		console.log('║  Summary                                                       ║');
		console.log('╚════════════════════════════════════════════════════════════════╝');
		console.log(`Mode:                ${mode}`);
		console.log(`Dashboards created:  ${result.dashboardsCreated.length}`);
		console.log(`Dashboards updated:  ${result.dashboardsUpdated.length}`);
		console.log(`Panels created:      ${result.panelsCreated}`);
		console.log(`Panels updated:      ${result.panelsUpdated}`);
		console.log(`Errors:              ${result.errors.length}`);

		// Generate and save report
		const report = generateReport(result);
		const reportFilename = dryRun ? 'E1-03_dashboards_dry_run.md' : 'E1-03_dashboards_execution.md';
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
			console.log('\n✅ Dashboards created successfully!');
			console.log('\n📋 Next steps:');
			console.log('   1. Verify dashboard in Directus UI (Insights → Content Operations)');
			console.log('   2. Check panel data loads correctly');
			console.log('   3. Adjust filters if needed based on actual data');
			console.log('   4. Proceed to E1-04 (Nuxt Approval Desk UI)');
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
