<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { marked } from 'marked';
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';

import { auth } from './lib/firebase';

marked.setOptions({ gfm: true, breaks: true });

const API_BASE_URL = 'https://agent-data-test-service-pfne2mqwja-as.a.run.app';
const DEFAULT_PROMPT_HTML =
  '<p class="text-body-2">Chọn một tài liệu trong cây tri thức để xem nội dung.</p>';

const user = ref(null);
const authLoading = ref(true);
const authError = ref('');
const googleLoading = ref(false);
const signupLoading = ref(false);
const pendingVerificationMessage = ref('');

const signupForm = reactive({
  displayName: '',
  email: '',
  password: '',
});

const signupErrors = reactive({
  displayName: '',
  email: '',
  password: '',
});

const snackbar = reactive({
  show: false,
  text: '',
  color: 'primary',
});

const state = reactive({
  treeItems: [],
  isLoadingTree: false,
  treeError: '',
  active: [],
});

const contentState = reactive({
  isLoading: false,
  error: '',
  title: 'Chọn một tài liệu',
  bodyHtml: DEFAULT_PROMPT_HTML,
});

const isDrawerOpen = ref(true);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

const flatNodes = computed(() => {
  const result = new Map();
  const stack = [...state.treeItems];
  while (stack.length) {
    const node = stack.pop();
    if (!node) continue;
    result.set(node.id, node);
    if (Array.isArray(node.children) && node.children.length) {
      stack.push(...node.children);
    }
  }
  return result;
});

const isAuthenticated = computed(() => !!user.value);
const userDisplayName = computed(
  () => user.value?.displayName || user.value?.email || 'Khách'
);

function showSnackbar(text, color = 'primary') {
  snackbar.text = text;
  snackbar.color = color;
  snackbar.show = true;
}

function resetContentPane() {
  contentState.title = 'Chọn một tài liệu';
  contentState.bodyHtml = DEFAULT_PROMPT_HTML;
  contentState.error = '';
  contentState.isLoading = false;
  state.active = [];
}

function resetTreeState() {
  state.treeItems = [];
  state.treeError = '';
  state.active = [];
}

function inferDocumentId(identifier) {
  return typeof identifier === 'string' && identifier.includes('-')
    ? identifier
    : null;
}

function normaliseTree(items = []) {
  return items.map((item) => {
    const documentId = item.source_document_id || inferDocumentId(item.id);
    return {
      id: item.id,
      title: item.title,
      documentId,
      children: normaliseTree(item.children || []),
    };
  });
}

async function fetchTree() {
  if (!user.value) return;
  state.isLoadingTree = true;
  state.treeError = '';
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/knowledge-tree`);
    if (!response.ok) {
      throw new Error(`Fetch tree failed with status ${response.status}`);
    }
    const payload = await response.json();
    state.treeItems = normaliseTree(payload?.tree ?? []);
    if (!state.treeItems.length) {
      state.treeError = 'Không tìm thấy dữ liệu cây tri thức.';
    }
  } catch (error) {
    console.error('Failed to load tree', error);
    state.treeError = 'Không thể tải cây tri thức. Vui lòng thử lại sau.';
    state.treeItems = [];
  } finally {
    state.isLoadingTree = false;
  }
}

async function loadDocumentContent(documentId, title) {
  if (!documentId) {
    contentState.title = title || 'Tài liệu';
    contentState.bodyHtml =
      '<p class="text-body-2">Không có nội dung để hiển thị cho mục đã chọn.</p>';
    contentState.error = '';
    return;
  }

  if (!user.value) return;

  contentState.isLoading = true;
  contentState.error = '';
  contentState.title = title || 'Đang tải tài liệu...';

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/documents/${documentId}`);
    if (!response.ok) {
      throw new Error(`Document fetch failed with status ${response.status}`);
    }
    const data = await response.json();
    const body = data?.content?.body;
    if (!body) {
      contentState.bodyHtml =
        '<p class="text-body-2">Tài liệu không chứa nội dung hiển thị.</p>';
    } else {
      contentState.bodyHtml = marked.parse(body);
    }
    contentState.title = data?.metadata?.title || title || 'Tài liệu';
  } catch (error) {
    console.error('Failed to load document content', error);
    contentState.error = 'Không thể tải nội dung tài liệu từ backend.';
    contentState.bodyHtml = '';
  } finally {
    contentState.isLoading = false;
  }
}

