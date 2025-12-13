<script setup lang="ts">
import { GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword } from 'firebase/auth';

const { $auth } = useNuxtApp();
const router = useRouter();
const email = ref('');
const password = ref('');
const loading = ref(false);
const error = ref('');

const handleLogin = async () => {
  loading.value = true;
  error.value = '';
  try {
    await signInWithEmailAndPassword($auth, email.value, password.value);
    router.push('/portal');
  } catch (e: any) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
};

const handleGoogleLogin = async () => {
    loading.value = true;
    error.value = '';
    try {
        const provider = new GoogleAuthProvider();
        await signInWithPopup($auth, provider);
        router.push('/portal');
    } catch (e: any) {
        error.value = e.message;
    } finally {
        loading.value = false;
    }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-12 sm:px-6 lg:px-8">
    <div class="w-full max-w-md space-y-8">
      <div>
        <h2 class="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900 dark:text-white">{{ $t('login.title') }}</h2>
      </div>
      <form class="mt-8 space-y-6" @submit.prevent="handleLogin">
        <div class="-space-y-px rounded-md shadow-sm">
          <div>
            <label for="email-address" class="sr-only">{{ $t('login.email') }}</label>
            <input id="email-address" name="email" type="email" autocomplete="email" required v-model="email" class="relative block w-full rounded-t-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" :placeholder="$t('login.email')">
          </div>
          <div>
            <label for="password" class="sr-only">{{ $t('login.password') }}</label>
            <input id="password" name="password" type="password" autocomplete="current-password" required v-model="password" class="relative block w-full rounded-b-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" :placeholder="$t('login.password')">
          </div>
        </div>

        <div class="flex items-center justify-between">
          <div class="text-sm">
            <NuxtLink to="/forgot-password" class="font-medium text-indigo-600 hover:text-indigo-500">{{ $t('login.forgot_password') }}</NuxtLink>
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
        
         <div>
          <button type="button" @click="handleGoogleLogin" :disabled="loading" class="group relative flex w-full justify-center rounded-md bg-white border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50">
             {{ $t('login.google') }}
          </button>
        </div>
        
         <div class="text-center text-sm">
            <NuxtLink to="/register" class="font-medium text-indigo-600 hover:text-indigo-500">{{ $t('login.no_account') }}</NuxtLink>
        </div>

        <div v-if="error" class="text-red-500 text-sm text-center">
            {{ error }}
        </div>
      </form>
    </div>
  </div>
</template>
