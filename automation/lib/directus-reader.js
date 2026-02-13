/**
 * directus-reader.js — Read tasks from Directus CMS (skeleton)
 *
 * NOTE: Collection `ai_tasks` does not exist yet on Directus.
 * This module is a prepared skeleton for when the schema is designed.
 * Currently all methods will return errors indicating the collection is missing.
 */

const https = require('https');
const http = require('http');
const config = require('../config');

const TOKEN = process.env.DIRECTUS_TOKEN || '';

function getBaseUrl() {
  return config.directus.default;
}

function headers() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${TOKEN}`,
  };
}

/**
 * Get queued tasks from ai_tasks collection.
 * @returns {Promise<Array>}
 */
async function getQueuedTasks() {
  const url = `${getBaseUrl()}/items/ai_tasks?filter[status][_eq]=queued&sort=-date_created`;
  const result = await doRequest(url, { headers: headers() });
  return result.data?.data || [];
}

/**
 * Get a single task by ID.
 * @param {string|number} id
 * @returns {Promise<object|null>}
 */
async function getTaskById(id) {
  const url = `${getBaseUrl()}/items/ai_tasks/${id}`;
  const result = await doRequest(url, { headers: headers() });
  return result.data?.data || null;
}

/**
 * Update task status.
 * @param {string|number} id
 * @param {string} status  e.g. "processing", "completed", "failed"
 * @param {object} [extra] Additional fields to patch
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function updateTaskStatus(id, status, extra = {}) {
  const url = `${getBaseUrl()}/items/ai_tasks/${id}`;
  const body = JSON.stringify({ status, ...extra });
  try {
    await doRequest(url, { method: 'PATCH', headers: headers(), body });
    return { success: true, message: `Task ${id} → ${status}` };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

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
          reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 200)}`));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Request timeout')); });
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

module.exports = { getQueuedTasks, getTaskById, updateTaskStatus };