watch(
  () => state.active,
  (active) => {
    if (!active?.length) {
      resetContentPane();
      return;
    }
    const node = flatNodes.value.get(active[0]);
    if (!node) return;
    if (!node.documentId) {
      contentState.title = node.title;
      contentState.bodyHtml =
        '<p class="text-body-2">Mục này không chứa tài liệu. Chọn một tập tin để xem nội dung.</p>';
      contentState.error = '';
      return;
    }
    loadDocumentContent(node.documentId, node.title);
  },
  { deep: false }
);

function normaliseAuthError(error) {
  if (!error) return 'Đã xảy ra lỗi không xác định.';
  const code = error.code || '';
  switch (code) {
    case 'auth/popup-closed-by-user':
      return 'Cửa sổ xác thực đã bị đóng. Vui lòng thử lại.';
    case 'auth/account-exists-with-different-credential':
      return 'Email đã được đăng ký với phương thức khác. Hãy đăng nhập bằng phương thức phù hợp.';
    case 'auth/email-already-in-use':
      return 'Email này đã được sử dụng. Vui lòng đăng nhập hoặc chọn email khác.';
    case 'auth/weak-password':
      return 'Mật khẩu quá yếu. Vui lòng sử dụng ít nhất 8 ký tự.';
    case 'auth/network-request-failed':
      return 'Không thể kết nối tới máy chủ. Kiểm tra kết nối mạng của bạn.';
    default:
      return error.message || 'Đã xảy ra lỗi. Vui lòng thử lại.';
  }
}

async function handleGoogleSignIn() {
  authError.value = '';
  googleLoading.value = true;
  try {
    await signInWithPopup(auth, googleProvider);
    showSnackbar('Đăng nhập Google thành công.', 'success');
  } catch (error) {
    authError.value = normaliseAuthError(error);
  } finally {
    googleLoading.value = false;
  }
}

function validateSignupForm() {
  let isValid = true;
  signupErrors.displayName = '';
  signupErrors.email = '';
  signupErrors.password = '';

  if (!signupForm.displayName.trim()) {
    signupErrors.displayName = 'Hãy nhập tên hiển thị.';
    isValid = false;
  }
  const emailRegex = /[^@\s]+@[^@\s]+\.[^@\s]+/;
  if (!emailRegex.test(signupForm.email)) {
    signupErrors.email = 'Email không hợp lệ.';
    isValid = false;
  }
  if (signupForm.password.length < 8) {
    signupErrors.password = 'Mật khẩu phải có ít nhất 8 ký tự.';
    isValid = false;
  }
  return isValid;
}

async function handleEmailSignup() {
  authError.value = '';
  if (!validateSignupForm()) return;

  signupLoading.value = true;
  try {
    const credential = await createUserWithEmailAndPassword(
      auth,
      signupForm.email,
      signupForm.password
    );
    const trimmedName = signupForm.displayName.trim();
    if (trimmedName) {
      await updateProfile(credential.user, { displayName: trimmedName });
    }
    await sendEmailVerification(credential.user);
    pendingVerificationMessage.value = `Đã gửi email xác minh tới ${signupForm.email}. Vui lòng kiểm tra hộp thư.`;
    showSnackbar(pendingVerificationMessage.value, 'info');
    signupForm.displayName = '';
    signupForm.email = '';
    signupForm.password = '';
  } catch (error) {
    authError.value = normaliseAuthError(error);
  } finally {
    signupLoading.value = false;
  }
}

