import { ref, computed, readonly, onUnmounted } from 'vue';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';

import { auth } from '../firebase/config';

// Reactive state
const user = ref(null);
const loading = ref(true);
const error = ref('');

// Auth state change listener
let unsubscribe = null;

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Computed properties
const isAuthenticated = computed(() => !!user.value);
const userDisplayName = computed(
  () => user.value?.displayName || user.value?.email || 'Tài khoản'
);

// Initialize auth listener
function initializeAuth() {
  if (unsubscribe) return; // Already initialized

  unsubscribe = onAuthStateChanged(
    auth,
    (currentUser) => {
      user.value = currentUser;
      error.value = '';
      loading.value = false;
    },
    (authError) => {
      user.value = null;
      error.value = authError?.message ?? 'Không thể xác thực người dùng.';
      loading.value = false;
    }
  );
}

// Cleanup function
function cleanupAuth() {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
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

// Initialize auth when composable is first used
initializeAuth();

// Cleanup when component unmounts (Vue will call this automatically in composables)
onUnmounted(cleanupAuth);

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

    // Cleanup (for manual cleanup if needed)
    cleanupAuth,
  };
}
