<script setup lang="ts">
import { sendPasswordResetEmail } from 'firebase/auth';

const { $auth } = useNuxtApp();
const email = ref('');
const loading = ref(false);
const message = ref('');
const error = ref('');

const handleReset = async () => {
  loading.value = true;
  message.value = '';
  error.value = '';
  try {
    await sendPasswordResetEmail($auth, email.value);
    message.value = 'Check your email for password reset instructions.';
  } catch (e: any) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-12 sm:px-6 lg:px-8">
    <div class="w-full max-w-md space-y-8">
      <div>
         <h2 class="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900 dark:text-white">{{ $t('login.forgot_password') }}</h2>
      </div>
      <form class="mt-8 space-y-6" @submit.prevent="handleReset">
        <div class="rounded-md shadow-sm -space-y-px">
          <div>
            <label for="email-address" class="sr-only">{{ $t('login.email') }}</label>
            <input id="email-address" name="email" type="email" autocomplete="email" required v-model="email" class="relative block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" :placeholder="$t('login.email')">
          </div>
        </div>

        <div>
          <button type="submit" :disabled="loading" class="group relative flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
            <span class="absolute inset-y-0 left-0 flex items-center pl-3">
              <span v-if="loading">...</span>
            </span>
            {{ $t('login.submit') }}
          </button>
        </div>
        
        <div class="text-center text-sm">
            <NuxtLink to="/login" class="font-medium text-indigo-600 hover:text-indigo-500">{{ $t('login.title') }}</NuxtLink>
        </div>

        <div v-if="message" class="text-green-500 text-sm text-center">
            {{ message }}
        </div>
        <div v-if="error" class="text-red-500 text-sm text-center">
            {{ error }}
        </div>
      </form>
    </div>
  </div>
</template>
