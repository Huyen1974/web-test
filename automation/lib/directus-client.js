/**
 * directus-client.js — Directus ai_tasks API wrapper
 *
 * GET/PATCH: via OPS Proxy (ops.incomexsaigoncorp.vn) with X-API-Key
 * POST (createTask): via Directus direct with AI Agent static token
 *   (OPS proxy only allows GET/PATCH for ai_tasks)
 */

const https = require('https');
const http = require('http');
const config = require('../config');

// --- Auth headers ---

function opsHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-API-Key': config.ops.apiKey,
  };
}

function directusHeaders() {
  const token = config.directus.aiAgentToken;
  if (!token) throw new Error('No AI Agent token. Set DIRECTUS_AI_TOKEN or add ai-agent profile to credentials.local.json');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

// --- HTTP helper ---

function doRequest(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const transport = parsed.protocol === 'https:' ? https : http;
    const req = transport.request(parsed, {
      method: opts.method || 'GET',
      headers: opts.headers || {},
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve({ statusCode: res.statusCode, data: JSON.parse(data) }); }
          catch { resolve({ statusCode: res.statusCode, data }); }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 300)}`));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Request timeout')); });
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

// --- OPS Proxy reads ---

/**
 * Get all queued ai_tasks, oldest first.
 * @returns {Promise<Array>}
 */
async function getQueuedTasks() {
  const url = `${config.ops.default}/items/ai_tasks?filter[status][_eq]=queued&sort=date_created&limit=50`;
  const result = await doRequest(url, { headers: opsHeaders() });
  return result.data?.data || [];
}

/**
 * Get a single ai_task by ID.
 * @param {number} id
 * @returns {Promise<object|null>}
 */
async function getTaskById(id) {
  const url = `${config.ops.default}/items/ai_tasks/${id}`;
  const result = await doRequest(url, { headers: opsHeaders() });
  return result.data?.data || null;
}

/**
 * Update an ai_task (PATCH via OPS proxy).
 * @param {number} id
 * @param {object} fields
 * @returns {Promise<object>}
 */
async function updateTask(id, fields) {
  const url = `${config.ops.default}/items/ai_tasks/${id}`;
  const result = await doRequest(url, {
    method: 'PATCH',
    headers: opsHeaders(),
    body: JSON.stringify(fields),
  });
  return result.data?.data || null;
}

/**
 * Create an ai_task (POST via Directus direct — OPS proxy doesn't allow POST).
 * @param {object} data  Task fields
 * @returns {Promise<object>} Created task
 */
async function createTask(data) {
  const url = `${config.directus.default}/items/ai_tasks`;
  const result = await doRequest(url, {
    method: 'POST',
    headers: directusHeaders(),
    body: JSON.stringify(data),
  });
  return result.data?.data || null;
}

/**
 * Get stuck tasks: status IN (dispatched, in_progress) AND dispatched_at older than threshold.
 * @param {number} [thresholdMs]  Age in ms (default: 2 hours)
 * @returns {Promise<Array>}
 */
async function getStuckTasks(thresholdMs) {
  const threshold = thresholdMs || config.orchestrator.stuckThresholdMs;
  const cutoff = new Date(Date.now() - threshold).toISOString();

  // Directus filter: status in [dispatched, in_progress] AND dispatched_at < cutoff
  const filter = encodeURIComponent(JSON.stringify({
    _and: [
      { status: { _in: ['dispatched', 'in_progress'] } },
      { dispatched_at: { _lt: cutoff } },
    ],
  }));
  const url = `${config.ops.default}/items/ai_tasks?filter=${filter}&sort=date_created&limit=50`;
  const result = await doRequest(url, { headers: opsHeaders() });
  return result.data?.data || [];
}

/**
 * Get completed lead tasks without review_verdict.
 * @returns {Promise<Array>}
 */
async function getCompletedLeadTasks() {
  const filter = encodeURIComponent(JSON.stringify({
    _and: [
      { agent_role: { _eq: 'lead' } },
      { status: { _eq: 'completed' } },
      { review_verdict: { _null: true } },
    ],
  }));
  const url = `${config.ops.default}/items/ai_tasks?filter=${filter}&sort=date_created&limit=50`;
  const result = await doRequest(url, { headers: opsHeaders() });
  return result.data?.data || [];
}

/**
 * Check if a reviewer task already exists for a given task_id and round.
 * @param {number} taskId
 * @param {number} round
 * @returns {Promise<boolean>}
 */
async function hasReviewerTask(taskId, round) {
  const filter = encodeURIComponent(JSON.stringify({
    _and: [
      { task_id: { _eq: taskId } },
      { round: { _eq: round } },
      { agent_role: { _eq: 'reviewer' } },
    ],
  }));
  const url = `${config.ops.default}/items/ai_tasks?filter=${filter}&limit=1`;
  const result = await doRequest(url, { headers: opsHeaders() });
  return (result.data?.data || []).length > 0;
}

/**
 * Get parent task from tasks collection.
 * @param {number} taskId
 * @returns {Promise<object|null>}
 */
async function getParentTask(taskId) {
  const url = `${config.ops.default}/items/tasks/${taskId}`;
  const result = await doRequest(url, { headers: opsHeaders() });
  return result.data?.data || null;
}

/**
 * Health check — verify Directus is reachable.
 * @returns {Promise<boolean>}
 */
async function healthCheck() {
  try {
    const url = `${config.ops.default}/items/ai_tasks?limit=1`;
    await doRequest(url, { headers: opsHeaders() });
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  getQueuedTasks,
  getTaskById,
  updateTask,
  createTask,
  getStuckTasks,
  getCompletedLeadTasks,
  hasReviewerTask,
  getParentTask,
  healthCheck,
};
