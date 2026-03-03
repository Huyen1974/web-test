/**
 * L2 Checkpoint Guard — Directus Hook Extension (TD-057)
 *
 * Prevents L2 (User Approval) checkpoints from being approved
 * until ALL L1 (AI Review) checkpoints for the same task are passed.
 *
 * Mirrors the client-side logic in CheckpointPanel.vue:
 *   - l1Complete = total > 0 && passed === total
 *   - L2 locked when !l1Complete
 */
export default ({ filter }, { database, logger }) => {
  filter('task_checkpoints.items.update', async (payload, meta) => {
    // Only intercept when status is being set to 'passed'
    if (payload.status !== 'passed') return payload;

    const keys = meta.keys ?? [];
    if (keys.length === 0) return payload;

    // Find which of the updated checkpoints are L2
    const l2Items = await database('task_checkpoints')
      .whereIn('id', keys)
      .andWhere('layer', 'L2')
      .select('id', 'task_id');

    if (l2Items.length === 0) return payload;

    // For each L2 checkpoint, verify all L1 checkpoints for same task are passed
    for (const item of l2Items) {
      const l1Stats = await database('task_checkpoints')
        .where({ task_id: item.task_id, layer: 'L1' })
        .select('id', 'status');

      const total = l1Stats.length;
      const passed = l1Stats.filter((cp) => cp.status === 'passed').length;
      const allL1Passed = total > 0 && passed === total;

      if (!allL1Passed) {
        const reason =
          total === 0
            ? 'no L1 checkpoints exist for this task'
            : `${total - passed}/${total} L1 checkpoint(s) not yet passed`;

        logger.warn(
          `[L2 Guard] BLOCKED: L2 checkpoint id=${item.id}, task=${item.task_id} — ${reason}`,
        );

        const err = new Error(
          `Cannot approve L2 checkpoint: ${reason}. ` +
            `Complete all L1 (AI Review) checkpoints before approving L2 (User Approval).`,
        );
        err.status = 403;
        throw err;
      }
    }

    logger.info(
      `[L2 Guard] Approved ${l2Items.length} L2 checkpoint(s) for tasks: ${l2Items.map((i) => i.task_id).join(', ')}`,
    );
    return payload;
  });
};
