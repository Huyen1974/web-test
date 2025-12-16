# [CURSOR] Post-Login Blank Page Audit Report
**CLI Name:** CLI.CURSOR.AUDIT-POSTLOGIN-BLANK-PAGE.v1.0
**Date:** 2025-12-15
**Target:** Nuxt SPA post-login experience

## Executive Summary
**Root Cause Identified:** Critical authentication middleware mismatch causing redirect loops and blank pages. Users log in with Directus but portal pages use Firebase auth middleware.

## Post-Login Redirect Analysis

### Redirect Target Found
**Default redirect route:** `/portal` (hardcoded in `useDirectusAuth.login()`)

**Code location:**
```typescript
// web/modules/directus/runtime/composables/useDirectusAuth.ts:26-27
const returnPath = route.query.redirect?.toString();
const redirect = returnPath ? returnPath : '/portal';
```

### Target Page Existence & Content
**✅ Page exists:** `web/layers/portal/pages/portal.vue`

**Content analysis:**
- **Layout:** `blank` (minimal layout, just `<slot />`)
- **Middleware:** `['auth']` ← **PROBLEM HERE**
- **Renders:** Sidebar navigation, user dropdown with logout, main content area
- **Uses:** `<NuxtPage />` for nested routes (dashboard, projects, etc.)

**Page should render properly** if authentication state is correct.

## Authentication Middleware Mismatch

### The Critical Issue
**Two conflicting auth systems:**

1. **Login System:** Directus Auth (`useDirectusAuth.login()`)
   - Sets Directus user state
   - Uses `$directus.login()`

2. **Portal Protection:** Firebase Auth Middleware (`web/middleware/auth.ts`)
   - Checks Firebase auth state (`$auth`)
   - Redirects to `/login` if no Firebase user

### Redirect Flow Problem
```
1. User logs in with Directus → ✅ Directus user state set
2. Redirects to /portal → ✅ Navigation works
3. Firebase middleware runs → ❌ No Firebase user found
4. Redirects to /login → ❌ User bounced back
5. Creates blank page / redirect loop
```

### Evidence
**Firebase auth middleware:**
```typescript
// web/middleware/auth.ts:21-28
if (!user && to.path.startsWith('/portal')) {
    return navigateTo({
        path: '/login',
        query: { redirect: to.fullPath },
    });
}
```

**Portal page uses wrong middleware:**
```typescript
// web/layers/portal/pages/portal.vue:6
middleware: ['auth'], // Refers to GLOBAL Firebase auth, not Directus auth
```

## Logout UI Analysis

### Logout Implementation ✅
**Location:** Portal sidebar user dropdown (line 51)
```vue
{ label: 'Sign out', icon: 'i-heroicons-arrow-left-on-rectangle', click: () => logout() }
```

**Function:** `useDirectusAuth().logout()` (correctly implemented)
**Issue:** Logout UI exists but user never reaches portal due to middleware redirect

## User State Dependency

### Potential Blank Page Causes
1. **Middleware redirect loop** (primary issue)
2. **User object null/undefined** → Avatar component fails
3. **Missing nested page content** → `<NuxtPage />` renders nothing

### User-Dependent Elements
- `UAvatar` uses `user.avatar` and `userName(user)` → Could break if user is null
- Sidebar renders regardless of user state
- Main content area uses `<NuxtPage />` → Depends on nested routes

## Root Cause Conclusion

### Primary Root Cause: Authentication Middleware Mismatch
**Severity:** CRITICAL - Prevents users from accessing portal entirely

**Why blank page occurs:**
1. Directus login succeeds but doesn't set Firebase auth state
2. Portal page protected by Firebase auth middleware
3. Middleware sees no Firebase user → redirects to login
4. Login page may redirect back → creates redirect loop or blank state

### Secondary Issues
- User dropdown depends on Directus user object
- Avatar component may fail if user state is null
- No visible error feedback for auth state mismatches

## Recommended Fix Plan

### Minimal Safe Fix (Immediate)
**Change portal page middleware:**
```typescript
// web/layers/portal/pages/portal.vue
definePageMeta({
    layout: 'blank',
    middleware: [], // Remove Firebase auth middleware
    // Add Directus auth check in component if needed
});
```

**Add client-side Directus auth guard:**
```vue
<script setup>
// web/layers/portal/pages/portal.vue
const { user } = useDirectusAuth();

onMounted(() => {
    if (!user.value) {
        navigateTo('/auth/signin');
    }
});
</script>
```

### Alternative: Use Directus Auth Middleware
**Modify portal page to use Directus-specific middleware:**
```typescript
// Requires registering Directus auth middleware globally or per-page
middleware: ['directus-auth'], // If available
```

### Verification Steps
1. Login with Directus → should reach `/portal`
2. Portal should show sidebar navigation
3. User dropdown should show avatar and logout option
4. Logout should work and redirect properly

## Next Steps for Claude
1. **Immediate:** Remove `middleware: ['auth']` from portal.vue
2. **Add client-side auth check** using Directus user state
3. **Test login flow** to ensure portal renders
4. **Verify logout functionality** works from portal

## Files Audited
- `web/modules/directus/runtime/composables/useDirectusAuth.ts`
- `web/layers/portal/pages/portal.vue`
- `web/middleware/auth.ts`
- `web/modules/directus/runtime/middleware/auth.ts`
- `web/layouts/blank.vue`
