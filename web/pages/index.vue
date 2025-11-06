<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
    <UCard class="max-w-2xl w-full">
      <template #header>
        <div class="flex items-center justify-between">
          <h1 class="text-2xl font-bold">{{ $t('welcome') }}</h1>
          <UButton
            icon="i-heroicons-language"
            @click="toggleLocale"
            variant="soft"
          >
            {{ currentLocale }}
          </UButton>
        </div>
      </template>

      <div class="space-y-4">
        <p class="text-gray-600 dark:text-gray-400">
          {{ $t('description') }}
        </p>

        <UAlert
          icon="i-heroicons-information-circle"
          color="primary"
          variant="soft"
          title="Nuxt 3 + Nuxt UI + i18n"
          description="Stack: Nuxt 3 framework with Nuxt UI components and multilingual support"
        />

        <div class="grid grid-cols-3 gap-4">
          <UButton
            block
            color="primary"
            variant="outline"
            @click="setLocale('vi')"
            :class="{ 'ring-2 ring-primary': locale === 'vi' }"
          >
            🇻🇳 Tiếng Việt
          </UButton>
          <UButton
            block
            color="primary"
            variant="outline"
            @click="setLocale('ja')"
            :class="{ 'ring-2 ring-primary': locale === 'ja' }"
          >
            🇯🇵 日本語
          </UButton>
          <UButton
            block
            color="primary"
            variant="outline"
            @click="setLocale('en')"
            :class="{ 'ring-2 ring-primary': locale === 'en' }"
          >
            🇬🇧 English
          </UButton>
        </div>
      </div>

      <template #footer>
        <div class="text-center text-sm text-gray-500 dark:text-gray-400">
          Powered by Nuxt 3 • Project: web-test
        </div>
      </template>
    </UCard>
  </div>
</template>

<script setup>
const { locale, setLocale } = useI18n()

const currentLocale = computed(() => {
  const locales = { vi: 'VI', ja: 'JA', en: 'EN' }
  return locales[locale.value] || 'VI'
})

const localeOrder = ['vi', 'ja', 'en']
const toggleLocale = () => {
  const currentIndex = localeOrder.indexOf(locale.value)
  const nextIndex = (currentIndex + 1) % localeOrder.length
  setLocale(localeOrder[nextIndex])
}
</script>
