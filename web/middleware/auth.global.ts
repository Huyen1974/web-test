import { useCurrentUser } from 'vuefire'

export default defineNuxtRouteMiddleware((to) => {
  const user = useCurrentUser()

  // Routes that require authentication
  const protectedRoutes = ['/portal']
  const isProtectedRoute = protectedRoutes.some(route => to.path.startsWith(route))

  // Redirect unauthenticated users to login page
  if (isProtectedRoute && !user.value) {
    return navigateTo('/login')
  }

  // Redirect authenticated users away from login page
  if (to.path === '/login' && user.value) {
    return navigateTo('/portal')
  }
})