async function signOutUser() {
  try {
    await signOut(auth);
    showSnackbar('Đã đăng xuất khỏi hệ thống.', 'info');
  } catch (error) {
    showSnackbar(normaliseAuthError(error), 'error');
  }
}

onMounted(() => {
  onAuthStateChanged(auth, (currentUser) => {
    user.value = currentUser;
    authLoading.value = false;
    if (currentUser) {
      fetchTree();
      if (pendingVerificationMessage.value) {
        showSnackbar(pendingVerificationMessage.value, 'info');
        pendingVerificationMessage.value = '';
      }
    } else {
      resetTreeState();
      resetContentPane();
    }
  });
});
</script>

<template>
  <v-app>
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      variant="flat"
      multi-line
      timeout="6000"
      location="top right"
    >
      {{ snackbar.text }}
    </v-snackbar>

    <template v-if="authLoading">
      <v-main class="bg-grey-lighten-5">
        <v-container class="fill-height" fluid>
          <v-row align="center" justify="center">
            <v-progress-circular indeterminate size="56" color="primary" />
          </v-row>
        </v-container>
      </v-main>
    </template>

    <template v-else-if="!isAuthenticated">
      <v-main class="auth-background">
        <v-container class="fill-height" fluid>
          <v-row align="center" justify="center">
            <v-col cols="12" sm="8" md="5" lg="4">
              <v-card elevation="8" class="pa-6 auth-card">
                <div class="text-center mb-6">
                  <h1 class="text-h5 font-weight-semibold mb-1">Agent Data Console</h1>
                  <p class="text-body-2 text-medium-emphasis">
                    Đăng nhập để truy cập hệ thống tri thức của bạn
                  </p>
                </div>

                <v-alert v-if="authError" type="error" class="mb-4">
                  {{ authError }}
                </v-alert>

                <v-btn
                  color="primary"
                  size="large"
                  block
                  prepend-icon="mdi-google"
                  class="mb-4"
                  :loading="googleLoading"
                  @click="handleGoogleSignIn"
                >
                  Đăng nhập bằng Google
                </v-btn>

                <v-divider class="my-4">
                  <span class="text-caption text-medium-emphasis px-2">hoặc đăng ký tài khoản</span>
                </v-divider>

                <v-form @submit.prevent="handleEmailSignup">
                  <v-text-field
                    v-model="signupForm.displayName"
                    label="Tên hiển thị"
                    variant="outlined"
                    class="mb-3"
                    :error-messages="signupErrors.displayName ? [signupErrors.displayName] : []"
                    required
                  />
                  <v-text-field
                    v-model="signupForm.email"
                    label="Email"
                    type="email"
                    variant="outlined"
                    class="mb-3"
                    :error-messages="signupErrors.email ? [signupErrors.email] : []"
                    required
                  />
                  <v-text-field
                    v-model="signupForm.password"
                    label="Mật khẩu"
                    type="password"
                    variant="outlined"
                    class="mb-4"
                    :error-messages="signupErrors.password ? [signupErrors.password] : []"
                    required
                  />
                  <v-btn
                    type="submit"
                    color="primary"
                    size="large"
                    block
                    prepend-icon="mdi-email-plus"
                    :loading="signupLoading"
                  >
                    Tạo tài khoản
                  </v-btn>
                </v-form>
              </v-card>
            </v-col>
          </v-row>
        </v-container>
      </v-main>
    </template>

    <template v-else>
      <v-app-bar density="comfortable" color="white" elevate-on-scroll>
        <v-app-bar-nav-icon
          class="d-sm-none"
          @click="isDrawerOpen = !isDrawerOpen"
        />
        <v-toolbar-title class="text-primary font-weight-bold">
          Agent Data Console
        </v-toolbar-title>
        <v-spacer />
        <div class="d-flex align-center mr-4">
          <v-icon color="success" size="small">mdi-lightning-bolt</v-icon>
          <span class="text-caption ml-2">Live backend connected</span>
        </div>
        <v-chip
          prepend-icon="mdi-account-circle"
          color="primary"
          variant="tonal"
          class="text-body-2 mr-2"
        >
          {{ userDisplayName }}
        </v-chip>
        <v-btn
          variant="text"
          color="primary"
          prepend-icon="mdi-logout"
          @click="signOutUser"
        >
          Đăng xuất
        </v-btn>
      </v-app-bar>

      <v-navigation-drawer
        v-model="isDrawerOpen"
        class="pa-0"
        :rail="false"
        :temporary="$vuetify.display.smAndDown"
        width="320"
      >
        <div class="pa-4">
          <h3 class="text-subtitle-1 font-weight-medium mb-1">Cây tri thức</h3>
          <p class="text-caption text-medium-emphasis mb-4">
            Chọn tài liệu để xem nội dung mới nhất từ backend.
          </p>
          <v-alert
            v-if="state.treeError"
            type="error"
            density="compact"
            class="mb-4"
          >
            {{ state.treeError }}
          </v-alert>
          <div v-if="state.isLoadingTree" class="d-flex justify-center py-6">
            <v-progress-circular indeterminate color="primary" />
          </div>
          <v-treeview
            v-else
            v-model:activated="state.active"
            :items="state.treeItems"
            item-title="title"
            item-value="id"
            activatable
            open-on-click
            :rounded="true"
            density="compact"
            color="primary"
          >
            <template #prepend="{ item }">
              <v-icon
                size="small"
                :color="item.children?.length ? 'primary' : 'grey-darken-2'"
              >
                {{ item.children?.length ? 'mdi-folder-outline' : 'mdi-file-document-outline' }}
              </v-icon>
            </template>
          </v-treeview>
        </div>
      </v-navigation-drawer>

      <v-main class="bg-grey-lighten-5">
        <v-container class="py-8" fluid>
          <v-row>
            <v-col cols="12">
              <v-card elevation="2" class="pa-6">
                <div class="d-flex align-center justify-space-between mb-4">
                  <div>
                    <h2 class="text-h5 font-weight-medium mb-1">
                      {{ contentState.title }}
                    </h2>
                    <p class="text-caption text-medium-emphasis">
                      Nội dung hiển thị trực tiếp từ Firestore (kb_documents).
                    </p>
                  </div>
                  <div class="d-flex align-center text-caption">
                    <v-icon color="primary" class="mr-1">mdi-database-outline</v-icon>
                    Revision live sync
                  </div>
                </div>

                <v-alert
                  v-if="contentState.error"
                  type="error"
                  density="comfortable"
                  class="mb-4"
                >
                  {{ contentState.error }}
                </v-alert>

                <div v-if="contentState.isLoading" class="py-10 text-center">
                  <v-progress-circular indeterminate size="48" color="primary" />
                </div>

                <div
                  v-else
                  class="document-body"
                  v-html="contentState.bodyHtml"
                />
              </v-card>
            </v-col>
          </v-row>
        </v-container>
      </v-main>
    </template>
  </v-app>
</template>

<style scoped>
.document-body {
  background: #ffffff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: inset 0 0 0 1px rgba(25, 118, 210, 0.08);
  max-height: 65vh;
  overflow-y: auto;
}

.document-body :deep(h1),
.document-body :deep(h2),
.document-body :deep(h3) {
  color: #0d47a1;
  font-weight: 600;
}

.document-body :deep(pre) {
  background: #0d1117;
  color: #f8f8f2;
  padding: 16px;
  border-radius: 8px;
  overflow-x: auto;
}

.document-body :deep(code) {
  background: rgba(25, 118, 210, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
}

.document-body :deep(table) {
  width: 100%;
  border-collapse: collapse;
}

.document-body :deep(th),
.document-body :deep(td) {
  border: 1px solid rgba(33, 150, 243, 0.2);
  padding: 8px 12px;
  text-align: left;
}

.auth-background {
  background: linear-gradient(135deg, #1976d2 0%, #0d47a1 100%);
}

.auth-card {
  border-radius: 16px;
}
</style>
