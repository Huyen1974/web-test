<script setup lang="ts">
const props = defineProps({
  error: Object
});

const handleError = () => clearError({ redirect: '/' });
</script>

<template>
  <div class="flex min-h-screen flex-col items-center justify-center">
    <h1 class="text-9xl font-bold">{{ error.statusCode }}</h1>
    <p class="mt-4 text-xl">{{ error.message || $t('common.error') }}</p>
    <button @click="handleError" class="mt-8 rounded bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-500">
      Go Home
    </button>
  </div>
</template>
