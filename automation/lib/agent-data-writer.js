/**
 * agent-data-writer.js — Write documents to Agent Data API (VPS or local)
 */

const https = require('https');
const http = require('http');
const config = require('../config');

const API_KEY = process.env.AGENT_DATA_API_KEY || '';

/**
 * Write (upsert) a document to Agent Data.
 *
 * @param {string} documentId  e.g. "knowledge/operations/test/file.md"
 * @param {string} content     Markdown content
 * @param {string} title       Document title
 * @param {object} [opts]
 * @param {string} [opts.endpoint]  Override base URL
 * @param {string} [opts.apiKey]    Override API key
 * @param {number} [opts.retries=2] Number of retries on failure
 * @returns {Promise<{success: boolean, message: string, id?: string}>}
 */
async function writeToAgentData(documentId, content, title, opts = {}) {
  const baseUrl = opts.endpoint || config.agentData.default;
  const apiKey = opts.apiKey || API_KEY;
  const maxRetries = opts.retries ?? 2;

  // Derive parent_id from document_id path
  const parts = documentId.split('/');
  const parentId = parts.length > 1 ? parts.slice(0, -1).join('/') : 'root';

  const body = JSON.stringify({
    document_id: documentId,
    parent_id: parentId,
    content: {
      mime_type: 'text/markdown',
      body: content,
    },
    metadata: {
      title,
      tags: opts.tags || [],
      source: 'playwright-automation',
    },
  });

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await doRequest(`${baseUrl}/documents?upsert=true`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body,
      });
      return { success: true, message: `OK (${result.statusCode})`, id: result.data?.id };
    } catch (err) {
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }
      return { success: false, message: `FAIL after ${maxRetries + 1} attempts: ${err.message}` };
    }
  }
}

/**
 * Delete a document from Agent Data.
 *
 * @param {string} documentId
 * @param {object} [opts]
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function deleteFromAgentData(documentId, opts = {}) {
  const baseUrl = opts.endpoint || config.agentData.default;
  const apiKey = opts.apiKey || API_KEY;
  const encoded = encodeURIComponent(documentId);

  try {
    const result = await doRequest(`${baseUrl}/documents/${encoded}`, {
      method: 'DELETE',
      headers: { 'x-api-key': apiKey },
    });
    return { success: true, message: `Deleted (${result.statusCode})` };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

function doRequest(url, opts) {
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
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Request timeout')); });
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

module.exports = { writeToAgentData, deleteFromAgentData };
