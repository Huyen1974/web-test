import { readItems } from '@directus/sdk'

/**
 * API Route: /api/ping
 *
 * Tests authenticated connection to Directus server.
 *
 * This endpoint:
 * - Uses server-side Directus client with static token
 * - Calls Directus /server/ping endpoint
 * - Returns connection status to frontend
 *
 * Security: Admin token never exposed to client
 */
export default defineEventHandler(async (event) => {
  try {
    const directus = useServerDirectus()
    const config = useRuntimeConfig()

    // Test authentication by attempting to read from server/ping
    // Note: /server/ping requires authentication
    const response = await fetch(`${config.public.directusUrl}/server/ping`, {
      headers: {
        Authorization: `Bearer ${config.directusToken}`
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      return {
        success: false,
        status: response.status,
        message: `Directus responded with ${response.status}: ${errorText}`,
        authenticated: false
      }
    }

    const data = await response.text()

    return {
      success: true,
      status: response.status,
      message: 'Successfully authenticated with Directus server',
      authenticated: true,
      data
    }
  } catch (error: any) {
    return {
      success: false,
      status: 500,
      message: error.message || 'Internal server error',
      authenticated: false
    }
  }
})
