/**
 * Create Discussion - Server Route
 * POST /api/agent-data/discussion
 *
 * Creates a new AI discussion in Directus
 */

interface CreateDiscussionBody {
  topic: string
  description?: string
  drafter_id?: string
  approver_id?: string
  max_rounds?: number
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const body = await readBody<CreateDiscussionBody>(event)

  // Validate required fields
  if (!body.topic) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required field: topic'
    })
  }

  const directusUrl = config.directusInternalUrl || config.public.directusUrl

  try {
    const response = await $fetch(`${directusUrl}/items/ai_discussions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        topic: body.topic,
        description: body.description || '',
        drafter_id: body.drafter_id || null,
        approver_id: body.approver_id || null,
        max_rounds: body.max_rounds || 3,
        status: 'drafting',
        round: 1
      }
    })

    console.log(JSON.stringify({
      severity: 'INFO',
      message: '[Agent-Data] Discussion created',
      topic: body.topic
    }))

    return response
  } catch (error: any) {
    console.log(JSON.stringify({
      severity: 'ERROR',
      message: '[Agent-Data] Failed to create discussion',
      error: error.message
    }))

    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Failed to create discussion'
    })
  }
})
