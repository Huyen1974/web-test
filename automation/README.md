# Automation — AI Trigger Suite

Production-grade Playwright automation for triggering ChatGPT and Google Gemini with self-healing sessions, retry logic, and structured logging.

## Quick Start

```bash
# Install dependencies
cd automation && npm install

# First-time setup: login to ChatGPT (interactive)
node trigger-gpt.js --setup

# First-time setup: login to Gemini (interactive)
node trigger-gemini.js --setup

# Send a prompt
node trigger-gpt.js --prompt "Check Agent Data health status"
node trigger-gemini.js --prompt "Summarize today's tasks"
```

## Files

| File | Purpose |
|------|---------|
| `trigger-gpt.js` | ChatGPT trigger with session management |
| `trigger-gemini.js` | Gemini trigger with session management |
| `config.js` | Shared configuration (endpoints, paths) |
| `lib/human-typer.js` | Natural typing simulation (typos, pauses) |
| `lib/agent-data-writer.js` | Agent Data API client |
| `agent-data-openapi.json` | OpenAPI spec for GPT Actions |

## Usage

### ChatGPT Trigger

```bash
node trigger-gpt.js --setup                              # Interactive login
node trigger-gpt.js --check                              # Verify session alive
node trigger-gpt.js --prompt "message"                   # Send to default ChatGPT
node trigger-gpt.js --prompt "msg" --url "https://..."   # Send to custom GPT
node trigger-gpt.js --prompt "msg" --retry 5             # Custom retry count
node trigger-gpt.js --prompt "msg" --timeout 180         # Custom timeout (seconds)
node trigger-gpt.js --file prompt.md                     # Read prompt from file
```

### Gemini Trigger

```bash
node trigger-gemini.js --setup                            # Interactive login
node trigger-gemini.js --check                            # Verify session alive
node trigger-gemini.js --prompt "message"                 # Send to Gemini
node trigger-gemini.js --prompt "msg" --retry 5           # Custom retry count
node trigger-gemini.js --prompt "msg" --timeout 180       # Custom timeout (seconds)
node trigger-gemini.js --file prompt.md                   # Read prompt from file
```

## Exit Codes

| Code | Meaning | Action |
|------|---------|--------|
| 0 | Success | Prompt delivered and response received |
| 1 | Error | Check logs for details |
| 2 | Session expired | Run `--setup` to re-login |
| 3 | Timeout | Increase `--timeout` or check connectivity |
| 4 | Navigation failed | Check URL validity, retry later |

## Session Management

### How It Works

Sessions are stored as persistent Chrome profiles:

- **GPT**: `~/.playwright-sessions/gpt/`
- **Gemini**: `~/.playwright-sessions/gemini/`

Before each run, the script creates a timestamped backup (max 3 kept):

```
~/.playwright-sessions/gpt-backup-2026-02-13T08-46-55/
```

### Session Recovery

If a session becomes corrupted:

```bash
# Check session health
node trigger-gpt.js --check

# If expired (exit code 2), re-login
node trigger-gpt.js --setup

# If backup exists, restore manually
rm -rf ~/.playwright-sessions/gpt
cp -r ~/.playwright-sessions/gpt-backup-<timestamp> ~/.playwright-sessions/gpt
```

### SingletonLock

Chrome uses a lock file to prevent concurrent access. If a previous run crashed:

```bash
# The scripts auto-clean stale locks, but if needed:
rm ~/.playwright-sessions/gpt/SingletonLock
```

## Logging

Logs are written to `~/Documents/logs/automation/`:

```
~/Documents/logs/automation/
  gpt-trigger-2026-02-13.log     # Daily GPT log
  gemini-trigger-2026-02-13.log  # Daily Gemini log
  trigger-gpt.log                # Legacy log (old runs)
  gpt-session-expired.png        # Screenshots on failure
```

### Log Format

```
[2026-02-13 08:46:55] [INFO] [INIT] Mode: check, headless: false, retry: 3, timeout: 120s
[2026-02-13 08:46:57] [INFO] [SESSION] Backup created: ...
[2026-02-13 08:46:59] [INFO] [NAVIGATE] Attempt 1/3: https://chatgpt.com
[2026-02-13 08:47:03] [ERROR] [SESSION] Session expired. Run: node trigger-gpt.js --setup
```

Levels: `INFO`, `WARN`, `ERROR`
Phases: `INIT`, `SESSION`, `NAVIGATE`, `TYPE`, `RESPONSE`, `CONFIRM`, `CLEANUP`

## Production Features

### Self-Healing

- **Session backup/restore**: Auto-backup before each run, max 3 kept
- **SingletonLock cleanup**: Detects and removes stale Chrome locks
- **404 recovery**: On custom GPT 404, warms up via chatgpt.com then retries
- **Confirm/Deny auto-click**: Handles GPT Actions trust dialog automatically

### Retry Logic

- Navigation retry with exponential backoff (5s, 15s, 30s)
- Configurable retry count via `--retry N`
- Page state detection: `ready`, `logged_out`, `404`, `cloudflare`, `unknown`

### Graceful Shutdown

- SIGINT/SIGTERM handlers close Chrome cleanly
- uncaughtException handler with screenshot capture
- Proper exit codes for all failure modes

## Configuration

Edit `config.js` to change endpoints or paths:

```javascript
module.exports = {
  agentData: {
    local: 'http://localhost:8000',
    vps: 'https://vps.incomexsaigoncorp.vn/api',
    default: process.env.AGENT_DATA_URL || 'https://vps.incomexsaigoncorp.vn/api',
  },
  playwright: {
    headed: true,      // Cloudflare blocks headless
    channel: 'chrome',
  },
  logs: {
    dir: '~/Documents/logs/automation/',
  },
};
```

## Requirements

- Node.js 18+
- Playwright (`npm install`)
- Chrome browser (Chromium won't bypass Cloudflare)

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| Exit code 2 on every run | Session cookies expired | `--setup` to re-login |
| "Cannot find module" | Missing dependencies | `npm install` in automation/ |
| Chrome won't launch | SingletonLock from crash | Script auto-cleans; or `rm SingletonLock` |
| 404 on custom GPT URL | Wrong URL or not logged in | Verify URL, check session |
| Cloudflare challenge loop | Using headless mode | Keep `headed: true` in config |
| "Target closed" error | Chrome crashed mid-run | Retry; check system resources |
| GPT Actions "Confirm" popup | First-time API trust gate | Script auto-clicks Confirm |
