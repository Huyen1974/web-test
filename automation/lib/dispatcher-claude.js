/**
 * dispatcher-claude.js — Dispatch ai_tasks to Claude Code CLI
 *
 * Spawns `claude -p "{prompt}" --dangerously-skip-permissions`
 * Captures stdout as the result.
 * Idle detection: kills process if no output for 5 minutes (PS2).
 */

const { spawn } = require('child_process');
const config = require('../config');

/**
 * Dispatch a task to Claude Code CLI.
 *
 * @param {object} aiTask  The ai_task record from Directus
 * @param {function} log   Logger: (level, phase, msg) => void
 * @returns {Promise<{success: boolean, output: string, exitCode: number}>}
 */
async function dispatch(aiTask, log) {
  let prompt = aiTask.prompt_payload || '';
  if (!prompt) {
    return { success: false, output: 'No prompt_payload', exitCode: -1 };
  }

  // Append instruction to avoid permission prompts (PS2)
  prompt += '\n\nKHÔNG tạo/sửa file nào yêu cầu xác nhận thêm.';

  const timeoutMs = config.orchestrator.claudeTimeoutMs;
  const idleTimeoutMs = config.orchestrator.claudeIdleTimeoutMs;

  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let finished = false;
    let timedOut = false;
    let idleTimedOut = false;
    let lastOutputTime = Date.now();

    const child = spawn('claude', [
      '-p',
      '--output-format', 'text',
      '--dangerously-skip-permissions',
    ], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, CLAUDECODE: '' }, // Unset to allow nested launch
    });

    child.stdout.on('data', (data) => {
      stdout += data.toString();
      lastOutputTime = Date.now();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
      lastOutputTime = Date.now();
    });

    // Send prompt via stdin (avoid shell escaping + argument length limits)
    child.stdin.write(prompt);
    child.stdin.end();

    // Absolute timeout (30 min)
    const absTimer = setTimeout(() => {
      if (!finished) {
        timedOut = true;
        log('warn', 'CLAUDE', `Task ${aiTask.id}: absolute timeout (${timeoutMs / 1000}s), killing`);
        child.kill('SIGTERM');
        setTimeout(() => { try { child.kill('SIGKILL'); } catch { /* dead */ } }, 10000);
      }
    }, timeoutMs);

    // Idle detection (5 min no output → stuck at permission prompt)
    const idleChecker = setInterval(() => {
      if (finished) return;
      const idleMs = Date.now() - lastOutputTime;
      if (idleMs > idleTimeoutMs) {
        idleTimedOut = true;
        log('warn', 'CLAUDE', `Task ${aiTask.id}: idle ${Math.round(idleMs / 1000)}s — likely stuck at permission prompt, killing`);
        child.kill('SIGTERM');
        setTimeout(() => { try { child.kill('SIGKILL'); } catch { /* dead */ } }, 10000);
      }
    }, 30000); // check every 30s

    child.on('close', (code) => {
      finished = true;
      clearTimeout(absTimer);
      clearInterval(idleChecker);

      if (timedOut) {
        resolve({
          success: false,
          output: `TIMEOUT after ${timeoutMs / 1000}s. Partial:\n${stdout.slice(-3000)}`,
          exitCode: code ?? -1,
        });
      } else if (idleTimedOut) {
        resolve({
          success: false,
          output: `IDLE TIMEOUT (no output for ${idleTimeoutMs / 1000}s — likely stuck at permission prompt). Partial:\n${stdout.slice(-3000)}`,
          exitCode: code ?? -1,
        });
      } else {
        resolve({
          success: code === 0,
          output: stdout || stderr || '(no output)',
          exitCode: code ?? -1,
        });
      }
    });

    child.on('error', (err) => {
      finished = true;
      clearTimeout(absTimer);
      clearInterval(idleChecker);
      resolve({
        success: false,
        output: `Spawn error: ${err.message}`,
        exitCode: -1,
      });
    });
  });
}

module.exports = { dispatch };
