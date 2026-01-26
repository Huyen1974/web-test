#!/usr/bin/env bash
# =============================================================================
# DOT ENVIRONMENT CONFIGURATION
# =============================================================================
# Provides environment detection and URL/token management for hybrid
# Cloud/Local development.
#
# Usage in bash scripts:
#   source "$(dirname "$0")/../config/environment.sh"
#   init_environment "$@"
#
# Usage in Node.js (reads exported env vars):
#   const directusUrl = process.env.DIRECTUS_URL;
#   const directusToken = process.env.DIRECTUS_TOKEN;
# =============================================================================

# Terminal colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Configuration
CLOUD_DIRECTUS_URL="https://directus-test-pfne2mqwja-as.a.run.app"
CLOUD_NUXT_URL="https://ai.incomexsaigoncorp.vn"
LOCAL_DIRECTUS_URL="http://localhost:8055"
LOCAL_NUXT_URL="http://localhost:3000"

# Script directory for relative paths
DOT_CONFIG_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOT_ROOT="$(cd "$DOT_CONFIG_DIR/.." && pwd)"
PROJECT_ROOT="$(cd "$DOT_ROOT/.." && pwd)"

# =============================================================================
# ENVIRONMENT DETECTION
# =============================================================================

detect_environment() {
    local arg="${1:-}"

    # Manual override via flags (highest priority)
    if [[ "$arg" == "--local" ]]; then
        echo "local"
        return
    fi
    if [[ "$arg" == "--cloud" ]]; then
        echo "cloud"
        return
    fi

    # Check environment variable override
    if [[ "${DOT_ENV:-}" == "local" ]]; then
        echo "local"
        return
    fi
    if [[ "${DOT_ENV:-}" == "cloud" ]]; then
        echo "cloud"
        return
    fi

    # Auto-detect: Check if local Directus container is running and healthy
    if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "directus"; then
        # Verify it's actually responding
        if curl -sf --max-time 2 "http://localhost:8055/server/health" >/dev/null 2>&1; then
            echo "local"
            return
        fi
    fi

    # Default to cloud
    echo "cloud"
}

# =============================================================================
# URL GETTERS
# =============================================================================

get_directus_url() {
    local env
    env=$(detect_environment "$1")
    if [[ "$env" == "local" ]]; then
        echo "$LOCAL_DIRECTUS_URL"
    else
        echo "$CLOUD_DIRECTUS_URL"
    fi
}

get_nuxt_url() {
    local env
    env=$(detect_environment "$1")
    if [[ "$env" == "local" ]]; then
        echo "$LOCAL_NUXT_URL"
    else
        echo "$CLOUD_NUXT_URL"
    fi
}

# =============================================================================
# TOKEN MANAGEMENT
# =============================================================================

# Get Directus admin credentials based on environment
get_admin_credentials() {
    local env
    env=$(detect_environment "$1")

    if [[ "$env" == "local" ]]; then
        # Try .env.local first
        if [[ -f "$PROJECT_ROOT/.env.local" ]]; then
            local email password
            email=$(grep -E "^DIRECTUS_ADMIN_EMAIL=" "$PROJECT_ROOT/.env.local" | cut -d'=' -f2-)
            password=$(grep -E "^DIRECTUS_ADMIN_PASSWORD=" "$PROJECT_ROOT/.env.local" | cut -d'=' -f2-)
            if [[ -n "$email" && -n "$password" ]]; then
                echo "${email}:${password}"
                return
            fi
        fi
        # Default local credentials
        echo "admin@example.com:Directus@2025!"
    else
        # Cloud: use environment variables or credentials.local.json
        local email="${DIRECTUS_ADMIN_EMAIL:-}"
        local password="${DIRECTUS_ADMIN_PASSWORD:-}"

        # Try credentials.local.json if env vars not set
        if [[ -z "$password" && -f "$DOT_CONFIG_DIR/credentials.local.json" ]]; then
            email=$(jq -r '.profiles[0].username // empty' "$DOT_CONFIG_DIR/credentials.local.json" 2>/dev/null)
            password=$(jq -r '.profiles[0].password // empty' "$DOT_CONFIG_DIR/credentials.local.json" 2>/dev/null)
        fi

        if [[ -z "$email" || -z "$password" ]]; then
            echo ""
            return 1
        fi
        echo "${email}:${password}"
    fi
}

