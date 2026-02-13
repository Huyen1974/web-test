/**
 * config.js — Shared configuration for automation scripts
 */

module.exports = {
  // Agent Data endpoints
  agentData: {
    local: 'http://localhost:8000',
    vps: 'https://vps.incomexsaigoncorp.vn/api',
    // Default: VPS (production)
    default: process.env.AGENT_DATA_URL || 'https://vps.incomexsaigoncorp.vn/api',
  },

  // Directus endpoints
  directus: {
    local: 'http://localhost:8055',
    vps: 'https://directus.incomexsaigoncorp.vn',
    default: process.env.DIRECTUS_URL || 'https://directus.incomexsaigoncorp.vn',
  },

  // Playwright settings
  playwright: {
    sessionsDir: {
      gpt: require('path').join(process.env.HOME, '.playwright-sessions', 'gpt'),
      gemini: require('path').join(process.env.HOME, '.playwright-sessions', 'gemini'),
    },
    headed: true,   // Cloudflare blocks headless
    channel: 'chrome',
  },

  // Logs — persistent (survives reboot)
  logs: {
    dir: require('path').join(process.env.HOME, 'Documents', 'logs', 'automation'),
    gpt: require('path').join(process.env.HOME, 'Documents', 'logs', 'automation', 'trigger-gpt.log'),
    gemini: require('path').join(process.env.HOME, 'Documents', 'logs', 'automation', 'trigger-gemini.log'),
  },
};
