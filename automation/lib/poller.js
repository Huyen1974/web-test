/**
 * poller.js — Poll ai_tasks from Directus
 *
 * Thin wrapper around directus-client that adds logging
 * and filters tasks by assigned_agent if needed.
 */

const directus = require('./directus-client');

/**
 * Poll for queued ai_tasks.
 * @param {function} log  Logger: (level, phase, msg) => void
 * @returns {Promise<Array>} List of queued ai_task objects, oldest first
 */
async function getQueuedTasks(log) {
  try {
    const tasks = await directus.getQueuedTasks();
    if (tasks.length > 0) {
      log('info', 'POLL', `Found ${tasks.length} queued task(s): ${tasks.map(t => `#${t.id}(${t.assigned_agent})`).join(', ')}`);
    }
    return tasks;
  } catch (err) {
    log('error', 'POLL', `Failed to poll: ${err.message}`);
    return [];
  }
}

/**
 * Get tasks that are stuck (dispatched/in_progress too long).
 * @param {function} log
 * @returns {Promise<Array>}
 */
async function getStuckTasks(log) {
  try {
    return await directus.getStuckTasks();
  } catch (err) {
    log('error', 'POLL', `Failed to get stuck tasks: ${err.message}`);
    return [];
  }
}

/**
 * Get completed lead tasks without review.
 * @param {function} log
 * @returns {Promise<Array>}
 */
async function getCompletedLeadTasks(log) {
  try {
    return await directus.getCompletedLeadTasks();
  } catch (err) {
    log('error', 'POLL', `Failed to get completed leads: ${err.message}`);
    return [];
  }
}

module.exports = { getQueuedTasks, getStuckTasks, getCompletedLeadTasks };
