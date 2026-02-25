#!/usr/bin/env node
/**
 * orchestrator.js — AI Task Automation Loop (WEB-81B+)
 *
 * Polls Directus ai_tasks collection for queued work, dispatches to
 * Claude Code CLI or ChatGPT, handles reviewer creation and watchdog.
 *
 * Usage:
 *   node orchestrator.js                     # Run continuous loop
 *   node orchestrator.js --once              # Single poll cycle, then exit
 *   node orchestrator.js --dry-run           # Poll and log, no dispatch
 *   node orchestrator.js --watch-only        # Only run watchdog + reviewer checks
 *   node orchestrator.js --once --dry-run    # Single dry-run cycle
 *
 * Environment:
 *   OPS_API_KEY              Override OPS proxy API key
 *   OPS_URL                  Override OPS proxy base URL
 *   GPT_URL                  Custom GPT URL for dispatch
 *   DIRECTUS_AI_TOKEN        Override AI Agent static token
 *   ORCHESTRATOR_LOG         Override log file path
 *
 * Exit codes:
 *   0 — Normal exit (--once completed, or SIGINT/SIGTERM)
 *   1 — Fatal error
 */

const fs = require('fs');
const path = require('path');
const config = require('./config');
const directus = require('./lib/directus-client');
const poller = require('./lib/poller');
const claudeDispatcher = require('./lib/dispatcher-claude');
const gptDispatcher = require('./lib/dispatcher-gpt');
const reviewerCreator = require('./lib/reviewer-creator');
const watchdog = require('./lib/watchdog');

// --- CLI Argument Parsing ---
function parseArgs() {
  const args = process.argv.slice(2);
  return {
    once: args.includes('--once'),
    dryRun: args.includes('--dry-run'),
    watchOnly: args.includes('--watch-only'),
  };
}

// --- Logger ---
const LOG_DIR = config.logs.dir;
const LOG_FILE = process.env.ORCHESTRATOR_LOG || config.logs.orchestrator;

