#!/usr/bin/env node
/**
 * trigger-gpt.js — Production-grade ChatGPT trigger via Playwright
 *
 * Self-healing, session-resilient, with retry logic and structured logging.
 * Default: HEADED mode (Cloudflare blocks headless).
 *
 * Usage:
 *   node trigger-gpt.js --setup                              # Interactive login
 *   node trigger-gpt.js --check                              # Verify session alive
 *   node trigger-gpt.js --prompt "message"                   # Send to default ChatGPT
 *   node trigger-gpt.js --prompt "msg" --url "https://..."   # Send to custom GPT
 *   node trigger-gpt.js --prompt "msg" --retry 3             # Custom retry count
 *   node trigger-gpt.js --prompt "msg" --timeout 180         # Custom timeout (seconds)
 *   node trigger-gpt.js --file prompt.md                     # Read prompt from file
 *   node trigger-gpt.js --prompt "msg" --headless            # Force headless (may fail)
 *
 * Exit codes:
 *   0 — Success
 *   1 — Unknown error
 *   2 — Session expired (run --setup)
 *   3 — Timeout (GPT did not respond)
 *   4 — Navigation failed (after all retries)
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { humanType, humanTypeContentEditable } = require('./lib/human-typer');
const config = require('./config');

// --- Constants ---
const SESSION_DIR = config.playwright.sessionsDir.gpt;
const BACKUP_BASE = path.join(path.dirname(SESSION_DIR), 'gpt-backup');
const LOG_DIR = config.logs.dir;
const SCREENSHOT_DIR = LOG_DIR;
const EXIT = { OK: 0, ERROR: 1, SESSION_EXPIRED: 2, TIMEOUT: 3, NAV_FAILED: 4 };
const MAX_BACKUPS = 3;

// --- Structured Logger ---
const LOG_FILE = path.join(LOG_DIR, `gpt-trigger-${new Date().toISOString().slice(0, 10)}.log`);

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
    prompt: null, file: null, url: null,
    retry: 3, timeout: 120,
  };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--setup') result.setup = true;
    else if (args[i] === '--check') result.check = true;
    else if (args[i] === '--headless') result.headless = true;
    else if (args[i] === '--prompt' && args[i + 1]) result.prompt = args[++i];
    else if (args[i] === '--file' && args[i + 1]) result.file = args[++i];
    else if (args[i] === '--url' && args[i + 1]) result.url = args[++i];
    else if (args[i] === '--retry' && args[i + 1]) result.retry = parseInt(args[++i], 10) || 3;
    else if (args[i] === '--timeout' && args[i + 1]) result.timeout = parseInt(args[++i], 10) || 120;
  }
  return result;
}

// --- Selectors (multiple fallbacks — GPT UI changes frequently) ---
const INPUT_SELECTORS = [
  '#prompt-textarea',
  'div[id="prompt-textarea"]',
  'textarea[data-id="root"]',
  'div[contenteditable="true"][data-placeholder]',
  'div.ProseMirror[contenteditable="true"]',
  'form textarea',
];

const SEND_BUTTON_SELECTORS = [
  'button[data-testid="send-button"]',
  'form button[aria-label="Send prompt"]',
  'button[aria-label="Send"]',
  'form button:has(svg)',
];

const LOADING_SELECTORS = [
  'button[data-testid="stop-button"]',
  'button[aria-label="Stop generating"]',
  'div.result-streaming',
];

const LOGGED_IN_SELECTORS = [
  '#prompt-textarea',
  'div[id="prompt-textarea"]',
  'div[contenteditable="true"][data-placeholder]',
];

const LOGGED_OUT_SELECTORS = [
  'button:has-text("Log in")',
  'a:has-text("Log in")',
  'button:has-text("Sign up")',
  'a:has-text("Sign up for free")',
];

const CONFIRM_SELECTORS = [
  'button:has-text("Confirm")',
  'button:has-text("Allow")',
  'button:has-text("Always allow")',
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
        // Brief wait for graceful shutdown
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
      .filter(d => d.startsWith('gpt-backup-'))
      .sort()
      .reverse();
    for (let i = MAX_BACKUPS; i < backups.length; i++) {
      fs.rmSync(path.join(parentDir, backups[i]), { recursive: true, force: true });
      L.info('SESSION', `Pruned old backup: ${backups[i]}`);
    }
  } catch { /* ignore */ }
}

