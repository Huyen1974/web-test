# Broken Auth Links Audit Report
**CLI Name:** CLI.CURSOR.SWEEP-BROKEN-AUTH-LINKS.v1.0
**Date:** 2025-12-15
**Issue:** Dead `/auth/login` route causing 404s

## Summary
Found **6 occurrences** of `/auth/login` that should be changed to `/auth/signin`. Additionally found **1 suspicious "Login" button** that points to `/portal` instead of a login page.

## Files Requiring Fixes

### 1. Directus Module Configuration
**File:** `web/modules/directus/index.ts`
**Lines:** 37-38
**Current:**
```typescript
redirect: {
    login: '/auth/login',     // ❌ Should be '/auth/signin'
    logout: '/auth/login',    // ❌ Should be '/' or '/auth/signin'
},
```

### 2. Directus Auth Error Handling
**File:** `web/modules/directus/runtime/composables/useDirectusAuth.ts`
**Lines:** 39, 52
**Current:**
```typescript
await navigateTo('/auth/login?error=fetch_user_failed'); // ❌ Line 39
await navigateTo(config.public?.directus?.auth?.redirect?.login || '/auth/login'); // ❌ Line 52
```

### 3. Header Navigation Button (Suspicious)
**File:** `web/components/navigation/TheHeader.vue`
**Line:** 66
**Current:**
```vue
<UButton to="/portal" color="primary" variant="ghost" size="xl">Login</UButton>
```
**Issue:** Button labeled "Login" points to `/portal` instead of login page. Should point to `/auth/signin` or appropriate login route.

## Additional `/login` References (May Be Correct)

These use `/login` (Firebase auth route) - **verify if these should stay as-is:**

### Firebase Auth Pages
- `web/pages/register.vue:58` - Links to `/login`
- `web/pages/logout.vue:13` - Redirects to `/login`
- `web/pages/forgot-password.vue:49` - Links to `/login`
- `web/middleware/auth.ts:23,31` - Firebase auth redirects to `/login`

## Recommended Changes

### Priority 1: Fix Directus Auth Links
Replace all `/auth/login` with `/auth/signin`:

1. **Directus Module Config:**
```typescript
redirect: {
    login: '/auth/signin',
    logout: '/', // Or appropriate logout redirect
},
```

2. **Directus Auth Composable:**
```typescript
await navigateTo('/auth/signin?error=fetch_user_failed');
await navigateTo(config.public?.directus?.auth?.redirect?.login || '/auth/signin');
```

### Priority 2: Fix Header Button
```vue
<UButton to="/auth/signin" color="primary" variant="ghost" size="xl">Login</UButton>
```

### Priority 3: Verify Firebase Links
Confirm that Firebase auth pages (`/login`, `/register`, `/forgot-password`) should continue using `/login` or if they should also use `/auth/signin`.

## Impact Assessment
- **Directus users:** Will get 404 on auth errors without these fixes
- **Header navigation:** "Login" button currently goes to portal (may work for logged-in users but confusing)
- **Firebase users:** May be unaffected if using separate auth system

## Verification
After changes:
1. Directus auth errors should redirect to working `/auth/signin` page
2. Header "Login" button should go to appropriate login page
3. No 404 errors on auth-related navigation
