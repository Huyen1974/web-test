# dot/configs — Config Templates

Templates cho tat ca config files can thiet de chay local environment.
Secrets duoc thay bang placeholders `__PLACEHOLDER__`.

## Usage

```bash
# Khoi phuc toan bo configs tu templates
./dot/bin/dot-env-restore

# Ghi de configs da co
./dot/bin/dot-env-restore --force

# Backup configs hien tai thanh templates
./dot/bin/dot-env-backup
```

## Files

| Template | Target | Mo ta |
|----------|--------|-------|
| claude-desktop-mcp.json.template | ~/Library/Application Support/Claude/claude_desktop_config.json | MCP config cho Claude Desktop (STDIO transport) |
| claude-code-mcp.json.template | ~/.claude/mcp.json | MCP config cho Claude Code CLI |
| agent-data.env.template | agent-data-test/.env.local | Env vars cho Agent Data local |
| directus.env.template | web-test/.env.local | Env vars cho Directus + full stack local |

## Secrets

Secrets duoc lay tu Google Secret Manager:
- `AGENT_DATA_API_KEY` → `agent-data-api-key`
- `OPENAI_API_KEY` → `OPENAI_API_KEY`
- `QDRANT_API_KEY` → `Qdrant_agent_data_N1D8R2vC0_5`
- `QDRANT_URL` → `QDRANT_URL`

Hoac tu file `.env.local` hien tai (neu co).
