/**
 * Directus API Proxy
 *
 * Proxies all requests from /api/directus/* to the Directus backend.
 * This bypasses CORS issues by making requests same-origin.
 *
 * E2 Task #009 - User Approved Code Change
 * E2 Task #012 - Fix cookie handling for session authentication
 * E2 Task #014 - Use $fetch for reliable header forwarding
 */
import {
  defineEventHandler,
  getHeader,
  getHeaders,
  getQuery,
  readBody,
  appendResponseHeader,
  setResponseHeader,
  setResponseStatus,
} from 'h3'

/**
 * Rewrites cookie attributes for proxy compatibility.
 * - Removes Domain attribute (so browser uses current domain)
 * - Ensures Path is set to / for full site access
 * - Preserves HttpOnly, Secure, SameSite attributes
 * - Ensures Secure is present for HTTPS contexts
 */
function rewriteCookieForProxy(cookieString: string): string {
  const parts = cookieString.split(';').map(p => p.trim())
  const nameValue = parts[0]
  const newParts = [nameValue]
  let hasSecure = false

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i]
    const lowerPart = part.toLowerCase()

    if (lowerPart === 'secure') {
      hasSecure = true
    }

    // Skip Domain attribute - let browser use current domain
    if (lowerPart.startsWith('domain=')) {
      continue
    }

    // Ensure Path is root for full access
    if (lowerPart.startsWith('path=')) {
      newParts.push('Path=/')
      continue
    }

    // Keep all other attributes
    newParts.push(part)
  }

  if (!newParts.some(p => p.toLowerCase().startsWith('path='))) {
    newParts.push('Path=/')
  }

  if (!hasSecure) {
    newParts.push('Secure')
  }

  return newParts.join('; ')
}

export default defineEventHandler(async (event) => {
  const path = event.context.params?.path || ''

  const config = useRuntimeConfig()
  const directusUrl =
    config.directusInternalUrl ||
    process.env.DIRECTUS_INTERNAL_URL ||
    'https://directus-test-pfne2mqwja-as.a.run.app'

  // Build target URL with query parameters
  const query = getQuery(event)
  const queryString = new URLSearchParams(query as Record<string, string>).toString()
  const targetUrl = `${directusUrl}/${path}${queryString ? '?' + queryString : ''}`

  // Debug logging for auth requests
  const isAuthRequest = path.startsWith('auth/') || path.startsWith('users/')

  try {
    // Get incoming request details
    const method = event.method
    const incomingHeaders = getHeaders(event)
    const cookieHeader = getHeader(event, 'cookie')

    if (isAuthRequest) {
      console.log('[Directus Proxy] Request:', method, path)
      console.log('[Directus Proxy] Cookie header:', cookieHeader ? 'present (' + cookieHeader.substring(0, 50) + '...)' : 'MISSING')
    }

    // Build headers for Directus request
    // Forward only safe headers, explicitly include Cookie
    const headers: Record<string, string> = {
      'Content-Type': incomingHeaders['content-type'] || 'application/json',
    }

    // CRITICAL: Forward Cookie header for session authentication
    if (cookieHeader) {
      headers['Cookie'] = cookieHeader
      if (isAuthRequest) {
        console.log('[Directus Proxy] Forwarding Cookie to Directus')
      }
    }

    // Forward authorization header if present
    const authHeader = getHeader(event, 'authorization')
    if (authHeader) {
      headers['Authorization'] = authHeader
    }

    // Get request body for POST/PUT/PATCH
    let body: any = undefined
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      body = await readBody(event)
    }

    // Make request to Directus using native fetch
    // Using native fetch because $fetch/ofetch may strip cookie headers
    if (isAuthRequest) {
      console.log('[Directus Proxy] Target URL:', targetUrl)
      console.log('[Directus Proxy] Headers:', JSON.stringify(headers))
    }

    const response = await fetch(targetUrl, {
      method: method,
      headers: headers,
      body: body ? JSON.stringify(body) : undefined,
    })

    if (isAuthRequest) {
      console.log('[Directus Proxy] Directus response status:', response.status)
    }

    // Forward Set-Cookie headers with rewriting
    const rawSetCookie =
      (response.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie?.() ||
      response.headers.get('set-cookie')
    const setCookieHeaders = Array.isArray(rawSetCookie)
      ? rawSetCookie
      : rawSetCookie
        ? [rawSetCookie]
        : []

    if (setCookieHeaders.length > 0) {
      for (const cookie of setCookieHeaders) {
        const rewrittenCookie = rewriteCookieForProxy(cookie)
        appendResponseHeader(event, 'set-cookie', rewrittenCookie)
        if (isAuthRequest) {
          console.log('[Directus Proxy] Set-Cookie:', rewrittenCookie.substring(0, 80) + '...')
        }
      }
    }

    // Forward content-type header
    const contentType = response.headers.get('content-type')
    if (contentType) {
      setResponseHeader(event, 'content-type', contentType)
    }

    // Set response status
    setResponseStatus(event, response.status)

    // Parse and return response body
    const responseBody = await response.json().catch(() => response.text())
    return responseBody
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
