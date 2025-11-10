<template>
  <div></div>
</template>

<script setup>
// Logic redirect này chỉ chạy ở client-side (sau khi SSG đã tạo file HTML)
// Nó sẽ kiểm tra auth và chuyển hướng
import { useCurrentUser } from 'vuefire'

onMounted(async () => {
  // Đợi auth state sẵn sàng (nếu cần)
  await new Promise(resolve => setTimeout(resolve, 50)) // Chờ 50ms để vuefire init

  const user = useCurrentUser()
  if (user.value) {
    navigateTo('/portal')
  } else {
    navigateTo('/login')
  }
})
</script>
