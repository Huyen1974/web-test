# DOT Test Login

Purpose
- Wrapper around Playwright login tests against production.

Requirements
- Node.js
- Playwright dependencies (installed via project)

Environment
- PLAYWRIGHT_BASE_URL (optional)
- BASE_URL (optional fallback)

Usage
```bash
./dot/bin/dot-test-login
```

Notes
- The script runs from the repo root and executes the Playwright login spec.
- Pass extra Playwright args after the command.
