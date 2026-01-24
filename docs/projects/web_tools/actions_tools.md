<!-- PROTECTED: MASTER MAP - DO NOT DELETE -->

DOT TOOLCHAIN - BẢN ĐỒ HOÀN CHỈNH
Status: 15/15 Tools Ready (E1 Complete)
Last Updated: 2026-01-24

web-test/
├── dot/                              # 🛠️ KHO VŨ KHÍ (Digital Operations Toolkit)
│   ├── README.md                     # 🗺️ BẢN ĐỒ TỔNG (Bắt buộc đọc đầu tiên)
│   │
│   ├── bin/                          # 🚀 Executables
│   │   │
│   │   │ ─────────── SCHEMA & DATA ───────────
│   │   ├── dot-schema-ensure         # ✅ Kiểm tra Directus schema
│   │   ├── dot-fix-gap3              # ✅ Migration sửa lỗi featured_post
│   │   ├── dot-seed-agency-os        # ✅ Hydrate Agency OS collections + dummy data
│   │   ├── dot-seed-data             # 📋 [PLANNED] Seed dữ liệu mẫu cho môi trường mới
│   │   ├── dot-backup                # ✅ Backup Directus data to JSON
│   │   ├── dot-clean-data            # ✅ Wipe dummy data, keep schema intact
│   │   │
│   │   │ ─────────── AUTH & PERMISSIONS ───────────
│   │   ├── dot-fix-permissions       # ✅ Fix Directus role permissions
│   │   ├── dot-audit-roles           # 📋 [PLANNED] Audit & report all roles/permissions
│   │   ├── dot-create-user           # 📋 [PLANNED] Create user with specific role
│   │   │
│   │   │ ─────────── TESTING & QA ───────────
│   │   ├── dot-test-login            # ✅ Playwright E2E login test
│   │   ├── dot-spider                # ✅ Website health crawler (detect errors)
│   │   ├── dot-smoke-test            # 📋 [PLANNED] Quick smoke test all critical paths
│   │   │
│   │   │ ─────────── INFRASTRUCTURE ───────────
│   │   ├── dot-health-check          # ✅ Health monitoring 4 layers
│   │   ├── dot-cost-audit            # ✅ Cloud cost analysis
│   │   ├── dot-deploy-status         # 📋 [PLANNED] Check Cloud Run deployment status
│   │   ├── dot-logs-tail             # 📋 [PLANNED] Tail logs from Cloud Run services
│   │   │
│   │   │ ─────────── CONTENT & FLOWS ───────────
│   │   ├── dot-flow-trigger          # 📋 [PLANNED] Trigger Directus Flow manually
│   │   ├── dot-cache-warm            # 📋 [PLANNED] Warm cache for critical pages
│   │   └── dot-publish-page          # 📋 [PLANNED] Publish/unpublish page via API
│   │
│   ├── config/                       # ⚙️ Configuration files
│   │   ├── credentials.example.json  # ✅ Template for credentials
│   │   └── credentials.local.json    # 🔒 [GITIGNORED] Local credentials
│   │
│   └── docs/                         # 📘 Hướng dẫn chi tiết
│       ├── README.md                 # Index của tất cả docs
│       ├── schema-ensure.md          # ✅
│       ├── test-login.md             # ✅
│       ├── health-check.md           # ✅
│       ├── cost-audit.md             # ✅
│       ├── spider.md                 # ✅
│       ├── fix-permissions.md        # ✅
│       └── seed-agency-os.md         # ✅
│
├── web/                              # Nuxt Application (VIEW ONLY)
│   ├── package.json                  # npm scripts wrap DOT tools
│   └── docs/
│       └── TESTING.md                # Hướng dẫn testing tổng hợp
│
└── reports/                          # 📊 Báo cáo từ các Agent
    ├── claude-code/                  # Reports từ Claude Code
    ├── cursor/                       # Reports từ Cursor
    ├── codex/                        # Reports từ Codex
    └── screenshots/                  # Screenshots từ Spider & Tests

TOOL STATUS LEGEND

| Icon | Meaning |
|------|---------|
| ✅ | DONE - Đã hoàn thành, đang sử dụng |
| 🚧 | IN PROGRESS - Đang phát triển |
| 📋 | PLANNED - Sẽ làm khi cần (Just-in-Time) |
| 🔒 | GITIGNORED - File local, không commit |

