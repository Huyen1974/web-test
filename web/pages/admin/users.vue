<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
});

const { $directus } = useNuxtApp();
const { t } = useI18n();

const columns = [
  { key: 'email', label: t('login.email') },
  { key: 'role', label: 'Role' },
  { key: 'status', label: 'Status' }
];

    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold">{{ $t('admin.users.title') }}</h1>
      <div class="flex gap-2">
         <UButton icon="i-heroicons-arrow-up-tray" color="gray" label="Bulk Import CSV" @click="triggerFileInput" />
         <UButton icon="i-heroicons-plus" color="primary" label="Invite User" />
         <input type="file" ref="fileInput" class="hidden" accept=".csv" @change="handleFileUpload" />
      </div>
    </div>

    <UCard>
      <UTable :columns="columns" :rows="rows" :loading="pending">
         <template #role-data="{ row }">
            <span class="capitalize">{{ row.role?.name || row.role }}</span>
         </template>
      </UTable>
    </UCard>
    
    <div v-if="error" class="text-red-500 mt-4">
        {{ error.message }}
    </div>
    <div v-if="uploadStatus" class="mt-4 text-sm" :class="uploadStatus.type === 'error' ? 'text-red-500' : 'text-green-500'">
        {{ uploadStatus.message }}
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
});

const { $directus } = useNuxtApp();
const { t } = useI18n();
const fileInput = ref(null);
const uploadStatus = ref(null);

const triggerFileInput = () => {
    fileInput.value.click();
};

const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    uploadStatus.value = { type: 'info', message: 'Uploading...' };
    
    try {
        const formData = new FormData();
        formData.append('file', file);
        // Assuming we upload to a specific folder or just root, and Flow triggers on file upload
        // In a real scenario, we might want to hit a custom flow endpoint.
        // For 'Anti-Stupid', simplest is upload file -> Flow triggers.
        
        await $directus.request($directus.uploadFiles(formData));
        uploadStatus.value = { type: 'success', message: 'Upload successful. Processing...' };
    } catch (e) {
        uploadStatus.value = { type: 'error', message: 'Upload failed: ' + e.message };
    }
};

const columns = [
  { key: 'email', label: t('login.email') },
  { key: 'role', label: 'Role' },
  { key: 'status', label: 'Status' }
];

const { data: users, pending, error } = await useAsyncData('users', async () => {
  return $directus.request($directus.readItems('directus_users', {
      fields: ['email', 'role', 'status', 'id']
  }));
});

const rows = computed(() => users.value || []);
</script>
