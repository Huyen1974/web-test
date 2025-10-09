/**
 * Router - STD Architecture Compliance
 *
 * Tuân thủ chiến lược "Cô lập Sự phức tạp":
 * - KHÔNG sử dụng onAuthStateChanged trực tiếp
 * - Sử dụng useAuth() service để kiểm tra trạng thái
 *
 * Constitution compliance: HP-06 (Kiến trúc Hướng Dịch vụ)
 */

import { createRouter, createWebHistory } from 'vue-router';
import { useAuth } from '@/firebase/authService';

import KnowledgeHubView from '../views/KnowledgeHubView.vue';
import GoodbyeView from '../views/GoodbyeView.vue';

// STD Architecture: Get current user from useAuth() service
const { user, isReady, checkAuthState } = useAuth();

/**
 * STD Architecture: Check if user is authenticated
 * Waits for auth to be ready before checking user state
 */
const getCurrentUser = async () => {
  // Wait for auth to be ready
  if (!isReady.value) {
    await checkAuthState();
  }
  return user.value;
};

const routes = [
  {
    path: '/',
    name: 'home',
    component: KnowledgeHubView,
    meta: {
      title: 'Knowledge Hub',
      description: 'Tổng quan trung tâm tri thức.',
    },
  },
  {
    path: '/portal/noi-bo',
    name: 'portal-noi-bo',
    component: KnowledgeHubView,
    meta: {
      title: 'Portal Nội Bộ',
      description: 'Phân khu nội bộ.',
      requiresAuth: true, // This route requires authentication
    },
  },
  {
    path: '/portal/kinh-doanh',
    name: 'portal-kinh-doanh',
    component: KnowledgeHubView,
    meta: {
      title: 'Portal Kinh Doanh',
      description: 'Phân khu kinh doanh.',
      requiresAuth: true, // This route requires authentication
    },
  },
  {
    path: '/goodbye',
    name: 'goodbye',
    component: GoodbyeView,
    meta: {
      title: 'Đã đăng xuất',
      description: 'Trang thông báo đăng xuất thành công.',
    },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
});

// Global Navigation Guard
router.beforeEach(async (to, from, next) => {
  try {
    const requiresAuth = to.matched.some(record => record.meta.requiresAuth);

    if (requiresAuth) {
      const user = await getCurrentUser();
      if (!user) {
        // User is not logged in, redirect to the home page.
        console.log('Unauthorized access attempt to a protected route. Redirecting to /.');
        next({ name: 'home' });
      } else {
        // User is logged in, allow access.
        next();
      }
    } else {
      // Route does not require auth, allow access.
      next();
    }
  } catch (error) {
    // Log the error and allow navigation to continue to avoid blocking the app
    console.error('[Router Guard Error]', error);
    next();
  }
});

export default router;
