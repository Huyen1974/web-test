import { createDirectus, rest, readItems } from '@directus/sdk'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()

  const directus = createDirectus(config.public.directusUrl)
    .with(rest())

  return {
    provide: {
      directus,
      sdk: { readItems }
    }
  }
})
