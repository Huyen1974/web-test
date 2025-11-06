// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  runtimeConfig: {
    // Private keys (server-only)
    directusToken: process.env.NUXT_DIRECTUS_TOKEN || '',

    // Public keys (exposed to client)
    public: {
      directusUrl: process.env.NUXT_PUBLIC_DIRECTUS_URL || 'https://directus-test-812872501910.asia-southeast1.run.app'
    }
  },

  modules: [
    '@nuxt/ui',
    '@nuxtjs/i18n'
  ],

  i18n: {
    locales: [
      { code: 'vi', name: 'Tiếng Việt', file: 'vi.json' },
      { code: 'ja', name: '日本語', file: 'ja.json' },
      { code: 'en', name: 'English', file: 'en.json' }
    ],
    defaultLocale: 'vi',
    langDir: 'locales',
    strategy: 'prefix_except_default'
  }
})
