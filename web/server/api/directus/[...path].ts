/**
 * Directus API Proxy
 *
 * Proxies all requests from /api/directus/* to the Directus backend.
 * This bypasses CORS issues by making requests same-origin.
 *
 * E2 Task #009 - User Approved Code Change
 * E2 Task #012 - Fix cookie handling for session authentication
 * E2 Task #014 - Use proxyRequest for proper header forwarding
 */
import { proxyRequest, getHeader, appendResponseHeader, setResponseStatus, defineEventHandler } from 'h3'

/**
 * Rewrites cookie attributes for proxy compatibility.
 * - Removes Domain attribute (so browser uses current domain)
 * - Ensures Path is set to / for full site access
 * - Preserves HttpOnly, Secure, SameSite attributes
 */
function rewriteCookieForProxy(cookieString: string): string {
  const parts = cookieString.split(';').map(p => p.trim());
  const nameValue = parts[0];
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

    // Keep all other attributes
    newParts.push(part);
  }

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

  // Debug logging for auth requests
  const isAuthRequest = path.startsWith('auth/') || path.startsWith('users/')
  if (isAuthRequest) {
    const cookieHeader = getHeader(event, 'cookie')
    console.log('[Directus Proxy] Request:', event.method, path)
    console.log('[Directus Proxy] Cookie header:', cookieHeader ? 'present (' + cookieHeader.substring(0, 50) + '...)' : 'MISSING')
  }

  try {
    // Get incoming cookie header to explicitly forward to Directus
    // proxyRequest may not forward Cookie header automatically in all cases
    const cookieHeader = getHeader(event, 'cookie')

    // Use h3's proxyRequest with explicit cookie forwarding
    const response = await proxyRequest(event, targetUrl, {
      // Explicitly forward cookie header to backend
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
      // Intercept response to rewrite cookies
      onResponse: async (proxyEvent, response) => {
        const cookies = response.headers.getSetCookie?.() || []
        if (cookies.length > 0) {
          // Clear original set-cookie headers from Directus
          proxyEvent.node.res.removeHeader('set-cookie')
          // Set rewritten cookies with our domain
          for (const cookie of cookies) {
            const rewrittenCookie = rewriteCookieForProxy(cookie)
            appendResponseHeader(proxyEvent, 'set-cookie', rewrittenCookie)
            if (isAuthRequest) {
              console.log('[Directus Proxy] Rewritten cookie:', rewrittenCookie.substring(0, 80) + '...')
            }
          }
        }
      },
    })

    if (isAuthRequest) {
      console.log('[Directus Proxy] Response status:', event.node.res.statusCode)
    }

    return response
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
