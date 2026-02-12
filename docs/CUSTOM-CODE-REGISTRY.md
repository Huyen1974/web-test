# CUSTOM CODE REGISTRY

Danh sách TẤT CẢ file custom (không có trong Agency OS / Nuxt gốc).
Mục đích: Khi upgrade Nuxt/Directus/Agency OS, review từng file này.
Cập nhật: BẮT BUỘC mỗi khi thêm/sửa custom code.

---

## Server Middleware

### strip-knowledge-cookie.ts
- **File:** `web/server/middleware/strip-knowledge-cookie.ts`
- **Loại:** new
- **Mục đích:** Xóa Directus session cookie khỏi /knowledge routes để Firebase CDN cache HTML
- **Phụ thuộc API:** Nitro `defineEventHandler`, `getRequestURL`, `event.node.res.writeHead`
- **Cách verify:** `curl -sI localhost:3000/knowledge | grep set-cookie` (kỳ vọng: trống)
- **Ngày tạo:** 2026-02-12
- **Tạo bởi:** WEB-70F

## routeRules (nuxt.config.ts)

### SWR Cache 1 năm
- **File:** `web/nuxt.config.ts` (section routeRules)
- **Loại:** modified
- **Mục đích:** Cache vĩnh viễn cho /knowledge routes + immutable cho /_nuxt/
- **Phụ thuộc API:** Nuxt `routeRules.swr` (core feature)
- **Cách verify:** `curl -sI localhost:3000/knowledge | grep s-maxage` (kỳ vọng: 31536000)
- **Ngày tạo:** 2026-02-12
- **Tạo bởi:** WEB-70B

## Directus Flows

### Cache Invalidation — Knowledge Update
- **Loại:** Directus config (không phải code)
- **Mục đích:** Trigger event khi knowledge_documents thay đổi (create/update/delete)
- **Cách verify:** Directus Admin > Settings > Flows
- **Ngày tạo:** 2026-02-12
- **Tạo bởi:** WEB-70F
- **Ghi chú:** Hiện chỉ trigger, chưa có webhook operation. Thêm webhook khi cần.
