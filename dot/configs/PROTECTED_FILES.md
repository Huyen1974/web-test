# PROTECTED FILES — KHONG DUOC XOA TRONG MOI TRUONG HOP

Danh sach files quan trong cho he thong hoat dong.
AI Agents: KHONG XOA bat ky file nao trong danh sach nay.
Neu can sua → tao backup truoc → sua → verify.

## Config Files
- ~/Library/Application Support/Claude/claude_desktop_config.json
- ~/.claude/mcp.json
- web-test/.env.local
- web-test/web/.env
- agent-data-test/.env.local

## MCP/Server Files
- agent-data-test/agent_data/server.py (MCP endpoints tich hop)
- agent-data-test/mcp_server/server.py (MCP HTTP server, port 8001)
- agent-data-test/mcp_server/stdio_server.py (MCP STDIO cho Claude Desktop)

## DOT Tools
- web-test/dot/bin/* (TOAN BO — 64 scripts)
- web-test/dot/configs/* (TOAN BO templates)

## Docker
- web-test/docker-compose.local.yml
- web-test/web/Dockerfile.local

## Credentials (NEVER COMMIT)
- web-test/dot/config/google-credentials.json
- web-test/.env.local (secrets)
- agent-data-test/.env.local (secrets)
