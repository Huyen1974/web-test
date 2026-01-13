# ANTIGRAVITY Triage Report: Landing vs Login

## 1. Executive Summary
- **Issue**: Visiting (`/`) redirects to Login.
- **Root Cause**: **Frontend Hardcoded Redirect**.
- **Location**: `web/pages/index.vue`.
- **Finding**: The homepage is explicitly coded to redirect to `/approval-desk` immediately.
- **Secondary Chain**: `/approval-desk` is likely a protected route, which then redirects to Login.

**Conclusion**: The "Blank Page" was believed to be a schema/data issue, but even with data populated, the **Frontend Code** prevents the Landing Page from rendering.

## 2. Evidence
### A) Frontend Code
**File**: `web/pages/index.vue`
```typescript
<script setup lang="ts">
// Redirect homepage to Approval Desk to avoid missing CMS content
await navigateTo('/approval-desk');
</script>
```
*This confirms the redirect is intentional in the current codebase.*

### B) Directus Health (Backend)
- **Public Access**: ✅ **200 OK** for `/items/pages` and `/items/navigation`.
- **Data Status**:
    - Home Page (`/`) exists.
    - Main Navigation exists.
- **Permissions**: Public Role has access (verified by 200 OK response on public API check).
*(Note: Use of `await navigateTo` in `index.vue` bypasses any CMS content rendering logic.)*

### C) Routing Chain
1. User visits `/` -> Hit `web/pages/index.vue`.
2. `index.vue` -> `navigateTo('/approval-desk')`.
3. `/approval-desk` -> Protected Route (likely/Auth Middleware).
4. Auth Middleware -> `navigateTo('/auth/signin')` (Login Page).

## 3. Recommendation
To fix the "Blank Page" / "Login Loop" and render the CMS Landing Page instead:

**Action**: Remove the hardcoded redirect in `web/pages/index.vue` and implement the CMS fetching logic (fetching `pages` collection where `permalink=/`).

**Next CLI**:
`CLI.ANTIGRAVITY.FRONTEND-REMOVE-REDIRECT.v1`
(Or manual fix: Revert `web/pages/index.vue` to render dynamic content).
