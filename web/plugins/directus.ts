import { createDirectus, rest } from '@directus/sdk'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()

  const directus = createDirectus(config.public.directusUrl as string)
    .with(rest())

  return {
    provide: {
      directus
    }
  }
})