// --- Element Finder with Logging ---
async function findElement(page, selectors, timeout = 10000) {
  for (const sel of selectors) {
    try {
      const el = await page.waitForSelector(sel, { timeout: 3000, state: 'visible' });
      if (el) return { element: el, selector: sel };
    } catch { /* next */ }
  }
  // Final attempt with full timeout on first selector
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

  // 404 detection
  const has404 = await page.$('text="404"');
  const hasNotFound = await page.$('text="Not Found"');
  if (has404 && hasNotFound) return '404';

  // Cloudflare detection
  const hasTurnstile = await page.$('iframe[src*="challenges.cloudflare.com"]');
  const hasVerify = await page.$('text=Verify you are human');
  if (hasTurnstile || hasVerify || url.includes('challenge')) return 'cloudflare';

  // Logged-out detection
  for (const sel of LOGGED_OUT_SELECTORS) {
    try {
      const el = await page.$(sel);
      if (el && await el.isVisible()) return 'logged_out';
    } catch { /* ignore */ }
  }

  // Logged-in detection
  for (const sel of LOGGED_IN_SELECTORS) {
    try {
      const el = await page.$(sel);
      if (el && await el.isVisible()) return 'ready';
    } catch { /* ignore */ }
  }

  return 'unknown';
}

// --- Cloudflare Wait ---
async function waitForCloudflare(page, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const state = await detectPageState(page);
    if (state !== 'cloudflare') return true;
    L.info('NAVIGATE', 'Waiting for Cloudflare challenge...');
    await page.waitForTimeout(2000);
  }
  return false;
}

