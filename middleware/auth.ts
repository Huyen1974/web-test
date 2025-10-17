export default defineNuxtRouteMiddleware((to, from) => {
  // Only run on client-side
  if (process.server) return

  const { $auth } = useNuxtApp()

  return new Promise((resolve) => {
    // Check current auth state
    const unsubscribe = ($auth as any).onAuthStateChanged((user: any) => {
      unsubscribe()

      if (!user) {
        // User is not authenticated, redirect to login
        resolve(navigateTo('/login'))
      } else {
        // User is authenticated, allow access
        resolve()
      }
    })
  })
})
