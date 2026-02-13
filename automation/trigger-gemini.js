#!/usr/bin/env node
/**
 * trigger-gemini.js — Production-grade Google Gemini trigger via Playwright
 *
 * Self-healing, session-resilient, with retry logic and structured logging.
 * Default: HEADED mode (consistent with GPT trigger).
 *
 * Usage:
 *   node trigger-gemini.js --setup                              # Interactive login
 *   node trigger-gemini.js --check                              # Verify session alive
 *   node trigger-gemini.js --prompt "message"                   # Send to Gemini
 *   node trigger-gemini.js --prompt "msg" --retry 3             # Custom retry count
 *   node trigger-gemini.js --prompt "msg" --timeout 180         # Custom timeout (seconds)
 *   node trigger-gemini.js --file prompt.md                     # Read prompt from file
 *   node trigger-gemini.js --prompt "msg" --headless            # Force headless
 *
 * Exit codes:
 *   0 — Success
 *   1 — Unknown error
 *   2 — Session expired (run --setup)
 *   3 — Timeout (Gemini did not respond)
 *   4 — Navigation failed (after all retries)
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { humanType, humanTypeContentEditable } = require('./lib/human-typer');
const config = require('./config');

// --- Constants ---
const SESSION_DIR = config.playwright.sessionsDir.gemini;
const BACKUP_BASE = path.join(path.dirname(SESSION_DIR), 'gemini-backup');
const LOG_DIR = config.logs.dir;
const SCREENSHOT_DIR = LOG_DIR;
const EXIT = { OK: 0, ERROR: 1, SESSION_EXPIRED: 2, TIMEOUT: 3, NAV_FAILED: 4 };
const MAX_BACKUPS = 3;
const GEMINI_URL = 'https://gemini.google.com/app';

// --- Structured Logger ---
const LOG_FILE = path.join(LOG_DIR, `gemini-trigger-${new Date().toISOString().slice(0, 10)}.log`);

function log(level, phase, msg) {
  const ts = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const line = `[${ts}] [${level}] [${phase}] ${msg}`;
  console.log(line);
  try { fs.appendFileSync(LOG_FILE, line + '\n'); } catch { /* ignore */ }
}

const L = {
  info: (phase, msg) => log('INFO', phase, msg),
  warn: (phase, msg) => log('WARN', phase, msg),
  error: (phase, msg) => log('ERROR', phase, msg),
  fatal: (phase, msg) => log('FATAL', phase, msg),
};

// --- CLI Argument Parsing ---
function parseArgs() {
  const args = process.argv.slice(2);
  const result = {
    setup: false, check: false, headless: false,
    prompt: null, file: null,
    retry: 3, timeout: 120,
  };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--setup') result.setup = true;
    else if (args[i] === '--check') result.check = true;
    else if (args[i] === '--headless') result.headless = true;
    else if (args[i] === '--prompt' && args[i + 1]) result.prompt = args[++i];
    else if (args[i] === '--file' && args[i + 1]) result.file = args[++i];
    else if (args[i] === '--retry' && args[i + 1]) result.retry = parseInt(args[++i], 10) || 3;
    else if (args[i] === '--timeout' && args[i + 1]) result.timeout = parseInt(args[++i], 10) || 120;
  }
  return result;
}

// --- Selectors (Gemini UI) ---
const INPUT_SELECTORS = [
  'div.ql-editor[contenteditable="true"]',
  'rich-textarea div[contenteditable="true"]',
  'div[contenteditable="true"][aria-label*="prompt"]',
  'div[contenteditable="true"][aria-label*="Enter"]',
  '.text-input-field div[contenteditable="true"]',
  'div[contenteditable="true"][data-placeholder]',
  'textarea[aria-label*="prompt"]',
  'div.input-area div[contenteditable="true"]',
];

const SEND_BUTTON_SELECTORS = [
  'button[aria-label="Send message"]',
  'button[aria-label*="Send"]',
  'button.send-button',
  'button[mattooltip*="Send"]',
  'button[data-test-id="send-button"]',
  '.send-button-container button',
];

const LOADING_SELECTORS = [
  'button[aria-label="Stop response"]',
  'button[aria-label*="Stop"]',
  'mat-progress-bar',
  '.loading-indicator',
  '.response-streaming',
  'message-content .loading',
];

const LOGGED_IN_SELECTORS = [
  'div.ql-editor[contenteditable="true"]',
  'rich-textarea div[contenteditable="true"]',
  'div[contenteditable="true"][aria-label*="prompt"]',
  'div[contenteditable="true"][aria-label*="Enter"]',
  '.conversation-container',
];

const RESPONSE_SELECTORS = [
  'message-content.model-response-text',
  '.model-response-text .markdown',
  'model-response .response-content',
  '.response-container message-content',
  'message-content[data-message-author-role="model"]',
  '.conversation-turn:last-child .model-response-text',
];

