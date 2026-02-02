/**
 * Create Comment - Server Route
 * POST /api/agent-data/comment
 *
 * Creates a new comment on an AI discussion in Directus
 */

interface CreateCommentBody {
  discussion_id: string
  content: string
  comment_type: 'draft' | 'review' | 'approval' | 'human' | 'human_supreme'
  round?: number
  decision?: 'approve' | 'request_changes' | 'comment' | 'reject' | 'redirect'
  prompt_version?: number
  prompt_content?: string
  changes_summary?: string
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const body = await readBody<CreateCommentBody>(event)

  // Validate required fields
  if (!body.discussion_id || !body.content || !body.comment_type) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required fields: discussion_id, content, comment_type'
    })
  }

  const directusUrl = config.directusInternalUrl || config.public.directusUrl

  try {
    const response = await $fetch(`${directusUrl}/items/ai_discussion_comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        discussion_id: body.discussion_id,
        content: body.content,
        comment_type: body.comment_type,
        round: body.round || 1,
        decision: body.decision || null,
        prompt_version: body.prompt_version || null,
        prompt_content: body.prompt_content || null,
        changes_summary: body.changes_summary || null
      }
    })

    console.log(JSON.stringify({
      severity: 'INFO',
      message: '[Agent-Data] Comment created',
      discussion_id: body.discussion_id,
      comment_type: body.comment_type
    }))

    return response
  } catch (error: any) {
    console.log(JSON.stringify({
      severity: 'ERROR',
      message: '[Agent-Data] Failed to create comment',
      error: error.message
    }))

    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Failed to create comment'
    })
  }
})
