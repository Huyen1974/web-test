/**
 * Update Status - Server Route
 * PATCH /api/agent-data/status
 *
 * Updates discussion status in Directus (including archive functionality)
 */

type DiscussionStatus = 'drafting' | 'pending_human' | 'reviewing' | 'approving' | 'resolved' | 'rejected' | 'archived' | 'stalled_error'

interface UpdateStatusBody {
  discussion_id: string
  status: DiscussionStatus
  archive_reason?: string
  locked_by_user?: boolean
  round?: number
  human_comment?: string
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const body = await readBody<UpdateStatusBody>(event)

  // Validate required fields
  if (!body.discussion_id || !body.status) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required fields: discussion_id, status'
    })
  }

  const directusUrl = config.directusInternalUrl || config.public.directusUrl

  // Build update payload
  const updatePayload: Record<string, any> = {
    status: body.status
  }

  // Handle archive-specific fields
  if (body.status === 'archived') {
    updatePayload.archived_at = new Date().toISOString()
    if (body.archive_reason) {
      updatePayload.archive_reason = body.archive_reason
    }
  }

  // Handle other optional fields
  if (body.locked_by_user !== undefined) {
    updatePayload.locked_by_user = body.locked_by_user
  }
  if (body.round !== undefined) {
    updatePayload.round = body.round
  }
  if (body.human_comment !== undefined) {
    updatePayload.human_comment = body.human_comment
  }

  try {
    const response = await $fetch(`${directusUrl}/items/ai_discussions/${body.discussion_id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: updatePayload
    })

    console.log(JSON.stringify({
      severity: 'INFO',
      message: '[Agent-Data] Status updated',
      discussion_id: body.discussion_id,
      new_status: body.status
    }))

    return response
  } catch (error: any) {
    console.log(JSON.stringify({
      severity: 'ERROR',
      message: '[Agent-Data] Failed to update status',
      error: error.message
    }))

    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Failed to update status'
    })
  }
})
