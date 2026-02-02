#!/usr/bin/env npx ts-node
/**
 * Setup Directus Flows via API (WEB-45C Part B)
 * Creates E1: Auto-Activate Drafter flow without using Directus UI
 *
 * Usage:
 *   npx ts-node scripts/setup-directus-flows.ts
 *
 * Environment:
 *   DIRECTUS_URL - Directus instance URL
 *   DIRECTUS_ADMIN_TOKEN - Admin token for Directus
 */

const DIRECTUS_URL = process.env.DIRECTUS_URL || 'https://directus-test-pfne2mqwja-as.a.run.app';
const DIRECTUS_ADMIN_TOKEN = process.env.DIRECTUS_ADMIN_TOKEN || '';

interface FlowPayload {
  name: string;
  icon: string;
  color: string;
  status: 'active' | 'inactive';
  trigger: string;
  accountability: string;
  options: Record<string, any>;
}

interface OperationPayload {
  flow: string;
  name: string;
  key: string;
  type: string;
  position_x: number;
  position_y: number;
  options: Record<string, any>;
  resolve?: string;
  reject?: string;
}

async function createFlow(payload: FlowPayload): Promise<string | null> {
  try {
    const response = await fetch(`${DIRECTUS_URL}/flows`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DIRECTUS_ADMIN_TOKEN}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`[ERROR] Failed to create flow: ${response.status}`, error);
      return null;
    }

    const data = await response.json() as { data: { id: string } };
    console.log(`[OK] Created flow: ${payload.name} (ID: ${data.data.id})`);
    return data.data.id;
  } catch (e) {
    console.error(`[ERROR] Exception creating flow:`, e);
    return null;
  }
}

async function createOperation(payload: OperationPayload): Promise<string | null> {
  try {
    const response = await fetch(`${DIRECTUS_URL}/operations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DIRECTUS_ADMIN_TOKEN}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`[ERROR] Failed to create operation: ${response.status}`, error);
      return null;
    }

    const data = await response.json() as { data: { id: string } };
    console.log(`[OK] Created operation: ${payload.name} (ID: ${data.data.id})`);
    return data.data.id;
  } catch (e) {
    console.error(`[ERROR] Exception creating operation:`, e);
    return null;
  }
}

async function checkExistingFlow(name: string): Promise<string | null> {
  try {
    const response = await fetch(
      `${DIRECTUS_URL}/flows?filter[name][_eq]=${encodeURIComponent(name)}`,
      {
        headers: {
          'Authorization': `Bearer ${DIRECTUS_ADMIN_TOKEN}`
        }
      }
    );

    if (!response.ok) return null;

    const data = await response.json() as { data: Array<{ id: string }> };
    if (data.data && data.data.length > 0) {
      return data.data[0].id;
    }
    return null;
  } catch {
    return null;
  }
}

async function deleteFlow(flowId: string): Promise<boolean> {
  try {
    const response = await fetch(`${DIRECTUS_URL}/flows/${flowId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${DIRECTUS_ADMIN_TOKEN}`
      }
    });

    return response.ok;
  } catch {
    return false;
  }
}

async function setupAutoActivateDrafterFlow(): Promise<void> {
  console.log('\n=== Setting up E1: Auto-Activate Drafter Flow ===\n');

  // Check if flow already exists
  const existingFlowId = await checkExistingFlow('E1: Auto-Activate Drafter');
  if (existingFlowId) {
    console.log(`[INFO] Flow already exists (ID: ${existingFlowId}). Deleting and recreating...`);
    await deleteFlow(existingFlowId);
  }

  // Step 1: Create the flow
  const flowId = await createFlow({
    name: 'E1: Auto-Activate Drafter',
    icon: 'play_circle',
    color: '#10B981',
    status: 'active',
    trigger: 'event',
    accountability: 'all',
    options: {
      type: 'action',
      scope: ['items.create'],
      collections: ['ai_discussions']
    }
  });

  if (!flowId) {
    console.error('[FATAL] Could not create flow. Aborting.');
    process.exit(1);
  }

  // Step 2: Create Condition operation
  const conditionId = await createOperation({
    flow: flowId,
    name: 'Check Status is Drafting',
    key: 'check_status',
    type: 'condition',
    position_x: 20,
    position_y: 1,
    options: {
      filter: {
        _and: [
          { 'status': { '_eq': 'drafting' } }
        ]
      }
    }
  });

  if (!conditionId) {
    console.error('[FATAL] Could not create condition operation. Aborting.');
    process.exit(1);
  }

  // Step 3: Create Webhook operation (triggers when condition passes)
  const webhookId = await createOperation({
    flow: flowId,
    name: 'Trigger AI Drafter Webhook',
    key: 'trigger_drafter',
    type: 'request',
    position_x: 40,
    position_y: 1,
    options: {
      method: 'POST',
      url: '{{$trigger.payload.executor_ai_webhook}}',
      headers: [
        { header: 'Content-Type', value: 'application/json' }
      ],
      body: JSON.stringify({
        discussion_id: '{{$trigger.key}}',
        topic: '{{$trigger.payload.topic}}',
        round: '{{$trigger.payload.round}}',
        action: 'start_drafting'
      })
    },
    resolve: conditionId
  });

  if (!webhookId) {
    console.error('[ERROR] Could not create webhook operation.');
  }

  // Step 4: Create Log operation for failures
  const logFailId = await createOperation({
    flow: flowId,
    name: 'Log Skipped (Not Drafting)',
    key: 'log_skipped',
    type: 'log',
    position_x: 40,
    position_y: 20,
    options: {
      message: 'Discussion created but status is not "drafting". Skipping auto-trigger.'
    },
    reject: conditionId
  });

  console.log('\n=== Flow Setup Complete ===');
  console.log(`Flow ID: ${flowId}`);
  console.log(`Condition ID: ${conditionId}`);
  console.log(`Webhook ID: ${webhookId}`);
  console.log(`Log (Skip) ID: ${logFailId}`);
}

async function main() {
  console.log('======================================');
  console.log('  Directus Flow Setup Script (WEB-45C)');
  console.log('======================================');
  console.log(`Directus URL: ${DIRECTUS_URL}`);
  console.log(`Token: ${DIRECTUS_ADMIN_TOKEN ? '***' + DIRECTUS_ADMIN_TOKEN.slice(-4) : 'NOT SET'}`);

  if (!DIRECTUS_ADMIN_TOKEN) {
    console.error('\n[ERROR] DIRECTUS_ADMIN_TOKEN environment variable is required.');
    console.log('Usage: DIRECTUS_ADMIN_TOKEN=xxx npx ts-node scripts/setup-directus-flows.ts');
    process.exit(1);
  }

  await setupAutoActivateDrafterFlow();

  console.log('\n[DONE] All flows configured successfully.');
}

main().catch(console.error);
