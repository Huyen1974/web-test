/**
 * Auth Service - STD Architecture (Standard)
 *
 * Tuân thủ chiến lược "Cô lập Sự phức tạp":
 * - Kiến trúc STD (>90% chức năng): Request-response đơn giản
 * - KHÔNG sử dụng real-time listeners (onAuthStateChanged)
 * - Kiểm tra trạng thái xác thực một lần khi cần thiết
 *
 * Constitution compliance: HP-06 (Kiến trúc Hướng Dịch vụ)
 */

import { ref } from 'vue';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { auth } from './config.js';
import router from '@/router';

// Centralized state
const user = ref(null);
const authError = ref(null);
const isReady = ref(false);
const isSigningIn = ref(false);

/**
 * STD Architecture: Check auth state once using request-response
 * NO real-time listeners (onAuthStateChanged)
 */
async function checkAuthState() {
  try {
    // Wait for Firebase Auth to initialize
    await new Promise((resolve) => {
      const currentUser = auth.currentUser;
      if (currentUser !== undefined) {
        resolve();
      } else {
        // Wait a bit for Firebase to initialize
        setTimeout(resolve, 100);
      }
    });

    user.value = auth.currentUser;
    isReady.value = true;
  } catch (err) {
    console.error('Auth state check error:', err);
    authError.value = err.message;
    isReady.value = true;
  }
}

/**
 * Composable function to manage Firebase authentication.
 *
 * STD ARCHITECTURE (>90% features):
 * - Request-response pattern ONLY
 * - NO real-time listeners
 * - Manual state checks via checkAuthState()
 *
 * @returns {{
 *   user: import('vue').Ref<import('firebase/auth').User | null>,
 *   signInWithGoogle: () => Promise<void>,
 *   signOut: () => Promise<void>,
 *   isReady: import('vue').Ref<boolean>,
 *   isSigningIn: import('vue').Ref<boolean>,
 *   authError: import('vue').Ref<string | null>,
 *   checkAuthState: () => Promise<void>
 * }}
 */
export function useAuth() {
  // STD Architecture: Check auth state once on initialization
  if (!isReady.value) {
    checkAuthState();
  }

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    authError.value = null;
    isSigningIn.value = true;
    try {
      await signInWithPopup(auth, provider);
      // STD Architecture: Update state after successful sign-in
      user.value = auth.currentUser;
    } catch (error) {
      authError.value = error.message;
      console.error('Error during sign-in:', error);
    } finally {
      isSigningIn.value = false;
    }
  };

  const signOut = async () => {
    authError.value = null;
    try {
      await firebaseSignOut(auth);
      // STD Architecture: Manually clear the user state
      user.value = null;
      // Redirect to the goodbye page after successful sign-out
      try {
        await router.push({ name: 'goodbye' });
      } catch (navError) {
        // Navigation error (e.g., navigation guard cancellation) - not critical
        console.warn('Navigation after sign-out was cancelled:', navError);
      }
    } catch (error) {
      authError.value = error.message;
      console.error('Error during sign-out:', error);
    }
  };

  // Expose a test API in non-production environments
  if (import.meta.env.MODE !== 'production' && typeof window !== 'undefined') {
    window.__AUTH_TEST_API__ = {
      setUser: (testUser) => {
        user.value = testUser;
      },
      setLoading: (loading) => {
        isReady.value = !loading;
      },
      setError: (errorMsg) => {
        authError.value = errorMsg;
      },
    };
  }

  return {
    user,
    signInWithGoogle,
    signOut,
    isReady,
    isSigningIn,
    authError,
    checkAuthState,
  };
}
