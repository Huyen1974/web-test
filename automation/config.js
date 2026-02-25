/**
 * config.js — Shared configuration for automation scripts
 *
 * Credentials: from env vars or credentials.local.json (gitignored).
 * NEVER hardcode tokens/passwords.
 */

const path = require('path');
const fs = require('fs');

// --- Load credentials.local.json (optional, gitignored) ---
let credentials = { profiles: [], defaultProfile: '', directusUrl: '', staticToken: '' };
const CRED_PATH = path.join(__dirname, '..', 'dot', 'config', 'credentials.local.json');
try {
  if (fs.existsSync(CRED_PATH)) {
    credentials = JSON.parse(fs.readFileSync(CRED_PATH, 'utf-8'));
  }
} catch { /* ignore — use env vars */ }

function getProfile(name) {
  return (credentials.profiles || []).find(p => p.name === name) || {};
}

const adminProfile = getProfile('test-admin');
const aiAgentProfile = getProfile('ai-agent');

module.exports = {
  // Agent Data endpoints
  agentData: {
    local: 'http://localhost:8000',
    vps: 'https://vps.incomexsaigoncorp.vn/api',
    default: process.env.AGENT_DATA_URL || 'https://vps.incomexsaigoncorp.vn/api',
  },

  // Directus endpoints (direct access — for admin operations like POST)
  directus: {
    local: 'http://localhost:8055',
    vps: 'https://directus.incomexsaigoncorp.vn',
    default: process.env.DIRECTUS_URL || credentials.directusUrl || 'https://directus.incomexsaigoncorp.vn',
    adminEmail: process.env.DIRECTUS_ADMIN_EMAIL || adminProfile.username || '',
    adminPassword: process.env.DIRECTUS_ADMIN_PASSWORD || adminProfile.password || '',
    aiAgentToken: process.env.DIRECTUS_AI_TOKEN || aiAgentProfile.staticToken || '',
  },

  // OPS Proxy (Directus CRUD for AI Agents — GET/PATCH for ai_tasks)
  ops: {
    vps: 'https://ops.incomexsaigoncorp.vn',
    default: process.env.OPS_URL || 'https://ops.incomexsaigoncorp.vn',
    apiKey: process.env.OPS_API_KEY || 'C38FE9FA-2BC6-4FBB-BA0C-981E8FB89450',
  },

  // Playwright settings
  playwright: {
    sessionsDir: {
      gpt: path.join(process.env.HOME, '.playwright-sessions', 'gpt'),
      gemini: path.join(process.env.HOME, '.playwright-sessions', 'gemini'),
    },
    headed: true,   // Cloudflare blocks headless
    channel: 'chrome',
  },

  // Orchestrator settings
  orchestrator: {
    pollIntervalMs: 30000,                 // 30s between polls
    watchdogIntervalMs: 5 * 60 * 1000,     // 5min watchdog interval
    stuckThresholdMs: 2 * 60 * 60 * 1000,  // 2h = stuck
    claudeTimeoutMs: 30 * 60 * 1000,       // 30min per Claude task
    claudeIdleTimeoutMs: 5 * 60 * 1000,    // 5min no output → kill (PS2)
    gptTimeoutSec: 180,                     // 3min GPT response timeout
    gptPollResultMs: 30 * 60 * 1000,        // 30min max poll for GPT result
    gptPollIntervalMs: 5 * 60 * 1000,       // 5min between GPT result polls
    gptUrl: process.env.GPT_URL || '',      // Custom GPT URL
    maxConcurrent: 1,                       // 1 task/agent/cycle (PS4)
    lockFile: path.join(process.env.HOME, '.orchestrator.lock'),
  },

  // Logs — persistent (survives reboot)
  logs: {
    dir: path.join(process.env.HOME, 'Documents', 'logs', 'automation'),
    gpt: path.join(process.env.HOME, 'Documents', 'logs', 'automation', 'trigger-gpt.log'),
    gemini: path.join(process.env.HOME, 'Documents', 'logs', 'automation', 'trigger-gemini.log'),
    orchestrator: path.join(process.env.HOME, 'Documents', 'logs', 'automation', 'orchestrator.log'),
  },
};
