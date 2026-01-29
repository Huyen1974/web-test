/**
 * E1: Sync Docs from GitHub via Agent Data API
 *
 * This script syncs documentation from GitHub (via Agent Data proxy)
 * into the Directus agent_views collection.
 *
 * Usage:
 *   npx tsx web/scripts/e1-sync-docs-from-github.ts
 *
 * Environment variables:
 *   NUXT_PUBLIC_DIRECTUS_URL - Directus URL
 *   DIRECTUS_ADMIN_EMAIL - Admin email for auth
 *   DIRECTUS_ADMIN_PASSWORD - Admin password for auth
 *
 * WEB-20 Phase 1B Implementation
 */

import { createDirectus, rest, authentication, readItems, createItem, updateItem } from '@directus/sdk';

// Configuration
const DIRECTUS_URL = process.env.NUXT_PUBLIC_DIRECTUS_URL || 'https://directus-test-pfne2mqwja-as.a.run.app';
const AGENT_DATA_URL = process.env.AGENT_DATA_URL || 'https://agent-data-test-pfne2mqwja-as.a.run.app';
const DIRECTUS_EMAIL = process.env.DIRECTUS_ADMIN_EMAIL || '';
const DIRECTUS_PASSWORD = process.env.DIRECTUS_ADMIN_PASSWORD || '';

// Types
interface TreeItem {
  name: string;
  path: string;
  type: string;
  sha: string;
  size?: number;
  source_id: string;
}

interface TreeResponse {
  ref: string;
  path: string;
  items: TreeItem[];
}

interface FileResponse {
  path: string;
  ref: string;
  sha: string;
  content: string;
  size?: number;
}

interface AgentViewItem {
  id?: number;
  source_id: string;
  permalink?: string;
  title?: string;
  content?: string;
  summary?: string;
  tags?: string[];
  is_global?: boolean;
  sha?: string;
  path?: string;
  doc_type?: string;
  last_synced?: string;
  status?: string;
}

// Stats tracking
const stats = {
  created: 0,
  updated: 0,
  skipped: 0,
  errors: 0,
};

/**
 * Extract title from markdown content
 */
