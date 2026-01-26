# DOT Spider - Website Health Crawler

## Overview

DOT Spider is a Playwright-based health check crawler that automatically detects errors on your website. It logs in, crawls pages, and reports any issues found.

## Features

- **Login Support**: Authenticate with credential profiles
- **Google-bot Crawling**: Discovers links and crawls the site
- **Health Checks**:
  - JavaScript errors (uncaught exceptions)
  - Console errors
  - Visible error text in page content
  - Slow page detection (>3s warning, >5s error)
  - Empty page detection
- **Screenshots**: Automatically captures error pages
- **Pretty Output**: Color-coded terminal output

## Installation

Spider uses Playwright from the web project. Ensure it's installed:

```bash
cd web
pnpm install
npx playwright install chromium
```

## Credentials Setup

### Option 1: Local Config File (Recommended)

Copy the example and add your credentials:

```bash
cp dot/config/credentials.example.json dot/config/credentials.local.json
# Edit with your credentials
```

Format:
```json
{
  "profiles": [
    {
      "name": "production-admin",
      "domain": "https://ai.incomexsaigoncorp.vn",
      "username": "admin@example.com",
      "password": "your-password"
    }
  ],
  "defaultProfile": "production-admin"
}
```

### Option 2: Environment Variables

```bash
export DIRECTUS_ADMIN_EMAIL=admin@example.com
export DIRECTUS_ADMIN_PASSWORD=your-password
export SPIDER_DOMAIN=https://ai.incomexsaigoncorp.vn
```

## Usage

```bash
# Basic run
./dot/bin/dot-spider

# Limit pages
./dot/bin/dot-spider --max-pages 10

# Use specific profile
./dot/bin/dot-spider --profile production-admin

# Verbose mode (show all console output)
./dot/bin/dot-spider --verbose

# Skip login (for public pages)
./dot/bin/dot-spider --no-login

# Show help
./dot/bin/dot-spider --help
```

## Output

```
🕷️ DOT SPIDER - https://ai.incomexsaigoncorp.vn
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[LOGIN] Authenticating as admin@example.com...
[LOGIN] Success! Redirected to: /portal

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[1/50] /portal
  ✅ OK (423ms)
  📎 Found 5 new links

[2/50] /portal/projects
  ❌ FAIL (1823ms)
  └─ JS_ERROR: TypeError: Cannot read properties of null
  └─ CONSOLE_ERROR: Uncaught TypeError at projects.vue:45
  📷 Screenshot: error-portal-projects-2026-01-23.png
  📎 Found 3 new links

[3/50] /portal/settings
  ⚠️ WARN (3245ms)
  └─ SLOW_PAGE: Load time 3245ms > 3000ms
  📎 Found 2 new links

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total pages crawled: 15
✅ OK: 12
❌ FAIL: 2
⚠️ WARN: 1

❌ ERRORS FOUND:
  /portal/projects → TypeError: Cannot read properties of null
  /portal/broken → 404 Not Found
```

## Error Detection

### JavaScript Errors (JS_ERROR)
Captures uncaught exceptions via `page.on('pageerror')`.

### Console Errors (CONSOLE_ERROR)
Captures `console.error()` messages.

### Visible Errors (VISIBLE_ERROR)
Searches page content for error patterns:
- TypeError, ReferenceError, SyntaxError
- "Cannot read properties of null/undefined"
- "Internal Server Error", "500 Error"
- "An error occurred", "Something went wrong"

### Slow Pages (SLOW_PAGE)
- Warning: >3000ms load time
- Error: >5000ms load time

### Empty Pages (EMPTY_PAGE)
Pages with minimal content (<100 chars).

## Screenshots

Error screenshots are saved to:
```
reports/screenshots/error-[page-slug]-[timestamp].png
```

## Exit Codes

- `0`: All pages OK
- `1`: One or more pages failed

## CI/CD Integration

```yaml
# GitHub Actions example
- name: Run Spider Health Check
  run: ./dot/bin/dot-spider --max-pages 20
```

## Troubleshooting

### "Playwright not found"
```bash
cd web && pnpm install && npx playwright install chromium
```

### "No credentials found"
Create `dot/config/credentials.local.json` or set environment variables.

### Login fails
Check credentials and ensure the login form selectors match your site.
