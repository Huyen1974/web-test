/**
 * Directus API Proxy
 *
 * Proxies all requests from /api/directus/* to the Directus backend.
 * This bypasses CORS issues by making requests same-origin.
 *
 * E2 Task #009 - User Approved Code Change
 * E2 Task #012 - Fix cookie handling for session authentication
 */

export default defineEventHandler(async (event) => {
  const path = event.context.params?.path || ''

  const config = useRuntimeConfig()
  const directusUrl =
    config.directusInternalUrl ||
    process.env.DIRECTUS_INTERNAL_URL ||
    'https://directus-test-pfne2mqwja-as.a.run.app'

  const targetUrl = `${directusUrl}/${path}`

  const query = getQuery(event)
  const queryString = new URLSearchParams(query as Record<string, string>).toString()
  const fullUrl = queryString ? `${targetUrl}?${queryString}` : targetUrl

  const method = event.method
  let body: unknown = undefined

  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    body = await readBody(event)
  }

  const headers = getHeaders(event)
  const forwardHeaders: Record<string, string> = {}
  const headersToForward = [
    'content-type',
    'authorization',
    'accept',
    'accept-language',
    'cookie',
  ]

  for (const header of headersToForward) {
    if (headers[header]) {
      forwardHeaders[header] = headers[header] as string
    }
  }

  // E2 Task #012: Log auth requests for debugging
  const isAuthRequest = path.startsWith('auth/')
  if (isAuthRequest) {
    console.log('[Directus Proxy] Auth request:', method, path)
  }

  try {
    const response = await $fetch.raw(fullUrl, {
      method,
      body: body || undefined,
      headers: forwardHeaders,
      ignoreResponseError: true,
    })

    // E2 Task #012: Handle multiple Set-Cookie headers properly
    // Directus returns multiple cookies (session_token, refresh_token)
    // getSetCookie() returns an array of all Set-Cookie headers
    const cookies = response.headers.getSetCookie?.() || []
    if (cookies.length > 0) {
      // Append each cookie header separately to preserve all cookies
      for (const cookie of cookies) {
        appendResponseHeader(event, 'set-cookie', cookie)
      }
      if (isAuthRequest) {
        console.log('[Directus Proxy] Setting', cookies.length, 'cookie(s)')
      }
    } else {
      // Fallback for environments where getSetCookie is not available
      const setCookie = response.headers.get('set-cookie')
      if (setCookie) {
        setResponseHeader(event, 'set-cookie', setCookie)
        if (isAuthRequest) {
          console.log('[Directus Proxy] Setting cookie (fallback)')
        }
      }
    }

    setResponseStatus(event, response.status)

    if (isAuthRequest) {
      console.log('[Directus Proxy] Auth response status:', response.status)
    }

    return response._data
  } catch (error: any) {
    console.error('[Directus Proxy Error]', error.message)

    setResponseStatus(event, error.statusCode || 500)
    return {
      errors: [
        {
          message: error.message || 'Proxy error',
          extensions: { code: 'PROXY_ERROR' },
        },
      ],
    }
  }
})
