/**
 * Auth Service - STD Architecture (Standard)
 *
 * Tuân thủ chiến lược "Cô lập Sự phức tạp":
 * - Kiến trúc STD (>90% chức năng): Request-response đơn giản
 * - Sử dụng "one-shot" onAuthStateChanged CHỈ để khởi tạo
 * - KHÔNG có real-time listeners liên tục
 *
 * Constitution compliance: HP-06 (Kiến trúc Hướng Dịch vụ)
 * Plan A+ implementation: Simplified VRT setup
 */

import { ref } from 'vue';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth } from './config.js';
import router from '@/router';

// Centralized state
const user = ref(null);
const authError = ref(null);
const isReady = ref(false);
const isSigningIn = ref(false);

/**
 * STD Architecture: One-shot auth state check using promise-wrapped onAuthStateChanged
 *
 * This approach ensures Firebase has finished restoring any saved session
 * before we report isReady = true. This is critical for page refreshes.
 *
 * NOTE: onAuthStateChanged is the ONLY reliable way to wait for auth initialization.
 * We use it in one-shot mode (unsubscribe immediately) to maintain STD principles.
 *
 * @returns {Promise<import('firebase/auth').User | null>}
 */
async function checkAuthState() {
  if (isReady.value) {
    // Already initialized, return current user
    return user.value;
  }

  return new Promise((resolve, reject) => {
    // One-shot listener: unsubscribe immediately after first callback
    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) => {
        unsubscribe(); // Unsubscribe immediately - this is NOT a continuous listener
        user.value = firebaseUser;
        isReady.value = true;
        resolve(firebaseUser);
      },
      (err) => {
        unsubscribe();
        console.error('Auth state check error:', err);
        authError.value = err.message;
        isReady.value = true;
        reject(err);
      }
    );
  });
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
