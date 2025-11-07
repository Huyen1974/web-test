<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
    <div class="max-w-4xl mx-auto">
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h1 class="text-2xl font-bold">{{ $t('portal.title') }}</h1>
            <UButton
              color="red"
              variant="soft"
              icon="i-heroicons-arrow-right-on-rectangle"
              :loading="loggingOut"
              @click="handleLogout"
            >
              {{ $t('portal.logout') }}
            </UButton>
          </div>
        </template>

        <div class="space-y-6">
          <UAlert
            icon="i-heroicons-check-circle"
            color="green"
            variant="soft"
            :title="$t('portal.welcome', { email: user?.email || 'User' })"
            :description="$t('portal.description')"
          />

          <div class="bg-gray-100 dark:bg-gray-800 rounded-lg p-6">
            <h2 class="text-lg font-semibold mb-4">User Information</h2>
            <div class="space-y-2">
              <div class="flex items-center gap-2">
                <span class="font-medium">Email:</span>
                <span class="text-gray-600 dark:text-gray-300">{{ user?.email }}</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="font-medium">Display Name:</span>
                <span class="text-gray-600 dark:text-gray-300">{{ user?.displayName || 'N/A' }}</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="font-medium">User ID:</span>
                <span class="text-gray-600 dark:text-gray-300 text-sm font-mono">{{ user?.uid }}</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="font-medium">Email Verified:</span>
                <UBadge :color="user?.emailVerified ? 'green' : 'orange'">
                  {{ user?.emailVerified ? 'Yes' : 'No' }}
                </UBadge>
              </div>
            </div>
          </div>

          <div class="flex gap-4">
            <UButton
              variant="outline"
              icon="i-heroicons-home"
              :to="'/'"
            >
              Back to Home
            </UButton>
            <UButton
              variant="outline"
              icon="i-heroicons-beaker"
              :to="'/connect-test'"
            >
              Connection Test
            </UButton>
          </div>
        </div>

        <template #footer>
          <div class="text-center text-sm text-gray-500 dark:text-gray-400">
            Protected by Firebase Authentication
          </div>
        </template>
      </UCard>
    </div>
  </div>
</template>

<script setup>
import { signOut } from 'firebase/auth'

const router = useRouter()
const auth = useFirebaseAuth()
const user = useCurrentUser()

const loggingOut = ref(false)

const handleLogout = async () => {
  if (!auth) return

  loggingOut.value = true

  try {
    await signOut(auth)
    await router.push('/')
  } catch (error) {
    console.error('Logout error:', error)
  } finally {
    loggingOut.value = false
  }
}

// Ensure user is loaded
onMounted(() => {
  if (!user.value) {
    router.push('/login')
  }
})
</script>
