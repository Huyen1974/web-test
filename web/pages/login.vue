<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
    <UCard class="max-w-md w-full">
      <template #header>
        <div class="text-center">
          <h1 class="text-2xl font-bold">{{ $t('login.title') }}</h1>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">
            {{ $t('login.subtitle') }}
          </p>
        </div>
      </template>

      <div class="space-y-4">
        <UAlert
          v-if="error"
          icon="i-heroicons-exclamation-triangle"
          color="red"
          variant="soft"
          :title="$t('login.error')"
          :description="error"
        />

        <UButton
          block
          size="lg"
          color="primary"
          icon="i-heroicons-arrow-right-on-rectangle"
          :loading="loading"
          :disabled="loading"
          @click="signInWithGoogle"
        >
          <span v-if="!loading">{{ $t('login.google') }}</span>
          <span v-else>{{ $t('login.signingIn') }}</span>
        </UButton>

        <div class="text-center">
          <UButton
            variant="ghost"
            color="gray"
            :to="'/'"
          >
            {{ $t('login.backHome') }}
          </UButton>
        </div>
      </div>

      <template #footer>
        <div class="text-center text-xs text-gray-500 dark:text-gray-400">
          {{ $t('login.secure') }}
        </div>
      </template>
    </UCard>
  </div>
</template>

<script setup>
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth'

const { $i18n } = useNuxtApp()
const router = useRouter()
const auth = useFirebaseAuth()

const loading = ref(false)
const error = ref(null)

const signInWithGoogle = async () => {
  if (!auth) {
    error.value = 'Firebase Auth is not initialized'
    return
  }

  loading.value = true
  error.value = null

  try {
    const provider = new GoogleAuthProvider()
    await signInWithPopup(auth, provider)

    // Redirect to portal after successful login
    await router.push('/portal')
  } catch (err) {
    console.error('Login error:', err)
    error.value = err.message || 'Failed to sign in with Google'
  } finally {
    loading.value = false
  }
}

// Redirect if already logged in
const user = useCurrentUser()
watch(user, (newUser) => {
  if (newUser) {
    router.push('/portal')
  }
}, { immediate: true })
</script>