// --- Session Management ---
function clearSingletonLock() {
  const lockPath = path.join(SESSION_DIR, 'SingletonLock');
  try {
    if (!fs.existsSync(lockPath)) return;
    // SingletonLock is a symlink like "hostname-PID" — extract PID
    const target = fs.readlinkSync(lockPath);
    const pidMatch = target.match(/-(\d+)$/);
    if (pidMatch) {
      const pid = parseInt(pidMatch[1], 10);
      try {
        process.kill(pid, 0); // check alive
        L.warn('SESSION', `Killing active Chrome (PID ${pid}) holding SingletonLock`);
        process.kill(pid, 'SIGTERM');
        const { execSync } = require('child_process');
        try { execSync(`sleep 2 && kill -0 ${pid} 2>/dev/null && kill -9 ${pid}`, { timeout: 5000 }); } catch { /* ok */ }
      } catch { /* process already dead */ }
    }
    fs.unlinkSync(lockPath);
    L.info('SESSION', 'Cleared SingletonLock');
  } catch { /* ignore */ }
}

function backupSession() {
  if (!fs.existsSync(SESSION_DIR)) return;
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupDir = `${BACKUP_BASE}-${ts}`;
  try {
    fs.cpSync(SESSION_DIR, backupDir, { recursive: true });
    L.info('SESSION', `Backup created: ${backupDir}`);
    pruneOldBackups();
  } catch (err) {
    L.warn('SESSION', `Backup failed: ${err.message}`);
  }
}

function pruneOldBackups() {
  try {
    const parentDir = path.dirname(SESSION_DIR);
    const backups = fs.readdirSync(parentDir)
      .filter(d => d.startsWith('gemini-backup-'))
      .sort()
      .reverse();
    for (let i = MAX_BACKUPS; i < backups.length; i++) {
      fs.rmSync(path.join(parentDir, backups[i]), { recursive: true, force: true });
      L.info('SESSION', `Pruned old backup: ${backups[i]}`);
    }
  } catch { /* ignore */ }
}

// --- Element Finder ---
async function findElement(page, selectors, timeout = 10000) {
  for (const sel of selectors) {
    try {
      const el = await page.waitForSelector(sel, { timeout: 3000, state: 'visible' });
      if (el) return { element: el, selector: sel };
    } catch { /* next */ }
  }
  try {
    const el = await page.waitForSelector(selectors[0], { timeout, state: 'visible' });
    return { element: el, selector: selectors[0] };
  } catch {
    return null;
  }
}

// --- Page State Detection ---
async function detectPageState(page) {
  const url = page.url();

  // Google login redirect
  if (url.includes('accounts.google.com')) return 'logged_out';

  // Logged-in check
  for (const sel of LOGGED_IN_SELECTORS) {
    try {
      const el = await page.$(sel);
      if (el && await el.isVisible()) return 'ready';
    } catch { /* ignore */ }
  }

  // Check for "Choose an account" picker
  const accountPicker = await page.$('div[data-identifier]');
  if (accountPicker) return 'account_picker';

  return 'unknown';
}

