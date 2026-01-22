/**
 * Directus API Proxy
 *
 * Proxies all requests from /api/directus/* to the Directus backend.
 * This bypasses CORS issues by making requests same-origin.
 *
 * E2 Task #009 - User Approved Code Change
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

  try {
    const response = await $fetch.raw(fullUrl, {
      method,
      body: body ? JSON.stringify(body) : undefined,
      headers: forwardHeaders,
      ignoreResponseError: true,
    })

    const setCookie = response.headers.get('set-cookie')
    if (setCookie) {
      setResponseHeader(event, 'set-cookie', setCookie)
    }

    setResponseStatus(event, response.status)

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
