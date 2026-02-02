#!/usr/bin/env npx ts-node
/**
 * Migrate S6 Fields for Prompt Versioning (WEB-45C Part C)
 * Adds prompt_version, prompt_content, changes_summary fields to ai_discussion_comments
 *
 * Usage:
 *   npx ts-node scripts/migrate-s6-fields.ts
 *
 * Environment:
 *   DIRECTUS_URL - Directus instance URL
 *   DIRECTUS_ADMIN_TOKEN - Admin token for Directus
 */

const DIRECTUS_URL = process.env.DIRECTUS_URL || 'https://directus-test-pfne2mqwja-as.a.run.app';
const DIRECTUS_ADMIN_TOKEN = process.env.DIRECTUS_ADMIN_TOKEN || '';

const TARGET_COLLECTION = 'ai_discussion_comments';

interface FieldDefinition {
  field: string;
  type: string;
  schema: {
    default_value?: any;
    is_nullable: boolean;
    max_length?: number;
  };
  meta: {
    interface: string;
    display: string;
    note: string;
    width?: string;
    sort?: number;
  };
}

const S6_FIELDS: FieldDefinition[] = [
  {
    field: 'prompt_version',
    type: 'integer',
    schema: {
      default_value: 1,
      is_nullable: true
    },
    meta: {
      interface: 'input',
      display: 'raw',
      note: 'Version number cua prompt (1, 2, 3...)',
      width: 'half'
    }
  },
  {
    field: 'prompt_content',
    type: 'text',
    schema: {
      is_nullable: true
    },
    meta: {
      interface: 'input-multiline',
      display: 'raw',
      note: 'Full prompt tai thoi diem nay',
      width: 'full'
    }
  },
  {
    field: 'changes_summary',
    type: 'text',
    schema: {
      is_nullable: true
    },
    meta: {
      interface: 'input-multiline',
      display: 'raw',
      note: 'AI mo ta da sua gi so voi version truoc',
      width: 'full'
    }
  }
];

async function checkFieldExists(collection: string, field: string): Promise<boolean> {
  try {
    const response = await fetch(
      `${DIRECTUS_URL}/fields/${collection}/${field}`,
      {
        headers: {
          'Authorization': `Bearer ${DIRECTUS_ADMIN_TOKEN}`
        }
      }
    );

    return response.ok;
  } catch {
    return false;
  }
}

async function createField(collection: string, fieldDef: FieldDefinition): Promise<boolean> {
  try {
    const response = await fetch(`${DIRECTUS_URL}/fields/${collection}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DIRECTUS_ADMIN_TOKEN}`
      },
      body: JSON.stringify(fieldDef)
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`[ERROR] Failed to create field ${fieldDef.field}: ${response.status}`, error);
      return false;
    }

    console.log(`[OK] Created field: ${collection}.${fieldDef.field}`);
    return true;
  } catch (e) {
    console.error(`[ERROR] Exception creating field ${fieldDef.field}:`, e);
    return false;
  }
}

async function verifyCollectionExists(collection: string): Promise<boolean> {
  try {
    const response = await fetch(`${DIRECTUS_URL}/collections/${collection}`, {
      headers: {
        'Authorization': `Bearer ${DIRECTUS_ADMIN_TOKEN}`
      }
    });

    return response.ok;
  } catch {
    return false;
  }
}

async function main() {
  console.log('==========================================');
  console.log('  S6 Schema Migration Script (WEB-45C)');
  console.log('==========================================');
  console.log(`Directus URL: ${DIRECTUS_URL}`);
  console.log(`Target Collection: ${TARGET_COLLECTION}`);
  console.log(`Token: ${DIRECTUS_ADMIN_TOKEN ? '***' + DIRECTUS_ADMIN_TOKEN.slice(-4) : 'NOT SET'}`);

  if (!DIRECTUS_ADMIN_TOKEN) {
    console.error('\n[ERROR] DIRECTUS_ADMIN_TOKEN environment variable is required.');
    console.log('Usage: DIRECTUS_ADMIN_TOKEN=xxx npx ts-node scripts/migrate-s6-fields.ts');
    process.exit(1);
  }

  // Verify collection exists
  console.log(`\n[INFO] Verifying collection ${TARGET_COLLECTION} exists...`);
  const collectionExists = await verifyCollectionExists(TARGET_COLLECTION);
  if (!collectionExists) {
    console.error(`[FATAL] Collection ${TARGET_COLLECTION} does not exist. Please create it first.`);
    process.exit(1);
  }
  console.log(`[OK] Collection ${TARGET_COLLECTION} exists.`);

  // Migrate each field
  console.log('\n=== Migrating S6 Fields ===\n');

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const fieldDef of S6_FIELDS) {
    const exists = await checkFieldExists(TARGET_COLLECTION, fieldDef.field);

    if (exists) {
      console.log(`[SKIP] Field ${fieldDef.field} already exists.`);
      skipped++;
      continue;
    }

    const success = await createField(TARGET_COLLECTION, fieldDef);
    if (success) {
      created++;
    } else {
      failed++;
    }
  }

  // Summary
  console.log('\n=== Migration Summary ===');
  console.log(`Created: ${created}`);
  console.log(`Skipped (already exist): ${skipped}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    console.log('\n[WARNING] Some fields failed to create. Check errors above.');
    process.exit(1);
  }

  console.log('\n[DONE] S6 schema migration complete.');
}

main().catch(console.error);
