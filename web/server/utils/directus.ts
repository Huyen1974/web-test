import { createDirectus, rest, staticToken } from '@directus/sdk'

/**
 * Get authenticated Directus client for server-side use
 *
 * This utility creates a Directus client with:
 * - REST transport for API communication
 * - Static token authentication (from NUXT_DIRECTUS_TOKEN env var)
 *
 * Token is kept server-side and never exposed to client.
 *
 * @returns Directus client instance with authentication
 */
export const useServerDirectus = () => {
  const config = useRuntimeConfig()

  const client = createDirectus(config.public.directusUrl as string)
    .with(rest())
    .with(staticToken(config.directusToken as string))

  return client
}