// --- Navigation with Retry ---
async function navigateWithRetry(page, url, maxRetries = 3) {
  const delays = [5000, 15000, 30000];
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      L.info('NAVIGATE', `Attempt ${attempt}/${maxRetries}: ${url}`);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(3000);

      // Handle Cloudflare
      const cfOk = await waitForCloudflare(page, 15000);
      if (!cfOk) L.warn('NAVIGATE', 'Cloudflare did not resolve, continuing...');

      const state = await detectPageState(page);
      L.info('NAVIGATE', `Page state: ${state}`);

      if (state === '404' && url !== 'https://chatgpt.com') {
        L.warn('NAVIGATE', '404 on custom GPT URL — warming up via chatgpt.com');
        await page.goto('https://chatgpt.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(4000);
        const warmState = await detectPageState(page);
        if (warmState === 'logged_out') return 'logged_out';
        L.info('NAVIGATE', 'Warmup done, retrying custom GPT URL...');
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(3000);
        const retryState = await detectPageState(page);
        if (retryState === '404') {
          L.warn('NAVIGATE', 'Still 404 after warmup');
          if (attempt < maxRetries) continue;
          return '404';
        }
        return retryState;
      }

      if (state === 'logged_out') return 'logged_out';
      if (state === 'ready') return 'ready';
      if (state === 'unknown') {
        // Give it more time
        await page.waitForTimeout(3000);
        return await detectPageState(page);
      }
      return state;
    } catch (err) {
      L.warn('NAVIGATE', `Attempt ${attempt} failed: ${err.message}`);
      if (attempt < maxRetries) {
        const delay = delays[attempt - 1] || 30000;
        L.info('NAVIGATE', `Retrying in ${delay / 1000}s...`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  return 'nav_failed';
}

// --- Confirm/Deny Dialog Handler ---
async function handleConfirmDialog(page, timeoutMs = 5000) {
  for (const sel of CONFIRM_SELECTORS) {
    try {
      const btn = await page.waitForSelector(sel, { timeout: timeoutMs, state: 'visible' });
      if (btn) {
        await btn.click();
        L.info('SEND', `Auto-confirmed dialog: ${sel}`);
        await page.waitForTimeout(2000);
        return true;
      }
    } catch { /* not found */ }
  }
  return false;
}

// --- Response Wait ---
async function waitForResponse(page, timeoutMs = 120000) {
  L.info('WAIT', 'Waiting for GPT response...');
  const start = Date.now();
  await page.waitForTimeout(2000);

  while (Date.now() - start < timeoutMs) {
    // Check for Confirm dialog (GPT Actions first-time)
    for (const sel of CONFIRM_SELECTORS) {
      try {
        const btn = await page.$(sel);
        if (btn && await btn.isVisible()) {
          await btn.click();
          L.info('WAIT', `Auto-confirmed mid-response: ${sel}`);
          await page.waitForTimeout(2000);
        }
      } catch { /* ignore */ }
    }

    let isLoading = false;
    for (const sel of LOADING_SELECTORS) {
      try {
        const el = await page.$(sel);
        if (el && await el.isVisible()) { isLoading = true; break; }
      } catch { /* ignore */ }
    }
    if (!isLoading) {
      // Double-check after a brief pause
      await page.waitForTimeout(1500);
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

  // Ensure log directory exists
  fs.mkdirSync(LOG_DIR, { recursive: true });

  // Resolve prompt text
  let promptText = args.prompt;
  if (args.file) {
    if (!fs.existsSync(args.file)) {
      L.fatal('INIT', `File not found: ${args.file}`);
      process.exit(EXIT.ERROR);
    }
    promptText = fs.readFileSync(args.file, 'utf-8').trim();
  }

  // Validate arguments
  if (!args.setup && !args.check && !promptText) {
    console.log(`trigger-gpt.js — Production-grade ChatGPT trigger

Usage:
  node trigger-gpt.js --setup                              # Interactive login
  node trigger-gpt.js --check                              # Verify session alive
  node trigger-gpt.js --prompt "message"                   # Send to default ChatGPT
  node trigger-gpt.js --prompt "msg" --url "https://..."   # Send to custom GPT
  node trigger-gpt.js --prompt "msg" --retry 3             # Custom retry count
  node trigger-gpt.js --prompt "msg" --timeout 180         # Custom timeout (seconds)
  node trigger-gpt.js --file prompt.md                     # Read prompt from file

Exit codes: 0=success, 1=error, 2=session expired, 3=timeout, 4=nav failed`);
    process.exit(EXIT.ERROR);
  }

  const mode = args.setup ? 'setup' : args.check ? 'check' : 'trigger';
  L.info('INIT', `Mode: ${mode}, headless: ${args.headless}, retry: ${args.retry}, timeout: ${args.timeout}s`);
  if (promptText) L.info('INIT', `Prompt: ${promptText.slice(0, 100)}${promptText.length > 100 ? '...' : ''}`);
  if (args.url) L.info('INIT', `Target GPT: ${args.url}`);

  // Session preparation
  fs.mkdirSync(SESSION_DIR, { recursive: true });
  clearSingletonLock();
  if (mode !== 'setup') backupSession();

  // Launch browser
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
      L.info('SESSION', 'Navigating to chatgpt.com for login...');
      await page.goto('https://chatgpt.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(3000);

      L.info('SESSION', 'SETUP MODE: Please log in in the browser window (5 min timeout)');

      const deadline = Date.now() + 300000;
      let loggedIn = false;
      let lastLog = 0;

      while (Date.now() < deadline) {
        try {
          const url = page.url();
          if (!url.includes('chatgpt.com')) {
            if (Date.now() - lastLog > 10000) {
              L.info('SESSION', `Redirecting (${new URL(url).hostname})...`);
              lastLog = Date.now();
            }
            await page.waitForTimeout(3000);
            continue;
          }

          const state = await detectPageState(page);
          if (state === 'ready') { loggedIn = true; break; }
          await page.waitForTimeout(3000);
        } catch {
          await new Promise(r => setTimeout(r, 3000));
        }
      }

      if (loggedIn) {
        L.info('SESSION', 'Login detected! Saving session (90s)...');
        await page.waitForTimeout(90000);
        L.info('SESSION', `Session saved: ${SESSION_DIR}`);
      } else {
        await page.screenshot({ path: `${SCREENSHOT_DIR}/gpt-setup-timeout.png` });
        L.error('SESSION', 'Login not detected within 5 minutes');
      }

      await _context.close();
      _context = null;
      return;
    }

    // ── NAVIGATE ──
    const targetUrl = args.url || 'https://chatgpt.com';
    const navState = await navigateWithRetry(page, targetUrl, args.retry);

    if (navState === 'logged_out') {
      await page.screenshot({ path: `${SCREENSHOT_DIR}/gpt-session-expired.png` });
      L.error('SESSION', 'Session expired. Run: node trigger-gpt.js --setup');
      _exitCode = EXIT.SESSION_EXPIRED;
      await _context.close();
      _context = null;
      process.exit(EXIT.SESSION_EXPIRED);
    }

    if (navState === '404' || navState === 'nav_failed') {
      await page.screenshot({ path: `${SCREENSHOT_DIR}/gpt-nav-failed.png` });
      L.error('NAVIGATE', `Navigation failed: ${navState}. URL: ${targetUrl}`);
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
      await page.screenshot({ path: `${SCREENSHOT_DIR}/gpt-no-input.png` });
      L.error('TYPE', 'Cannot find chat input after all selectors');
      _exitCode = EXIT.ERROR;
      await _context.close();
      _context = null;
      process.exit(EXIT.ERROR);
    }

    const tagName = await input.element.evaluate(el => el.tagName.toLowerCase());
    const isContentEditable = await input.element.evaluate(el => el.contentEditable === 'true');
    L.info('TYPE', `Input: ${tagName}, contentEditable=${isContentEditable}, selector: ${input.selector}`);
    L.info('TYPE', `Typing prompt (${promptText.length} chars)...`);

    // ── TYPE MESSAGE ──
    if (isContentEditable) {
      await humanTypeContentEditable(page, input.selector, promptText);
    } else {
      await humanType(page, input.selector, promptText);
    }
    await page.waitForTimeout(500);

    // ── SEND ──
    L.info('SEND', 'Sending message (Enter)...');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    // Check if message was sent (loading indicator appeared)
    let sent = false;
    for (const sel of LOADING_SELECTORS) {
      try {
        const el = await page.$(sel);
        if (el) { sent = true; break; }
      } catch { /* ignore */ }
    }

    if (!sent) {
      // Try clicking send button
      const sendBtn = await findElement(page, SEND_BUTTON_SELECTORS, 5000);
      if (sendBtn) {
        await sendBtn.element.click();
        L.info('SEND', 'Clicked send button as fallback');
      } else {
        L.warn('SEND', 'No loading indicator and no send button found');
      }
    }

    // Check for Confirm/Deny dialog immediately
    await handleConfirmDialog(page, 5000);

    // ── WAIT FOR RESPONSE ──
    const responseOk = await waitForResponse(page, args.timeout * 1000);

    if (!responseOk) {
      await page.screenshot({ path: `${SCREENSHOT_DIR}/gpt-timeout.png` });
      L.warn('RESPONSE', `Timeout after ${args.timeout}s`);
      _exitCode = EXIT.TIMEOUT;
      await _context.close();
      _context = null;
      process.exit(EXIT.TIMEOUT);
    }

    // ── SUCCESS ──
    await page.screenshot({ path: `${SCREENSHOT_DIR}/gpt-triggered.png` });
    L.info('RESPONSE', 'GPT triggered successfully');
    L.info('RESPONSE', `Screenshot: ${SCREENSHOT_DIR}/gpt-triggered.png`);

  } catch (err) {
    L.error('RESPONSE', `Unexpected error: ${err.message}`);
    try { await page.screenshot({ path: `${SCREENSHOT_DIR}/gpt-error.png` }); } catch { /* ignore */ }
    _exitCode = EXIT.ERROR;
  }

  // ── CLEANUP ──
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
