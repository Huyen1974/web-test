<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
    <UCard class="max-w-2xl w-full">
      <template #header>
        <div class="flex items-center justify-between">
          <h1 class="text-2xl font-bold">Directus Connection Test</h1>
          <UButton
            icon="i-heroicons-arrow-left"
            to="/"
            variant="soft"
            color="gray"
          >
            Back
          </UButton>
        </div>
      </template>

      <div class="space-y-6">
        <UAlert
          icon="i-heroicons-information-circle"
          color="blue"
          variant="soft"
          title="Connection Configuration"
          :description="`Directus URL: ${directusUrl}`"
        />

        <div class="space-y-4">
          <div>
            <h3 class="text-lg font-semibold mb-2">SDK Status</h3>
            <div class="flex items-center gap-2">
              <UBadge
                :color="sdkInitialized ? 'green' : 'red'"
                variant="subtle"
              >
                {{ sdkInitialized ? 'SDK Initialized' : 'SDK Not Initialized' }}
              </UBadge>
            </div>
          </div>

          <div>
            <h3 class="text-lg font-semibold mb-2">Configuration Details</h3>
            <UCard>
              <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <span class="text-gray-600 dark:text-gray-400">Directus Client:</span>
                  <span class="font-mono">{{ directusClientType }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600 dark:text-gray-400">Base URL:</span>
                  <span class="font-mono text-xs">{{ directusUrl }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600 dark:text-gray-400">Environment Variable:</span>
                  <span class="font-mono text-xs">NUXT_PUBLIC_DIRECTUS_URL</span>
                </div>
              </div>
            </UCard>
          </div>

          <div>
            <h3 class="text-lg font-semibold mb-2">Test Authenticated Connection</h3>
            <div class="space-y-3">
              <UButton
                block
                color="primary"
                :loading="testing"
                @click="testConnection"
              >
                Test Server-Side Auth
              </UButton>

              <UAlert
                v-if="testResult"
                :color="testResult.success ? 'green' : 'red'"
                :icon="testResult.success ? 'i-heroicons-check-circle' : 'i-heroicons-exclamation-triangle'"
                :title="testResult.title"
                :description="testResult.message"
              />

              <UCard v-if="testResult && testResult.details" class="mt-2">
                <div class="space-y-2 text-sm">
                  <div class="flex justify-between">
                    <span class="text-gray-600 dark:text-gray-400">Status Code:</span>
                    <span class="font-mono">{{ testResult.details.status }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-600 dark:text-gray-400">Authenticated:</span>
                    <UBadge :color="testResult.details.authenticated ? 'green' : 'red'">
                      {{ testResult.details.authenticated ? 'Yes' : 'No' }}
                    </UBadge>
                  </div>
                </div>
              </UCard>
            </div>
          </div>

          <div>
            <h3 class="text-lg font-semibold mb-2">Notes</h3>
            <UAlert
              icon="i-heroicons-light-bulb"
              color="amber"
              variant="soft"
            >
              <template #description>
                <ul class="list-disc list-inside space-y-1 text-sm">
                  <li>Server-side authentication is configured via NUXT_DIRECTUS_TOKEN</li>
                  <li>Admin token is kept server-side and never exposed to client</li>
                  <li>API calls go through <code class="bg-gray-200 dark:bg-gray-700 px-1 rounded">/api/*</code> routes for security</li>
                  <li>Use <code class="bg-gray-200 dark:bg-gray-700 px-1 rounded">$fetch('/api/...')</code> to call authenticated endpoints</li>
                </ul>
              </template>
            </UAlert>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="text-center text-sm text-gray-500 dark:text-gray-400">
          Task #0391: Server-Side Authentication
        </div>
      </template>
    </UCard>
  </div>
</template>

<script setup>
const { $directus } = useNuxtApp()
const config = useRuntimeConfig()

const directusUrl = computed(() => config.public.directusUrl)
const sdkInitialized = computed(() => !!$directus)
const directusClientType = computed(() =>
  $directus ? 'DirectusClient with REST' : 'Not initialized'
)

const testing = ref(false)
const testResult = ref(null)

const testConnection = async () => {
  testing.value = true
  testResult.value = null

  try {
    // Call our server-side API route which handles authentication
    const response = await $fetch('/api/ping')

    if (response.success) {
      testResult.value = {
        success: true,
        title: 'Authentication Successful',
        message: response.message,
        details: {
          status: response.status,
          authenticated: response.authenticated
        }
      }
    } else {
      testResult.value = {
        success: false,
        title: 'Authentication Failed',
        message: response.message,
        details: {
          status: response.status,
          authenticated: response.authenticated
        }
      }
    }
  } catch (error) {
    testResult.value = {
      success: false,
      title: 'Connection Error',
      message: error.message || 'Failed to connect to API',
      details: {
        status: 500,
        authenticated: false
      }
    }
  } finally {
    testing.value = false
  }
}
</script>
