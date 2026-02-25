/**
 * dispatcher-gpt.js — Dispatch ai_tasks to ChatGPT via trigger-gpt.js
 *
 * Reuses the existing trigger-gpt.js Playwright script.
 * GPT is fire-and-forget: we send the prompt with instructions to
 * self-report via OPS proxy. Then we poll ai_task status for up to 30min.
 */

const { spawn } = require('child_process');
const path = require('path');
const config = require('../config');
const directus = require('./directus-client');

const TRIGGER_SCRIPT = path.join(__dirname, '..', 'trigger-gpt.js');

/**
 * Dispatch a task to ChatGPT via trigger-gpt.js, then poll for GPT self-report.
 *
 * @param {object} aiTask  The ai_task record from Directus
 * @param {function} log   Logger: (level, phase, msg) => void
 * @returns {Promise<{success: boolean, output: string, exitCode: number}>}
 */
async function dispatch(aiTask, log) {
  const rawPrompt = aiTask.prompt_payload || '';
  if (!rawPrompt) {
    return { success: false, output: 'No prompt_payload', exitCode: -1 };
  }

  // Append self-report instructions for GPT
  const prompt = rawPrompt + `\n\nSau khi hoàn thành, ghi kết quả vào ai_tasks id=${aiTask.id} qua OPS Proxy (PATCH status=completed, result_summary=kết quả, completed_at=${new Date().toISOString().slice(0, 10)}).`;

  const timeoutSec = config.orchestrator.gptTimeoutSec;
  const gptUrl = config.orchestrator.gptUrl;

  // Step 1: Trigger GPT via Playwright
  log('info', 'GPT', `Triggering GPT for task ${aiTask.id}...`);
  const triggerResult = await triggerGpt(prompt, timeoutSec, gptUrl);

  if (!triggerResult.success) {
    return triggerResult;
  }

  log('info', 'GPT', `GPT triggered OK for task ${aiTask.id}, now polling for self-report...`);

  // Step 2: Poll ai_task status — GPT writes result via OPS proxy
  const pollResult = await pollForResult(aiTask.id, log);
  return pollResult;
}

/**
 * Trigger GPT via trigger-gpt.js child process.
 */
function triggerGpt(prompt, timeoutSec, gptUrl) {
  return new Promise((resolve) => {
    const args = [TRIGGER_SCRIPT, '--prompt', prompt, '--timeout', String(timeoutSec)];
    if (gptUrl) args.push('--url', gptUrl);

    let stdout = '';
    let stderr = '';
    let finished = false;

    const child = spawn('node', args, { stdio: ['pipe', 'pipe', 'pipe'] });
    child.stdout.on('data', (data) => { stdout += data.toString(); });
    child.stderr.on('data', (data) => { stderr += data.toString(); });

    // Hard timeout: trigger-gpt.js has its own, but add safety net
    const hardTimeoutMs = (timeoutSec + 60) * 1000;
    const timer = setTimeout(() => {
      if (!finished) {
        child.kill('SIGTERM');
        setTimeout(() => { try { child.kill('SIGKILL'); } catch { /* dead */ } }, 10000);
      }
    }, hardTimeoutMs);

    child.on('close', (code) => {
      finished = true;
      clearTimeout(timer);

      // Exit codes from trigger-gpt.js: 0=success, 1=error, 2=session expired, 3=timeout, 4=nav failed
      const statusMap = {
        0: 'GPT triggered successfully',
        2: 'GPT_SESSION_EXPIRED — run: node trigger-gpt.js --setup',
        3: 'GPT response timeout',
        4: 'GPT navigation failed',
      };

      resolve({
        success: code === 0,
        output: `${statusMap[code] || `GPT exit code: ${code}`}\n${stdout}`.trim(),
        exitCode: code ?? -1,
      });
    });

    child.on('error', (err) => {
      finished = true;
      clearTimeout(timer);
      resolve({ success: false, output: `Spawn error: ${err.message}`, exitCode: -1 });
    });
  });
}

/**
 * Poll ai_task status until GPT self-reports completion (or timeout).
 */
async function pollForResult(taskId, log) {
  const maxPollMs = config.orchestrator.gptPollResultMs;
  const pollInterval = config.orchestrator.gptPollIntervalMs;
  const startTime = Date.now();

  while (Date.now() - startTime < maxPollMs) {
    // Wait before polling
    await sleep(pollInterval);

    try {
      const task = await directus.getTaskById(taskId);
      if (!task) {
        log('error', 'GPT', `Task ${taskId} not found during poll`);
        return { success: false, output: 'Task disappeared during poll', exitCode: -1 };
      }

      if (task.status === 'completed') {
        log('info', 'GPT', `Task ${taskId}: GPT self-reported completion`);
        return {
          success: true,
          output: `GPT completed. Summary: ${(task.result_summary || '').slice(0, 1000)}`,
          exitCode: 0,
        };
      }

      if (task.status === 'failed') {
        log('warn', 'GPT', `Task ${taskId}: GPT self-reported failure`);
        return {
          success: false,
          output: `GPT reported failure. Summary: ${(task.result_summary || '').slice(0, 1000)}`,
          exitCode: 1,
        };
      }

      const elapsed = Math.round((Date.now() - startTime) / 1000);
      log('info', 'GPT', `Task ${taskId}: still ${task.status} after ${elapsed}s, polling...`);
    } catch (err) {
      log('error', 'GPT', `Poll error for task ${taskId}: ${err.message}`);
    }
  }

  // Timeout — GPT didn't self-report within 30 min
  log('warn', 'GPT', `Task ${taskId}: poll timeout after ${maxPollMs / 1000}s`);
  return {
    success: false,
    output: `GPT did not self-report within ${maxPollMs / 60000} minutes`,
    exitCode: -1,
  };
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * Check if GPT session is alive.
 * @returns {Promise<boolean>}
 */
async function checkSession() {
  return new Promise((resolve) => {
    const child = spawn('node', [TRIGGER_SCRIPT, '--check'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const timer = setTimeout(() => { child.kill('SIGTERM'); resolve(false); }, 30000);
    child.on('close', (code) => { clearTimeout(timer); resolve(code === 0); });
    child.on('error', () => { clearTimeout(timer); resolve(false); });
  });
}

module.exports = { dispatch, checkSession };
