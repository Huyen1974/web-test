<script setup lang="ts">
import { signOut } from 'firebase/auth';

const { $auth } = useNuxtApp();
const router = useRouter();

onMounted(async () => {
  try {
    await signOut($auth);
  } catch (e) {
    console.error('Logout error', e);
  } finally {
    router.push('/login');
  }
});
</script>

<template>
  <div class="flex items-center justify-center min-h-screen">
    <p>{{ $t('common.loading') }}</p>
  </div>
</template>