function extractTitle(content: string, filename: string): string {
  // Try to find H1 heading
  const h1Match = content.match(/^#\s+(.+)$/m);
  if (h1Match) {
    return h1Match[1].trim();
  }
  // Fallback to filename without extension
  return filename.replace(/\.md$/, '').replace(/_/g, ' ');
}

/**
 * Extract summary from markdown content (first paragraph)
 */
function extractSummary(content: string): string {
  // Skip frontmatter if present
  let text = content;
  if (text.startsWith('---')) {
    const endFrontmatter = text.indexOf('---', 3);
    if (endFrontmatter > 0) {
      text = text.substring(endFrontmatter + 3).trim();
    }
  }

  // Skip H1 heading
  text = text.replace(/^#\s+.+$/m, '').trim();

  // Get first non-empty paragraph
  const paragraphs = text.split(/\n\n+/);
  for (const p of paragraphs) {
    const cleaned = p.trim();
    if (cleaned && !cleaned.startsWith('#') && !cleaned.startsWith('*') && !cleaned.startsWith('-')) {
      // Truncate to 500 chars
      return cleaned.length > 500 ? cleaned.substring(0, 497) + '...' : cleaned;
    }
  }

  return '';
}

/**
 * Generate permalink from source_id
 */
function generatePermalink(sourceId: string): string {
  // Remove .md extension and convert to URL-friendly format
  return '/docs/' + sourceId
    .replace(/\.md$/, '')
    .replace(/\s+/g, '-')
    .toLowerCase();
}

/**
 * Main sync function
 */
async function syncDocsToDirectus() {
  console.log('===========================================');
  console.log('E1: Sync Docs from GitHub to Directus');
  console.log('===========================================');
  console.log(`Directus URL: ${DIRECTUS_URL}`);
  console.log(`Agent Data URL: ${AGENT_DATA_URL}`);
  console.log('');

  // Initialize Directus client
  const directus = createDirectus(DIRECTUS_URL)
    .with(rest())
    .with(authentication());

  // Login to Directus
  console.log('Logging in to Directus...');
  try {
    await directus.login(DIRECTUS_EMAIL, DIRECTUS_PASSWORD);
    console.log('Login successful');
  } catch (error) {
    console.error('Failed to login to Directus:', error);
    process.exit(1);
  }

  // Get tree from Agent Data
  console.log('\nFetching docs tree from Agent Data...');
  let treeData: TreeResponse;
  try {
    const treeResponse = await fetch(`${AGENT_DATA_URL}/api/docs/tree?ref=main&path=docs/`);
    if (!treeResponse.ok) {
      throw new Error(`HTTP ${treeResponse.status}: ${await treeResponse.text()}`);
    }
    treeData = await treeResponse.json();
    console.log(`Found ${treeData.items.length} items in docs/`);
  } catch (error) {
    console.error('Failed to fetch docs tree:', error);
    process.exit(1);
  }

  // Get existing items from Directus
  console.log('\nFetching existing items from Directus...');
  let existingItems: AgentViewItem[] = [];
  try {
    existingItems = await directus.request(
      readItems('agent_views', {
        filter: { source_id: { _nnull: true } },
        limit: -1,
      })
    ) as AgentViewItem[];
    console.log(`Found ${existingItems.length} existing items`);
  } catch (error) {
    console.error('Failed to fetch existing items:', error);
    // Continue with empty list
  }

  const existingMap = new Map(existingItems.map(item => [item.source_id, item]));

  // Process each file
  console.log('\n--- Processing files ---\n');

  // First, process root level items
  await processItems(directus, treeData.items, existingMap);

  // Then, recursively process subdirectories
  const directories = treeData.items.filter(item => item.type === 'dir');
  for (const dir of directories) {
    console.log(`\nEntering directory: ${dir.path}`);
    try {
      const subTreeResponse = await fetch(`${AGENT_DATA_URL}/api/docs/tree?ref=main&path=${dir.path}/`);
      if (subTreeResponse.ok) {
        const subTreeData: TreeResponse = await subTreeResponse.json();
        await processItems(directus, subTreeData.items, existingMap);
      }
    } catch (error) {
      console.error(`Failed to fetch subdirectory ${dir.path}:`, error);
      stats.errors++;
    }
  }

  // Print summary
  console.log('\n===========================================');
  console.log('SYNC COMPLETE');
  console.log('===========================================');
  console.log(`Created:  ${stats.created}`);
  console.log(`Updated:  ${stats.updated}`);
  console.log(`Skipped:  ${stats.skipped}`);
  console.log(`Errors:   ${stats.errors}`);
  console.log(`Total:    ${stats.created + stats.updated + stats.skipped + stats.errors}`);
  console.log('===========================================');
}

/**
 * Process a list of tree items
 */
async function processItems(
  directus: ReturnType<typeof createDirectus>,
  items: TreeItem[],
  existingMap: Map<string, AgentViewItem>
) {
  for (const item of items) {
    // Skip directories (we'll process them separately)
    if (item.type === 'dir') continue;

    // Only process markdown files
    if (!item.name.endsWith('.md')) {
      console.log(`Skip (not .md): ${item.source_id}`);
      stats.skipped++;
      continue;
    }

    const sourceId = item.source_id;
    const existing = existingMap.get(sourceId);

    // Skip if SHA unchanged
    if (existing && existing.sha === item.sha) {
      console.log(`Skip (unchanged): ${sourceId}`);
      stats.skipped++;
      continue;
    }

    // Fetch file content
    let fileData: FileResponse;
    try {
      const fileResponse = await fetch(`${AGENT_DATA_URL}/api/docs/file?ref=main&path=${item.path}`);
      if (!fileResponse.ok) {
        throw new Error(`HTTP ${fileResponse.status}`);
      }
      fileData = await fileResponse.json();
    } catch (error) {
      console.error(`Error fetching ${item.path}:`, error);
      stats.errors++;
      continue;
    }

    // Build record
    const record: Partial<AgentViewItem> = {
      source_id: sourceId,
      title: extractTitle(fileData.content, item.name),
      content: fileData.content,
      summary: extractSummary(fileData.content),
      permalink: generatePermalink(sourceId),
      path: item.path,
      sha: item.sha,
      doc_type: 'file',
      last_synced: new Date().toISOString(),
      status: 'published',
    };

    try {
      if (existing) {
        console.log(`Update: ${sourceId}`);
        await directus.request(updateItem('agent_views', existing.id!, record));
        stats.updated++;
      } else {
        console.log(`Create: ${sourceId}`);
        await directus.request(createItem('agent_views', record as AgentViewItem));
        stats.created++;
      }
    } catch (error) {
      console.error(`Error saving ${sourceId}:`, error);
      stats.errors++;
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

// Run the sync
syncDocsToDirectus().catch(console.error);
