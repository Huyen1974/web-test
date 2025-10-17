<template>
  <div class="items-container">
    <div class="items-box">
      <h1>Items from Directus</h1>
      <div v-if="pending" class="loading-message">Loading...</div>
      <ul v-else-if="items" class="items-list">
        <li v-for="item in items" :key="item.id" class="item">
          {{ item.name }}
        </li>
      </ul>
      <div v-else-if="error" class="error-message">
        Error: {{ error.message }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { $directus, $sdk } = useNuxtApp()

const { data: items, pending, error } = useAsyncData(
  'items',
  () => {
    return $directus.request($sdk.readItems('items', {
      fields: ['id', 'name'],
    }))
  }
)
</script>

<style scoped>
.items-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem;
}

.items-box {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 600px;
}

h1 {
  margin: 0 0 1.5rem 0;
  color: #333;
  text-align: center;
}

.loading-message {
  text-align: center;
  color: #667eea;
  font-size: 1.1rem;
  padding: 2rem;
}

.items-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.item {
  padding: 1rem;
  margin-bottom: 0.5rem;
  background: #f7fafc;
  border-radius: 4px;
  border-left: 4px solid #667eea;
  color: #333;
}

.error-message {
  color: #e53e3e;
  padding: 1rem;
  background: #fed7d7;
  border-radius: 4px;
  text-align: center;
}
</style>
