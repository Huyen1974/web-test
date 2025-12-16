# [CURSOR] Frontend Login Error Handling Audit Report
**CLI Name:** CLI.CURSOR.AUDIT-FRONTEND-LOGIN-ERROR-HANDLING.v1.0
**Date:** 2025-12-15
**Target:** Nuxt SPA on Firebase with Directus backend

## Executive Summary
Audit reveals **partial error handling coverage** with critical gaps in initialization and async login flow. Two login systems exist with different error handling quality.

## Login Entry Points Identified

### 1. Directus Auth System (Primary)
**Files:** `web/components/base/LoginForm.vue` + `web/modules/directus/runtime/composables/useDirectusAuth.ts`

**Code Path:**
```
LoginForm.attemptLogin() → useDirectusAuth.login() → $directus.login()
```

**Error Handling:** ✅ **GOOD**
- LoginForm properly catches errors and displays them in UI
- Loading state correctly reset on error
- Error message displayed via UAlert component

```vue
<!-- web/components/base/LoginForm.vue:80-84 -->
try {
  await login(email, password);
} catch (err) {
  error.value = err.message;
}
loading.value = false;
```

### 2. Firebase Auth System (Alternative)
**Files:** `web/pages/login.vue`

**Error Handling:** ✅ **GOOD**
- Proper try/catch with error display
- Loading state correctly managed
- Error shown in UI

```vue
<!-- web/pages/login.vue:17-21 -->
} catch (e: any) {
  error.value = e.message;
} finally {
  loading.value = false;
}
```

## Critical Issues Found

### Issue #1: Silent Auth Plugin Initialization Errors
**File:** `web/modules/directus/runtime/plugins/auth.ts:41-43`
**Severity:** HIGH
**Impact:** User authentication state may fail silently

**Problem Code:**
```typescript
} catch (err: any) {
  // console.error(e)
}
```

**Issue:** Auth plugin swallows ALL initialization errors including:
- `fetchUser()` failures during app startup
- Authentication state initialization problems
- Network connectivity issues with Directus

**Evidence:** Empty catch block with commented console.error suggests known issues being hidden.

### Issue #2: Async Login Flow Error Gap
**File:** `web/modules/directus/runtime/composables/useDirectusAuth.ts:31-34`
**Severity:** MEDIUM
**Impact:** Login appears successful but user fetch fails silently

**Problem Code:**
```typescript
setTimeout(async () => {
  await fetchUser({ fields: ['*', { contacts: ['*'] }] });
  await navigateTo(redirect);
}, 100);
```

**Issue:** No error handling around `fetchUser()` call in setTimeout. If user data fetch fails:
- Login appears successful
- Navigation proceeds
- User ends up on protected page without authentication
- Silent failure with no error indication

### Issue #3: Potential CORS/Network Error Masking
**Context:** Previous CORS matrix showed selective origin support
**Impact:** If browser uses blocked origin, login errors may not surface properly

## Configuration Sanity Check

### Directus Base URL Configuration ✅
**Status:** GOOD - Properly configured

**Source:** `web/modules/directus/runtime/plugins/directus.ts:14-18`
```typescript
const directusBaseUrl =
  config.public.directus?.rest?.baseUrl ||
  config.public.directus?.url ||
  config.public.directusUrl ||
  config.public.siteUrl;
```

**Runtime Config:** Uses `runtimeConfig.public.directus.rest.baseUrl` consistently
**Fallback Chain:** No localhost fallbacks in auth paths
**Production URL:** Correctly resolves to `https://directus-test-812872501910.asia-southeast1.run.app`

## Error Handling Coverage Matrix

| Component | Error Catching | UI Feedback | Loading Reset | Silent Failures |
|-----------|---------------|-------------|---------------|-----------------|
| LoginForm (Directus) | ✅ Try/catch | ✅ UAlert display | ✅ Always | ❌ None found |
| Firebase Login | ✅ Try/catch | ✅ Text display | ✅ Finally block | ❌ None found |
| Auth Plugin Init | ❌ Swallows all | ❌ None | N/A | ✅ **CRITICAL** |
| Post-Login fetchUser | ❌ No try/catch | ❌ None | N/A | ✅ **MODERATE** |

## Root Cause Analysis

### Why "Silent/Stuck" UI Occurs
1. **Auth plugin fails silently** → User state not initialized properly
2. **Post-login fetchUser fails** → Login appears successful but user data missing
3. **CORS issues** → Network errors not properly categorized/surfaced
4. **Navigation proceeds despite failures** → User reaches protected pages without auth

### Why Errors Appear "Swallowed"
- Auth plugin catch block actively suppresses errors
- Post-login async operations lack error boundaries
- No global error handling for authentication flows

## Recommended Fix Plan

### Minimal Safe Fixes (No Breaking Changes)

#### Fix #1: Auth Plugin Error Logging
**File:** `web/modules/directus/runtime/plugins/auth.ts`
**Change:** Replace silent catch with proper error handling

```typescript
} catch (err: any) {
  console.error('[Directus Auth] Initialization failed:', err);
  // Optional: Set error state for UI feedback
  // const authError = useState('auth-error', () => null);
  // authError.value = err.message;
}
```

#### Fix #2: Post-Login Error Handling
**File:** `web/modules/directus/runtime/composables/useDirectusAuth.ts`
**Change:** Add error handling to setTimeout block

```typescript
setTimeout(async () => {
  try {
    await fetchUser({ fields: ['*', { contacts: ['*'] }] });
    await navigateTo(redirect);
  } catch (err: any) {
    console.error('[Directus Auth] Post-login user fetch failed:', err);
    // Optional: Redirect to login with error
    await navigateTo('/auth/signin?error=user-fetch-failed');
  }
}, 100);
```

#### Fix #3: Enhanced LoginForm Error Details
**File:** `web/components/base/LoginForm.vue`
**Change:** Improve error categorization

```typescript
} catch (err) {
  console.error('[Login] Authentication failed:', err);

  // Categorize errors for better UX
  if (err.message?.includes('Failed to fetch')) {
    error.value = 'Network connection failed. Please check your internet connection.';
  } else if (err.message?.includes('CORS')) {
    error.value = 'Authentication service temporarily unavailable. Please try again.';
  } else {
    error.value = err.message || 'Login failed. Please try again.';
  }
}
```

## Implementation Priority
1. **HIGH:** Fix auth plugin silent failures (Fix #1)
2. **MEDIUM:** Add post-login error handling (Fix #2)
3. **LOW:** Enhance error messages (Fix #3)

## Verification Steps
1. Check browser console for auth initialization errors
2. Test login with invalid credentials - should show clear error
3. Test login with network disconnected - should show network error
4. Verify successful login loads user data properly

## Files Audited
- `web/components/base/LoginForm.vue`
- `web/modules/directus/runtime/composables/useDirectusAuth.ts`
- `web/modules/directus/runtime/plugins/auth.ts`
- `web/modules/directus/runtime/plugins/directus.ts`
- `web/pages/login.vue`
- `web/pages/auth/signin.vue`
