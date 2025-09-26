import { ref, computed, readonly } from 'vue';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from 'firebase/auth';

import { auth } from '../firebase/config';

// Reactive state
const user = ref(null);
const loading = ref(true);
const error = ref('');

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Computed properties
const isAuthenticated = computed(() => !!user.value);
const userDisplayName = computed(
  () => user.value?.displayName || user.value?.email || 'Tài khoản'
);

// State update functions (to be called from App.vue)
function updateAuthState(currentUser) {
  user.value = currentUser;
  error.value = '';
  loading.value = false;
}

function updateAuthError(authError) {
  user.value = null;
  error.value = authError?.message ?? 'Không thể xác thực người dùng.';
  loading.value = false;
}

// Auth methods
async function signInWithGoogle() {
  error.value = '';
  loading.value = true;

  try {
    await signInWithPopup(auth, googleProvider);
    // onAuthStateChanged will handle the success state
  } catch (authError) {
    error.value = authError instanceof Error ? authError.message : 'Đăng nhập thất bại.';
    loading.value = false;
    throw authError; // Re-throw for component handling
  }
}

async function signOutUser() {
  error.value = '';
  loading.value = true;

  try {
    await signOut(auth);
    // onAuthStateChanged will handle the null user state
  } catch (authError) {
    error.value = authError instanceof Error ? authError.message : 'Đăng xuất thất bại.';
    loading.value = false;
    throw authError; // Re-throw for component handling
  }
}

// Export reactive state and methods
export function useAuth() {
  return {
    // Reactive state
    user: readonly(user),
    loading: readonly(loading),
    error: readonly(error),

    // Computed properties
    isAuthenticated,
    userDisplayName,

    // Methods
    signInWithGoogle,
    signOutUser,

    // State update functions (for App.vue to call)
    updateAuthState,
    updateAuthError,
  };
}