function ensureLogDir() {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

function log(level, phase, msg) {
  const ts = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const line = `[${ts}] [${level.toUpperCase()}] [${phase}] ${msg}`;
  console.log(line);
  try { fs.appendFileSync(LOG_FILE, line + '\n'); } catch { /* ignore */ }
}

// --- Lock File (prevent concurrent orchestrators) ---
function acquireLock() {
  const lockFile = config.orchestrator.lockFile;
  try {
    if (fs.existsSync(lockFile)) {
      const pidStr = fs.readFileSync(lockFile, 'utf-8').trim();
      const pid = parseInt(pidStr, 10);
      if (pid && isProcessAlive(pid)) {
        log('error', 'INIT', `Another orchestrator is running (PID ${pid}). Lock: ${lockFile}`);
        return false;
      }
      log('warn', 'INIT', `Removing stale lock (PID ${pidStr} not alive)`);
      fs.unlinkSync(lockFile);
    }
    fs.writeFileSync(lockFile, String(process.pid));
    return true;
  } catch (err) {
    log('error', 'INIT', `Lock error: ${err.message}`);
    return false;
  }
}

function releaseLock() {
  try { fs.unlinkSync(config.orchestrator.lockFile); } catch { /* ignore */ }
}

function isProcessAlive(pid) {
  try { process.kill(pid, 0); return true; } catch { return false; }
}

// --- Startup Verification ---
async function verifyConnections() {
  log('info', 'INIT', 'Verifying connections...');

  // 1. Directus health
  const directusOk = await directus.healthCheck();
  if (!directusOk) {
    log('error', 'INIT', 'Directus/OPS proxy unreachable');
    return false;
  }
  log('info', 'INIT', 'Directus: OK');

  // 2. Claude Code CLI available
  try {
    const { execSync } = require('child_process');
    execSync('which claude', { timeout: 5000 });
    log('info', 'INIT', 'Claude Code CLI: OK');
  } catch {
    log('warn', 'INIT', 'Claude Code CLI not found — claude tasks will fail');
  }

  // 3. Playwright/trigger-gpt.js exists
  const triggerPath = path.join(__dirname, 'trigger-gpt.js');
  if (fs.existsSync(triggerPath)) {
    log('info', 'INIT', 'trigger-gpt.js: OK');
  } else {
    log('warn', 'INIT', 'trigger-gpt.js not found — GPT tasks will fail');
  }

  return true;
}

// --- Dispatch Logic ---
async function dispatchTask(aiTask, dryRun) {
  const agent = aiTask.assigned_agent; // 'claude', 'claude_code', 'gpt'
  const taskLabel = `ai_task#${aiTask.id} (${aiTask.name || 'unnamed'}, agent=${agent}, role=${aiTask.agent_role})`;

  log('info', 'DISPATCH', `Processing ${taskLabel}`);

  if (dryRun) {
    log('info', 'DISPATCH', `[DRY-RUN] Would dispatch ${taskLabel}`);
    return;
  }

  // Mark as dispatched
  try {
    await directus.updateTask(aiTask.id, {
      status: 'dispatched',
      dispatched_at: new Date().toISOString(),
    });
    log('info', 'DISPATCH', `Marked #${aiTask.id} → dispatched`);
  } catch (err) {
    log('error', 'DISPATCH', `Failed to mark #${aiTask.id} dispatched: ${err.message}`);
    return;
  }

  // Dispatch to the appropriate agent
  let result;
  const isClaude = agent === 'claude' || agent === 'claude_code';
  const isGpt = agent === 'gpt';

  try {
    if (isClaude) {
      result = await claudeDispatcher.dispatch(aiTask, log);
    } else if (isGpt) {
      result = await gptDispatcher.dispatch(aiTask, log);
    } else {
      log('error', 'DISPATCH', `Unknown agent "${agent}" for task #${aiTask.id}`);
      await safeUpdate(aiTask.id, {
        status: 'failed',
        result_summary: `Unknown agent: ${agent}`,
        completed_at: new Date().toISOString(),
      });
      return;
    }
  } catch (err) {
    log('error', 'DISPATCH', `Dispatch crashed for #${aiTask.id}: ${err.message}`);
    await safeUpdate(aiTask.id, {
      status: 'failed',
      result_summary: `Dispatch error: ${err.message}`,
      completed_at: new Date().toISOString(),
    });
    return;
  }

  // Process result
  log('info', 'DISPATCH', `${taskLabel} finished: success=${result.success}, exit=${result.exitCode}`);
  if (result.output) {
    log('info', 'DISPATCH', `Output (first 500): ${result.output.slice(0, 500)}`);
  }

  if (isClaude) {
    // Claude writes results directly — update ai_task
    if (result.success) {
      await safeUpdate(aiTask.id, {
        status: 'completed',
        result_summary: truncate(result.output, 10000),
        result_evidence: 'Claude Code CLI output',
        completed_at: new Date().toISOString(),
      });
    } else {
      const retryCount = (aiTask.retry_count || 0) + 1;
      const maxRetries = aiTask.max_retries || 3;
      if (retryCount < maxRetries) {
        await safeUpdate(aiTask.id, {
          status: 'queued',
          retry_count: retryCount,
          result_summary: `Retry ${retryCount}/${maxRetries}: ${truncate(result.output, 3000)}`,
        });
        log('warn', 'DISPATCH', `Task #${aiTask.id} failed — queued for retry ${retryCount}/${maxRetries}`);
      } else {
        await safeUpdate(aiTask.id, {
          status: 'failed',
          result_summary: truncate(result.output, 10000),
          result_evidence: 'Claude Code CLI output',
          retry_count: retryCount,
          completed_at: new Date().toISOString(),
        });
      }
    }
  } else if (isGpt) {
    // GPT self-reports via OPS proxy. dispatcher-gpt already polls for result.
    // If dispatch itself failed (session expired, nav failed, poll timeout):
    if (!result.success) {
      if (result.exitCode === 2) {
        // Session expired — don't retry
        await safeUpdate(aiTask.id, {
          status: 'failed',
          result_summary: 'GPT_SESSION_EXPIRED — run: node trigger-gpt.js --setup',
          completed_at: new Date().toISOString(),
        });
        log('error', 'DISPATCH', `GPT session expired for task #${aiTask.id}`);
      } else {
        const retryCount = (aiTask.retry_count || 0) + 1;
        const maxRetries = aiTask.max_retries || 3;
        if (retryCount < maxRetries) {
          await safeUpdate(aiTask.id, {
            status: 'queued',
            retry_count: retryCount,
            result_summary: `GPT retry ${retryCount}/${maxRetries}: ${truncate(result.output, 3000)}`,
          });
          log('warn', 'DISPATCH', `GPT task #${aiTask.id} failed — retry ${retryCount}/${maxRetries}`);
        } else {
          await safeUpdate(aiTask.id, {
            status: 'failed',
            result_summary: truncate(result.output, 10000),
            retry_count: retryCount,
            completed_at: new Date().toISOString(),
          });
        }
      }
    }
    // If success → GPT already self-reported, dispatcher-gpt confirmed it
  }
}

async function safeUpdate(id, fields) {
  try {
    await directus.updateTask(id, fields);
  } catch (err) {
    log('error', 'UPDATE', `Failed to update ai_task #${id}: ${err.message}`);
  }
}

function truncate(str, maxLen) {
  if (!str) return '';
  return str.length > maxLen ? str.slice(0, maxLen) + '...(truncated)' : str;
}

// --- Main Loop ---
let lastWatchdogRun = 0;

async function runCycle(opts) {
  const { dryRun, watchOnly } = opts;
  const now = Date.now();

  // Watchdog: runs every 5 minutes (not every cycle)
  if (now - lastWatchdogRun >= config.orchestrator.watchdogIntervalMs) {
    lastWatchdogRun = now;

    try {
      const wd = await watchdog.checkStuckTasks(log);
      if (wd.retried || wd.failed) {
        log('info', 'CYCLE', `Watchdog: ${wd.retried} retried, ${wd.failed} failed`);
      }
    } catch (err) {
      log('error', 'CYCLE', `Watchdog error: ${err.message}`);
    }

    try {
      const created = await reviewerCreator.createMissingReviewers(log);
      if (created) {
        log('info', 'CYCLE', `Reviewer: ${created} task(s) created`);
      }
    } catch (err) {
      log('error', 'CYCLE', `Reviewer error: ${err.message}`);
    }
  }

  if (watchOnly) return;

  // Poll for queued tasks
  const queued = await poller.getQueuedTasks(log);
  if (queued.length === 0) return;

  // V1: dispatch one task per cycle (PS4 — 1 task/agent/cycle)
  const task = queued[0];
  await dispatchTask(task, dryRun);
}

// --- Graceful Shutdown ---
let running = true;

async function shutdown(signal) {
  log('info', 'SHUTDOWN', `Received ${signal}, shutting down...`);
  running = false;
  releaseLock();
}

process.on('SIGINT', () => shutdown('SIGINT').then(() => process.exit(0)));
process.on('SIGTERM', () => shutdown('SIGTERM').then(() => process.exit(0)));

// --- Entry Point ---
async function main() {
  ensureLogDir();

  const opts = parseArgs();
  const modeStr = [
    opts.once && '--once',
    opts.dryRun && '--dry-run',
    opts.watchOnly && '--watch-only',
  ].filter(Boolean).join(' ') || 'continuous';

  log('info', 'INIT', `Orchestrator starting (${modeStr})`);
  log('info', 'INIT', `OPS URL: ${config.ops.default}`);
  log('info', 'INIT', `Directus URL: ${config.directus.default}`);
  log('info', 'INIT', `Poll interval: ${config.orchestrator.pollIntervalMs / 1000}s`);
  log('info', 'INIT', `Watchdog interval: ${config.orchestrator.watchdogIntervalMs / 1000}s`);
  log('info', 'INIT', `Stuck threshold: ${config.orchestrator.stuckThresholdMs / 1000}s`);

  // Startup verification
  const ok = await verifyConnections();
  if (!ok) {
    log('error', 'INIT', 'Startup verification failed');
    process.exit(1);
  }

  // Acquire lock
  if (!acquireLock()) {
    process.exit(1);
  }

  // Force first watchdog run
  lastWatchdogRun = 0;

  try {
    if (opts.once) {
      await runCycle(opts);
      log('info', 'DONE', 'Single cycle complete');
    } else {
      while (running) {
        await runCycle(opts);
        if (!running) break;
        await interruptibleSleep(config.orchestrator.pollIntervalMs);
      }
      log('info', 'DONE', 'Loop ended');
    }
  } catch (err) {
    log('error', 'FATAL', `Unhandled error: ${err.message}\n${err.stack}`);
    process.exit(1);
  } finally {
    releaseLock();
  }
}

function interruptibleSleep(ms) {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    const check = setInterval(() => {
      if (!running) { clearTimeout(timer); clearInterval(check); resolve(); }
    }, 500);
  });
}

main();
