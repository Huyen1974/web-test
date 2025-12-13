<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
});

const { $auth } = useNuxtApp();
const user = $auth.currentUser;
</script>

<template>
  <div class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
     <div class="px-4 py-6 sm:px-0">
        <h1 class="text-2xl font-semibold text-gray-900 dark:text-white">Profile</h1>
         <div v-if="user" class="mt-4 bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
            <div class="px-4 py-5 sm:px-6">
                <dl class="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
                    <div class="sm:col-span-1">
                        <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Email</dt>
                        <dd class="mt-1 text-sm text-gray-900 dark:text-white">{{ user.email }}</dd>
                    </div>
                     <div class="sm:col-span-1">
                        <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">UID</dt>
                        <dd class="mt-1 text-sm text-gray-900 dark:text-white">{{ user.uid }}</dd>
                    </div>
                     <div class="sm:col-span-1">
                        <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Verified</dt>
                        <dd class="mt-1 text-sm text-gray-900 dark:text-white">{{ user.emailVerified ? 'Yes' : 'No' }}</dd>
                    </div>
                </dl>
            </div>
         </div>
         <div v-else>
             <p>No user data.</p>
         </div>
     </div>
  </div>
</template>
