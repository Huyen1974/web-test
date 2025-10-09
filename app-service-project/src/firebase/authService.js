/**
 * Auth Service - STD Architecture (Standard) - Pure STD Implementation
 *
 * Tuân thủ chiến lược "Cô lập Sự phức tạp":
 * - Kiến trúc STD (>90% chức năng): Request-response đơn giản
 * - KHÔNG sử dụng onAuthStateChanged (loại bỏ hoàn toàn)
 * - Sử dụng auth.authStateReady() promise (STD thuần túy)
 * - KHÔNG có real-time listeners
 *
 * Constitution compliance: HP-06 (Kiến trúc Hướng Dịch vụ)
 * Plan A+ implementation: Complete STD refactor
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
 * STD Architecture: Pure STD auth state check using auth.authStateReady()
 *
 * This approach uses Firebase's built-in promise to wait for auth initialization
 * without any listeners. This is 100% STD compliant.
 *
 * @returns {Promise<import('firebase/auth').User | null>}
 */
async function checkAuthState() {
  if (isReady.value) {
    // Already initialized, return current user
    return user.value;
  }

  try {
    // Wait for Firebase Auth to be ready (STD promise-based approach)
    await auth.authStateReady();

    // Get current user directly (no listener needed)
    user.value = auth.currentUser;
    isReady.value = true;
    return user.value;
  } catch (err) {
    console.error('Auth state check error:', err);
    authError.value = err.message;
    isReady.value = true;
    throw err;
  }
}

// Expose test API IMMEDIATELY for E2E tests (before async checkAuthState)
// This ensures tests can inject mock user even if auth is still initializing
// NOTE: Use explicit VITE_ENABLE_TEST_API flag instead of MODE or PROD checks
// because Vite build always sets PROD=true even with --mode development
// This flag is set in playwright.config.js for VRT tests
if (import.meta.env.VITE_ENABLE_TEST_API === 'true' && typeof window !== 'undefined') {
  window.__AUTH_TEST_API__ = {
    setUser: (testUser) => {
      user.value = testUser;
      isReady.value = true; // Mark as ready when test sets user
    },
    setLoading: (loading) => {
      isReady.value = !loading;
    },
    setError: (errorMsg) => {
      authError.value = errorMsg;
    },
  };
}

/**
 * Composable function to manage Firebase authentication.
 *
 * STD ARCHITECTURE (>90% features):
 * - Request-response pattern ONLY
 * - One-shot initialization check (NOT continuous listener)
 * - Manual state checks via checkAuthState()
 *
 * @returns {{
 *   user: import('vue').Ref<import('firebase/auth').User | null>,
 *   signInWithGoogle: () => Promise<void>,
 *   signOut: () => Promise<void>,
 *   isReady: import('vue').Ref<boolean>,
 *   isSigningIn: import('vue').Ref<boolean>,
 *   authError: import('vue').Ref<string | null>,
 *   checkAuthState: () => Promise<import('firebase/auth').User | null>
 * }}
 */
export function useAuth() {
  // STD Architecture: Initialize auth state check once
  // This runs ONCE per app lifecycle to wait for Firebase to restore session
  if (!isReady.value) {
    checkAuthState().catch((err) => {
      console.error('Failed to initialize auth state:', err);
    });
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
