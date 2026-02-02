/**
 * Activate Now - Server Route (S4)
 * POST /api/agent-data/activate-now
 *
 * Skips the 5-minute timer and immediately activates the next phase
 */

interface ActivateNowBody {
  discussion_id: string
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const body = await readBody<ActivateNowBody>(event)

  // Validate required fields
  if (!body.discussion_id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required field: discussion_id'
    })
  }

  const directusUrl = config.directusInternalUrl || config.public.directusUrl

  try {
    // 1. Get current discussion state
    const discussion = await $fetch<{ data: any }>(`${directusUrl}/items/ai_discussions/${body.discussion_id}`)

    if (!discussion.data) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Discussion not found'
      })
    }

    // 2. Verify discussion is in pending_human status
    if (discussion.data.status !== 'pending_human') {
      throw createError({
        statusCode: 400,
        statusMessage: `Cannot activate: discussion is in '${discussion.data.status}' status, expected 'pending_human'`
      })
    }

    // 3. Update discussion to skip timer
    const response = await $fetch(`${directusUrl}/items/ai_discussions/${body.discussion_id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        status: 'resolved',
        activated_by: 'user_manual',
        activated_at: new Date().toISOString(),
        timer_skipped: true
      }
    })

    // 4. Create system comment recording the manual activation
    await $fetch(`${directusUrl}/items/ai_discussion_comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        discussion_id: body.discussion_id,
        comment_type: 'human_supreme',
        content: '**AUTO-APPROVE** User da kich hoat "Chay ngay" - Bo qua thoi gian cho.',
        round: discussion.data.round || 1,
        decision: 'approve'
      }
    })

    console.log(JSON.stringify({
      severity: 'INFO',
      message: '[Agent-Data] Discussion activated immediately',
      discussion_id: body.discussion_id,
      previous_status: 'pending_human',
      new_status: 'resolved'
    }))

    return {
      success: true,
      discussion_id: body.discussion_id,
      message: 'Discussion activated immediately'
    }
  } catch (error: any) {
    console.log(JSON.stringify({
      severity: 'ERROR',
      message: '[Agent-Data] Failed to activate discussion',
      error: error.message
    }))

    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Failed to activate discussion'
    })
  }
})
