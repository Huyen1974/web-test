/**
 * watchdog.js — Detect and handle stuck ai_tasks
 *
 * A task is "stuck" if status IN (dispatched, in_progress)
 * AND dispatched_at is older than 2 hours.
 *
 * Actions:
 * - retry_count < max_retries → reset to queued
 * - retry_count >= max_retries → mark as failed
 */

const directus = require('./directus-client');
const config = require('../config');

/**
 * Check for stuck tasks and handle them.
 *
 * @param {function} log  Logger: (level, phase, msg) => void
 * @returns {Promise<{retried: number, failed: number}>}
 */
async function checkStuckTasks(log) {
  const stuck = await directus.getStuckTasks(config.orchestrator.stuckThresholdMs);
  let retried = 0;
  let failed = 0;

  for (const task of stuck) {
    const retryCount = task.retry_count || 0;
    const maxRetries = task.max_retries || 3;

    if (retryCount < maxRetries) {
      try {
        await directus.updateTask(task.id, {
          status: 'queued',
          retry_count: retryCount + 1,
        });
        log('warn', 'WATCHDOG', `Task #${task.id} (${task.name}) stuck at ${task.status} — retry ${retryCount + 1}/${maxRetries}, reset to queued`);
        retried++;
      } catch (err) {
        log('error', 'WATCHDOG', `Failed to retry task #${task.id}: ${err.message}`);
      }
    } else {
      try {
        await directus.updateTask(task.id, {
          status: 'failed',
          result_summary: `${task.result_summary || ''}\n[WATCHDOG] Max retries exceeded (${maxRetries}). Last dispatched: ${task.dispatched_at}`.trim(),
          completed_at: new Date().toISOString(),
        });
        log('warn', 'WATCHDOG', `Task #${task.id} (${task.name}) FAILED — exceeded ${maxRetries} retries`);
        failed++;
      } catch (err) {
        log('error', 'WATCHDOG', `Failed to fail task #${task.id}: ${err.message}`);
      }
    }
  }

  return { retried, failed };
}

module.exports = { checkStuckTasks };
