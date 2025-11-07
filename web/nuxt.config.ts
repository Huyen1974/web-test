// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  runtimeConfig: {
    // Private keys (server-only)
    directusToken: process.env.NUXT_DIRECTUS_TOKEN || '',

    // Public keys (exposed to client)
    public: {
      directusUrl: process.env.NUXT_PUBLIC_DIRECTUS_URL || 'https://directus-test-812872501910.asia-southeast1.run.app',

      // Firebase configuration
      firebaseApiKey: process.env.NUXT_PUBLIC_FIREBASE_API_KEY || '',
      firebaseAuthDomain: process.env.NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
      firebaseProjectId: process.env.NUXT_PUBLIC_FIREBASE_PROJECT_ID || '',
      firebaseStorageBucket: process.env.NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
      firebaseMessagingSenderId: process.env.NUXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
      firebaseAppId: process.env.NUXT_PUBLIC_FIREBASE_APP_ID || ''
    }
  },

  modules: [
    '@nuxt/ui',
    '@nuxtjs/i18n',
    'nuxt-vuefire'
  ],

  // @ts-expect-error - vuefire module extends NuxtConfig
  vuefire: {
    auth: {
      enabled: true,
      sessionCookie: false
    },
    config: {
      apiKey: process.env.NUXT_PUBLIC_FIREBASE_API_KEY || '',
      authDomain: process.env.NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
      projectId: process.env.NUXT_PUBLIC_FIREBASE_PROJECT_ID || '',
      storageBucket: process.env.NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
      messagingSenderId: process.env.NUXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: process.env.NUXT_PUBLIC_FIREBASE_APP_ID || ''
    }
  },

  ssr: true
})