// --- Navigation with Retry ---
async function navigateWithRetry(page, maxRetries = 3) {
  const delays = [5000, 15000, 30000];
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      L.info('NAVIGATE', `Attempt ${attempt}/${maxRetries}: ${GEMINI_URL}`);
      await page.goto(GEMINI_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(3000);

      let state = await detectPageState(page);

      // Handle account picker
      if (state === 'account_picker') {
        L.info('NAVIGATE', 'Account picker detected, clicking first account...');
        const firstAccount = await page.$('div[data-identifier]');
        if (firstAccount) {
          await firstAccount.click();
          await page.waitForTimeout(3000);
          state = await detectPageState(page);
        }
      }

      L.info('NAVIGATE', `Page state: ${state}`);
      if (state === 'ready') return 'ready';
      if (state === 'logged_out') return 'logged_out';

      // Wait a bit more for slow page loads
      await page.waitForTimeout(5000);
      state = await detectPageState(page);
      if (state === 'ready') return state;

    } catch (err) {
      L.warn('NAVIGATE', `Attempt ${attempt} failed: ${err.message}`);
    }

    if (attempt < maxRetries) {
      const delay = delays[attempt - 1] || 30000;
      L.info('NAVIGATE', `Retrying in ${delay / 1000}s...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  return 'nav_failed';
}

// --- Response Scraping ---
async function scrapeResponse(page) {
  for (const sel of RESPONSE_SELECTORS) {
    try {
      const elements = await page.$$(sel);
      if (elements.length > 0) {
        const lastEl = elements[elements.length - 1];
        const text = await lastEl.innerText();
        if (text && text.trim().length > 0) {
          L.info('RESPONSE', `Scraped ${text.length} chars from: ${sel}`);
          return text.trim();
        }
      }
    } catch { /* next */ }
  }
  // Fallback
  try {
    const allMessages = await page.$$('message-content');
    if (allMessages.length > 0) {
      const text = await allMessages[allMessages.length - 1].innerText();
      if (text && text.trim().length > 0) return text.trim();
    }
  } catch { /* ignore */ }
  L.warn('RESPONSE', 'Could not scrape response text');
  return null;
}

// --- Response Wait ---
async function waitForResponse(page, timeoutMs = 120000) {
  L.info('WAIT', 'Waiting for Gemini response...');
  const start = Date.now();
  await page.waitForTimeout(3000);

  while (Date.now() - start < timeoutMs) {
    let isLoading = false;
    for (const sel of LOADING_SELECTORS) {
      try {
        const el = await page.$(sel);
        if (el && await el.isVisible()) { isLoading = true; break; }
      } catch { /* ignore */ }
    }
    if (!isLoading) {
      await page.waitForTimeout(2000);
      let stillLoading = false;
      for (const sel of LOADING_SELECTORS) {
        try {
          const el = await page.$(sel);
          if (el && await el.isVisible()) { stillLoading = true; break; }
        } catch { /* ignore */ }
      }
      if (!stillLoading) {
        const elapsed = ((Date.now() - start) / 1000).toFixed(1);
        L.info('WAIT', `Response complete (${elapsed}s)`);
        return true;
      }
    }
    await page.waitForTimeout(1000);
  }
  L.warn('WAIT', 'Response timeout reached');
  return false;
}

// --- Graceful Shutdown ---
let _context = null;
let _exitCode = EXIT.OK;

async function gracefulShutdown(reason) {
  L.info('CLEANUP', `Shutting down: ${reason}`);
  if (_context) {
    try { await _context.close(); } catch { /* ignore */ }
    _context = null;
    L.info('CLEANUP', 'Browser closed');
  }
}

process.on('SIGINT', async () => {
  await gracefulShutdown('SIGINT');
  process.exit(_exitCode);
});

process.on('SIGTERM', async () => {
  await gracefulShutdown('SIGTERM');
  process.exit(_exitCode);
});

process.on('uncaughtException', async (err) => {
  L.fatal('CLEANUP', `Uncaught exception: ${err.message}`);
  await gracefulShutdown('uncaughtException');
  process.exit(EXIT.ERROR);
});

// --- Main ---
async function run() {
  const startTime = Date.now();
  const args = parseArgs();

  fs.mkdirSync(LOG_DIR, { recursive: true });

  let promptText = args.prompt;
  if (args.file) {
    if (!fs.existsSync(args.file)) {
      L.fatal('INIT', `File not found: ${args.file}`);
      process.exit(EXIT.ERROR);
    }
    promptText = fs.readFileSync(args.file, 'utf-8').trim();
  }

  if (!args.setup && !args.check && !promptText) {
    console.log(`trigger-gemini.js — Production-grade Gemini trigger

Usage:
  node trigger-gemini.js --setup                  # Interactive login
  node trigger-gemini.js --check                  # Verify session alive
  node trigger-gemini.js --prompt "message"        # Send to Gemini
  node trigger-gemini.js --prompt "msg" --retry 3  # Custom retry count
  node trigger-gemini.js --prompt "msg" --timeout 180
  node trigger-gemini.js --file prompt.md

Exit codes: 0=success, 1=error, 2=session expired, 3=timeout, 4=nav failed`);
    process.exit(EXIT.ERROR);
  }

  const mode = args.setup ? 'setup' : args.check ? 'check' : 'trigger';
  L.info('INIT', `Mode: ${mode}, headless: ${args.headless}, retry: ${args.retry}, timeout: ${args.timeout}s`);
  if (promptText) L.info('INIT', `Prompt: ${promptText.slice(0, 100)}${promptText.length > 100 ? '...' : ''}`);

  fs.mkdirSync(SESSION_DIR, { recursive: true });
  clearSingletonLock();
  if (mode !== 'setup') backupSession();

  L.info('SESSION', 'Launching Chrome...');
  _context = await chromium.launchPersistentContext(SESSION_DIR, {
    headless: args.headless,
    channel: 'chrome',
    viewport: { width: 1280, height: 900 },
    locale: 'en-US',
    timezoneId: 'Asia/Ho_Chi_Minh',
    args: ['--disable-blink-features=AutomationControlled'],
  });

  const page = _context.pages()[0] || await _context.newPage();

  try {
    // ── SETUP MODE ──
    if (mode === 'setup') {
      L.info('SESSION', 'Navigating to Gemini for login...');
      await page.goto(GEMINI_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(3000);
      L.info('SESSION', 'SETUP MODE: Please log in in the browser window (5 min timeout)');

      const loginResult = await findElement(page, LOGGED_IN_SELECTORS, 300000);
      if (loginResult) {
        L.info('SESSION', 'Login detected! Session saved.');
        await page.waitForTimeout(3000);
      } else {
        L.error('SESSION', 'Login not detected within 5 minutes');
      }
      await _context.close();
      _context = null;
      return;
    }

    // ── NAVIGATE ──
    const navState = await navigateWithRetry(page, args.retry);

    if (navState === 'logged_out') {
      await page.screenshot({ path: `${SCREENSHOT_DIR}/gemini-session-expired.png` });
      L.error('SESSION', 'Session expired. Run: node trigger-gemini.js --setup');
      _exitCode = EXIT.SESSION_EXPIRED;
      await _context.close();
      _context = null;
      process.exit(EXIT.SESSION_EXPIRED);
    }

    if (navState === 'nav_failed') {
      await page.screenshot({ path: `${SCREENSHOT_DIR}/gemini-nav-failed.png` });
      L.error('NAVIGATE', 'Navigation failed after all retries');
      _exitCode = EXIT.NAV_FAILED;
      await _context.close();
      _context = null;
      process.exit(EXIT.NAV_FAILED);
    }

    L.info('NAVIGATE', 'Page ready');

    // ── CHECK MODE ──
    if (mode === 'check') {
      L.info('SESSION', 'Session check: ALIVE');
      await _context.close();
      _context = null;
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      L.info('CLEANUP', `Done (${duration}s) — exit 0`);
      return;
    }

    // ── FIND INPUT ──
    const input = await findElement(page, INPUT_SELECTORS, 15000);
    if (!input) {
      await page.screenshot({ path: `${SCREENSHOT_DIR}/gemini-no-input.png` });
      L.error('TYPE', 'Cannot find chat input');
      _exitCode = EXIT.ERROR;
      await _context.close();
      _context = null;
      process.exit(EXIT.ERROR);
    }

    const tagName = await input.element.evaluate(el => el.tagName.toLowerCase());
    const isContentEditable = await input.element.evaluate(el => el.contentEditable === 'true');
    L.info('TYPE', `Input: ${tagName}, contentEditable=${isContentEditable}, selector: ${input.selector}`);
    L.info('TYPE', `Typing prompt (${promptText.length} chars)...`);

    if (isContentEditable) {
      await humanTypeContentEditable(page, input.selector, promptText);
    } else {
      await humanType(page, input.selector, promptText);
    }
    await page.waitForTimeout(500);

    // ── SEND ──
    L.info('SEND', 'Sending message (Enter)...');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    let sent = false;
    for (const sel of LOADING_SELECTORS) {
      try {
        const el = await page.$(sel);
        if (el) { sent = true; break; }
      } catch { /* ignore */ }
    }

    if (!sent) {
      const sendBtn = await findElement(page, SEND_BUTTON_SELECTORS, 5000);
      if (sendBtn) {
        await sendBtn.element.click();
        L.info('SEND', 'Clicked send button as fallback');
      }
    }

    // ── WAIT FOR RESPONSE ──
    const responseOk = await waitForResponse(page, args.timeout * 1000);

    if (!responseOk) {
      await page.screenshot({ path: `${SCREENSHOT_DIR}/gemini-timeout.png` });
      L.warn('RESPONSE', `Timeout after ${args.timeout}s`);
      _exitCode = EXIT.TIMEOUT;
      await _context.close();
      _context = null;
      process.exit(EXIT.TIMEOUT);
    }

    // ── SCRAPE RESPONSE ──
    const responseText = await scrapeResponse(page);
    if (responseText) {
      const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const outFile = `${SCREENSHOT_DIR}/gemini-response-${ts}.md`;
      fs.writeFileSync(outFile, responseText);
      L.info('RESPONSE', `Response saved: ${outFile}`);
      L.info('RESPONSE', `Preview: ${responseText.slice(0, 200)}${responseText.length > 200 ? '...' : ''}`);
    }

    // ── SUCCESS ──
    await page.screenshot({ path: `${SCREENSHOT_DIR}/gemini-triggered.png` });
    L.info('RESPONSE', 'Gemini triggered successfully');

  } catch (err) {
    L.error('RESPONSE', `Unexpected error: ${err.message}`);
    try { await page.screenshot({ path: `${SCREENSHOT_DIR}/gemini-error.png` }); } catch { /* ignore */ }
    _exitCode = EXIT.ERROR;
  }

  if (_context) {
    await _context.close();
    _context = null;
  }
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  L.info('CLEANUP', `Done (${duration}s) — exit ${_exitCode}`);
  process.exit(_exitCode);
}

run().catch(async (err) => {
  L.fatal('CLEANUP', `Fatal: ${err.message}`);
  await gracefulShutdown('fatal error');
  process.exit(EXIT.ERROR);
});