TOOL MATRIX BY CATEGORY

1. SCHEMA & DATA (Quản lý cấu trúc & dữ liệu)

| Tool | Status | Chức năng | Khi nào dùng |
|------|--------|-----------|--------------|
| dot-schema-ensure | ✅ | Verify Directus schema | Deploy mới, sau migration |
| dot-fix-gap3 | ✅ | Fix specific data issues | Hotfix production |
| dot-seed-agency-os | ✅ | Create Agency OS collections + seed data | Deploy mới, fix 403 |
| dot-seed-data | 📋 | Seed sample data | Deploy môi trường mới |
| dot-backup | ✅ | Backup data to JSON | Before major changes |
| dot-clean-data | ✅ | Wipe business data | Before real data input |

2. AUTH & PERMISSIONS (Quản lý quyền hạn)

| Tool | Status | Chức năng | Khi nào dùng |
|------|--------|-----------|--------------|
| dot-fix-permissions | ✅ | Fix role permissions | Lỗi 403, deploy mới |
| dot-audit-roles | 📋 | Report all permissions | Security audit |
| dot-create-user | 📋 | Create user via API | Onboard new user |

3. TESTING & QA (Kiểm tra chất lượng)

| Tool | Status | Chức năng | Khi nào dùng |
|------|--------|-----------|--------------|
| dot-test-login | ✅ | E2E login test | After auth changes |
| dot-spider | ✅ | Crawl & detect errors | After deploy, daily |
| dot-smoke-test | 📋 | Quick critical path test | Pre-release check |

4. INFRASTRUCTURE (Hạ tầng)

| Tool | Status | Chức năng | Khi nào dùng |
|------|--------|-----------|--------------|
| dot-health-check | ✅ | 4-layer health check | Daily monitoring |
| dot-cost-audit | ✅ | Cloud cost analysis | Monthly review |
| dot-deploy-status | 📋 | Check Cloud Run status | After deploy |
| dot-logs-tail | 📋 | Tail service logs | Debugging |

5. CONTENT & FLOWS (Nội dung & Workflow)

| Tool | Status | Chức năng | Khi nào dùng |
|------|--------|-----------|--------------|
| dot-flow-trigger | 📋 | Trigger Directus Flow | Manual workflow run |
| dot-cache-warm | 📋 | Warm page cache | After content update |
| dot-publish-page | 📋 | Publish/unpublish page | Content management |

NGUYÊN TẮC PHÁT TRIỂN TOOL
┌─────────────────────────────────────────────────────────────┐
│  1. UI is for VIEWING → Tool is for ACTION                  │
│  2. Just-in-Time: Gặp vấn đề → Viết Tool → Dùng mãi mãi    │
│  3. Idempotent: Chạy nhiều lần không side effect            │
│  4. Self-documenting: Mỗi tool có --help và docs/           │
│  5. No manual: Tuyệt đối không vào UI để thao tác           │
└─────────────────────────────────────────────────────────────┘

CURRENT PRIORITY

| Priority | Tool | Reason | Status |
|----------|------|--------|--------|
| ~~P0~~ | ~~dot-fix-permissions~~ | ~~Blocking~~ | ✅ DONE |
| ~~P0~~ | ~~dot-seed-agency-os~~ | ~~Collections created~~ | ✅ DONE |
| ~~P0~~ | ~~dot-backup~~ | ~~Checkpoint trước clean~~ | ✅ DONE |
| ~~P0~~ | ~~dot-clean-data~~ | ~~Chuẩn bị Phase 3~~ | ✅ DONE |
| P1 | dot-seed-data | Cần cho deploy môi trường mới | 📋 PLANNED |
| P2 | dot-smoke-test | Consolidate các test lẻ | 📋 PLANNED |
| P3 | Others | Just-in-Time khi cần | |

## PHASE 3 READY TOOLS

Các tool sẵn sàng cho giai đoạn Content & Operation:

| Tool | Chức năng | Cách dùng |
|------|-----------|-----------|
| `dot-backup` | Tạo checkpoint | `./dot/bin/dot-backup` |
| `dot-clean-data` | Xóa dummy data | `./dot/bin/dot-clean-data` |
| `dot-spider` | Verify sau thay đổi | `./dot/bin/dot-spider` |
