/**
 * reviewer-creator.js — Auto-create reviewer tasks for completed leads
 *
 * When a lead task completes, creates a reviewer task in the same round
 * so a different agent can review the work.
 *
 * Uses directus-client.createTask() (POST via Directus direct with AI Agent token)
 * since OPS proxy only allows GET/PATCH for ai_tasks.
 */

const directus = require('./directus-client');

/**
 * Scan for completed lead tasks and create reviewer tasks where missing.
 *
 * @param {function} log  Logger: (level, phase, msg) => void
 * @returns {Promise<number>} Number of reviewer tasks created
 */
async function createMissingReviewers(log) {
  const leads = await directus.getCompletedLeadTasks();
  let created = 0;

  for (const lead of leads) {
    try {
      // Skip if reviewer already exists for this task_id + round
      const exists = await directus.hasReviewerTask(lead.task_id, lead.round);
      if (exists) continue;

      // Determine reviewer agent (opposite of lead's agent)
      let reviewerAgent;
      if (lead.assigned_agent === 'gpt') {
        reviewerAgent = 'claude';
      } else {
        reviewerAgent = 'gpt';
      }

      // Build reviewer task
      const reviewerData = {
        name: `Review: ${lead.name || 'unnamed'} (R${lead.round})`,
        task_id: lead.task_id,
        round: lead.round,
        work_type: 'direct',
        assigned_agent: reviewerAgent,
        agent_role: 'reviewer',
        prompt_payload: buildReviewPrompt(lead),
        status: 'queued',
      };

      const result = await directus.createTask(reviewerData);
      log('info', 'REVIEWER', `Created reviewer task #${result?.id} for lead #${lead.id} (agent=${reviewerAgent})`);
      created++;
    } catch (err) {
      log('error', 'REVIEWER', `Failed to create reviewer for lead #${lead.id}: ${err.message}`);
    }
  }

  return created;
}

/**
 * Build the review prompt from a completed lead task.
 */
function buildReviewPrompt(lead) {
  return [
    `Bạn là Reviewer. Đánh giá kết quả của ${lead.assigned_agent} (lead) cho task: ${lead.name || 'unnamed'}`,
    ``,
    `KẾT QUẢ CỦA LEAD:`,
    lead.result_summary || '(no summary)',
    ``,
    `EVIDENCE:`,
    lead.result_evidence || '(no evidence)',
    ``,
    `YÊU CẦU GỐC:`,
    lead.prompt_payload || '(no prompt)',
    ``,
    `Hãy ghi vào ai_tasks:`,
    `- review_verdict: approved | needs_work | escalate`,
    `- review_notes: nhận xét chi tiết`,
    `- next_action: (nếu needs_work) mô tả cần làm gì`,
  ].join('\n');
}

module.exports = { createMissingReviewers };