# Fetch access token from Directus
get_directus_token() {
    local env url creds email password response token
    env=$(detect_environment "$1")
    url=$(get_directus_url "$1")

    # Check for static token first (for automation)
    if [[ -n "${DIRECTUS_ADMIN_TOKEN:-}" ]]; then
        echo "$DIRECTUS_ADMIN_TOKEN"
        return 0
    fi

    # Get credentials
    creds=$(get_admin_credentials "$1")
    if [[ -z "$creds" ]]; then
        echo "ERROR: No credentials available for $env environment" >&2
        return 1
    fi

    email="${creds%%:*}"
    password="${creds#*:}"

    # Login to get token
    response=$(curl -sS --max-time 10 -X POST "${url}/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"${email}\",\"password\":\"${password}\"}" \
        -w "\n%{http_code}" 2>/dev/null)

    local body code
    body="${response%$'\n'*}"
    code="${response##*$'\n'}"

    if [[ "$code" != "200" ]]; then
        echo "ERROR: Login failed (HTTP $code)" >&2
        return 1
    fi

    token=$(echo "$body" | jq -r '.data.access_token // empty')
    if [[ -z "$token" || "$token" == "null" ]]; then
        echo "ERROR: Token not found in response" >&2
        return 1
    fi

    echo "$token"
}

# =============================================================================
# SAFETY BANNER
# =============================================================================

print_environment_banner() {
    local env
    env=$(detect_environment "$1")
    local directus_url nuxt_url
    directus_url=$(get_directus_url "$1")
    nuxt_url=$(get_nuxt_url "$1")

    echo ""
    if [[ "$env" == "local" ]]; then
        echo -e "${GREEN}${BOLD}┌─────────────────────────────────────────────────────┐${NC}"
        echo -e "${GREEN}${BOLD}│  🟢 LOCAL MODE                                      │${NC}"
        echo -e "${GREEN}${BOLD}│     Directus: ${directus_url}                  │${NC}"
        echo -e "${GREEN}${BOLD}│     Nuxt:     ${nuxt_url}                       │${NC}"
        echo -e "${GREEN}${BOLD}└─────────────────────────────────────────────────────┘${NC}"
    else
        echo -e "${RED}${BOLD}┌─────────────────────────────────────────────────────┐${NC}"
        echo -e "${RED}${BOLD}│  🔴 CLOUD MODE (PRODUCTION)                         │${NC}"
        echo -e "${RED}${BOLD}│     Directus: ${directus_url}${NC}"
        echo -e "${RED}${BOLD}│     Nuxt:     ${nuxt_url}              │${NC}"
        echo -e "${RED}${BOLD}└─────────────────────────────────────────────────────┘${NC}"
    fi
    echo ""
}

# Print destructive operation warning for cloud mode
print_destructive_warning() {
    local env
    env=$(detect_environment "$1")

    if [[ "$env" == "cloud" ]]; then
        echo -e "${RED}${BOLD}⚠️  WARNING: This is a DESTRUCTIVE operation on PRODUCTION!${NC}"
        echo -e "${RED}   Data will be permanently modified/deleted.${NC}"
        echo ""
        read -p "Are you sure you want to continue? (yes/no): " confirm
        if [[ "$confirm" != "yes" ]]; then
            echo "Operation cancelled."
            exit 0
        fi
        echo ""
    fi
}

# =============================================================================
# INITIALIZATION
# =============================================================================

# Initialize environment and export variables for child processes
# Call this at the start of your tool
init_environment() {
    local env flag="${1:-}"

    # Parse --local or --cloud flag
    for arg in "$@"; do
        case "$arg" in
            --local|--cloud)
                flag="$arg"
                break
                ;;
        esac
    done

    env=$(detect_environment "$flag")

    # Export for child processes (Python, Node.js, etc.)
    export DOT_ENV="$env"
    export DIRECTUS_URL=$(get_directus_url "$flag")
    export NUXT_URL=$(get_nuxt_url "$flag")
    export BASE_URL="$DIRECTUS_URL"  # Backward compatibility
    export DIRECTUS_BASE_URL="$DIRECTUS_URL"  # Backward compatibility

    # Try to get token (non-fatal if it fails)
    local token
    token=$(get_directus_token "$flag" 2>/dev/null) || true
    if [[ -n "$token" ]]; then
        export DIRECTUS_TOKEN="$token"
        export DOT_TOKEN="$token"  # Backward compatibility
    fi

    # Export admin credentials for tools that need them
    local creds
    creds=$(get_admin_credentials "$flag" 2>/dev/null) || true
    if [[ -n "$creds" ]]; then
        export DIRECTUS_ADMIN_EMAIL="${creds%%:*}"
        export DIRECTUS_ADMIN_PASSWORD="${creds#*:}"
    fi
}

# =============================================================================
# HELP
# =============================================================================

show_environment_help() {
    cat << 'EOF'
Environment Flags:
  --local     Force local development environment (localhost:8055)
  --cloud     Force cloud/production environment

Auto-Detection:
  If no flag is provided, the tool will automatically detect:
  1. Check if local Directus container is running and healthy
  2. If yes, use local mode; otherwise, use cloud mode

Environment Variables:
  DOT_ENV                   Force environment: "local" or "cloud"
  DIRECTUS_ADMIN_EMAIL      Admin email (for cloud mode)
  DIRECTUS_ADMIN_PASSWORD   Admin password (for cloud mode)
  DIRECTUS_ADMIN_TOKEN      Static admin token (skips login)

EOF
}
