<template>
  <div class="portal-container">
    <div class="portal-box">
      <h1>Welcome to Portal</h1>
      <div v-if="user" class="user-info">
        <p><strong>Email:</strong> {{ user.email }}</p>
        <p><strong>User ID:</strong> {{ user.uid }}</p>
        <p class="success-message">You are successfully authenticated!</p>
      </div>
      <button @click="handleLogout" class="logout-btn">
        Logout
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { signOut, onAuthStateChanged } from 'firebase/auth'

definePageMeta({
  middleware: 'auth'
})

const { $auth } = useNuxtApp()
const router = useRouter()
const user = ref<any>(null)

onMounted(() => {
  onAuthStateChanged($auth as any, (currentUser) => {
    if (currentUser) {
      user.value = currentUser
    } else {
      router.push('/login')
    }
  })
})

const handleLogout = async () => {
  try {
    await signOut($auth as any)
    router.push('/login')
  } catch (err) {
    console.error('Logout failed:', err)
  }
}
</script>

<style scoped>
.portal-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.portal-box {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 500px;
}

h1 {
  margin: 0 0 1.5rem 0;
  color: #333;
  text-align: center;
}

.user-info {
  background: #f7fafc;
  padding: 1rem;
  border-radius: 4px;
  margin-bottom: 1.5rem;
}

.user-info p {
  margin: 0.5rem 0;
  color: #555;
}

.success-message {
  color: #38a169;
  font-weight: 600;
  margin-top: 1rem !important;
}

.logout-btn {
  width: 100%;
  padding: 0.75rem;
  background: #e53e3e;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.3s;
}

.logout-btn:hover {
  background: #c53030;
}
</style>
