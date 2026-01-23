/**
 * Directus API Proxy
 *
 * Proxies all requests from /api/directus/* to the Directus backend.
 * This bypasses CORS issues by making requests same-origin.
 *
 * E2 Task #009 - User Approved Code Change
 * E2 Task #012 - Fix cookie handling for session authentication
 * E2 Task #014 - Fix cookie Domain attribute for cross-origin proxy
 */
// H3/Nuxt server utilities are auto-imported

/**
 * Rewrites cookie attributes for proxy compatibility.
 * - Removes Domain attribute (so browser uses current domain)
 * - Ensures Path is set to / for full site access
 * - Preserves HttpOnly, Secure, SameSite attributes
 */
function rewriteCookieForProxy(cookieString: string): string {
  // Parse the cookie into parts
  const parts = cookieString.split(';').map(p => p.trim());

  // First part is always name=value
  const nameValue = parts[0];

  // Filter and modify attributes
  const newParts = [nameValue];

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    const lowerPart = part.toLowerCase();

    // Skip Domain attribute - let browser use current domain
    if (lowerPart.startsWith('domain=')) {
      continue;
    }

    // Ensure Path is root for full access
    if (lowerPart.startsWith('path=')) {
      newParts.push('Path=/');
      continue;
    }

    // Keep all other attributes (HttpOnly, Secure, SameSite, Max-Age, Expires)
    newParts.push(part);
  }

  // Ensure Path=/ is present if not already added
  if (!newParts.some(p => p.toLowerCase().startsWith('path='))) {
    newParts.push('Path=/');
  }

  return newParts.join('; ');
}

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
  const isAuthRequest = path.startsWith('auth/') || path.startsWith('users/')
  if (isAuthRequest) {
    console.log('[Directus Proxy] Request:', method, path)
    console.log('[Directus Proxy] Cookie header:', forwardHeaders['cookie'] ? 'present' : 'MISSING')
  }

  try {
    // E2 Task #014: Debug cookie forwarding
    if (isAuthRequest) {
      console.log('[Directus Proxy] Forwarding headers:', JSON.stringify(forwardHeaders))
    }

    // Use $fetch with explicit headers - ensure cookie header is properly capitalized
    const fetchHeaders: Record<string, string> = {}
    for (const [key, value] of Object.entries(forwardHeaders)) {
      // Capitalize header names for better compatibility
      if (key === 'cookie') {
        fetchHeaders['Cookie'] = value
      } else if (key === 'content-type') {
        fetchHeaders['Content-Type'] = value
      } else {
        fetchHeaders[key] = value
      }
    }

    if (isAuthRequest) {
      console.log('[Directus Proxy] Final headers:', JSON.stringify(fetchHeaders))
    }

    const response = await $fetch.raw(fullUrl, {
      method,
      body: body || undefined,
      headers: fetchHeaders,
      ignoreResponseError: true,
    })

    // E2 Task #012 & #014: Handle Set-Cookie headers with domain rewriting
    // Directus returns cookies with Domain=directus-xxx.run.app which browser rejects
    // We rewrite to remove Domain attribute so browser uses current origin
    const cookies = response.headers.getSetCookie?.() || []
    if (cookies.length > 0) {
      for (const cookie of cookies) {
        const rewrittenCookie = rewriteCookieForProxy(cookie)
        appendResponseHeader(event, 'set-cookie', rewrittenCookie)
        if (isAuthRequest) {
          console.log('[Directus Proxy] Original cookie:', cookie.substring(0, 100) + '...')
          console.log('[Directus Proxy] Rewritten cookie:', rewrittenCookie.substring(0, 100) + '...')
        }
      }
      if (isAuthRequest) {
        console.log('[Directus Proxy] Set', cookies.length, 'cookie(s) with rewritten attributes')
      }
    } else {
      // Fallback for environments where getSetCookie is not available
      const setCookie = response.headers.get('set-cookie')
      if (setCookie) {
        const rewrittenCookie = rewriteCookieForProxy(setCookie)
        setResponseHeader(event, 'set-cookie', rewrittenCookie)
        if (isAuthRequest) {
          console.log('[Directus Proxy] Setting cookie (fallback, rewritten)')
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
