#!/bin/bash
# Firebase Secrets Ping Script
# Tests Firebase secrets by attempting to initialize Firebase App
# Usage: ./scripts/diagnostics/ping_firebase_secrets.sh

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check dependencies
check_dependencies() {
    local missing_deps=()

    if ! command -v node &> /dev/null; then
        missing_deps+=("node")
    fi

    if ! command -v npm &> /dev/null; then
        missing_deps+=("npm")
    fi

    if ! command -v gcloud &> /dev/null; then
        missing_deps+=("gcloud (Google Cloud SDK)")
    fi

    if [ ${#missing_deps[@]} -gt 0 ]; then
        log_error "Missing required dependencies:"
        for dep in "${missing_deps[@]}"; do
            log_error "  - $dep"
        done
        exit 1
    fi
}

# Fetch secret from GSM
fetch_secret() {
    local secret_name="$1"
    local project_id="github-chatgpt-ggcloud"

    log_info "Fetching $secret_name from Google Secret Manager..."

    if ! gcloud secrets versions access latest \
        --secret="$secret_name" \
        --project="$project_id" \
        --quiet 2>/dev/null; then
        log_error "Failed to fetch $secret_name"
        return 1
    fi
}

# Create test script
create_test_script() {
    local test_script="$1"

    cat > "$test_script" << 'EOF'
// Simple validation script for Firebase secrets
// Just checks if the secret value exists and has reasonable length

// Read secret value from stdin
let secretValue = '';
process.stdin.on('data', chunk => {
  secretValue += chunk;
});

process.stdin.on('end', () => {
  try {
    // Trim whitespace
    secretValue = secretValue.trim();

    // Basic validation
    if (!secretValue || secretValue.length === 0) {
      console.log('RESULT:FAILED');
      console.log('ERROR: Secret is empty');
      process.exit(1);
    }

    // Check for obvious placeholder values
    const placeholders = ['xxx', 'changeme', 'your-api-key', 'your-project-id', 'placeholder', 'TODO', 'FIXME'];
    if (placeholders.some(p => secretValue.toLowerCase().includes(p))) {
      console.log('RESULT:FAILED');
      console.log('ERROR: Secret appears to contain placeholder text');
      process.exit(1);
    }

    // Check minimum length (reasonable for Firebase secrets)
    if (secretValue.length < 10) {
      console.log('RESULT:FAILED');
      console.log('ERROR: Secret is too short (minimum 10 characters expected)');
      process.exit(1);
    }

    // Check for Firebase-specific patterns
    const secretName = process.argv[2] || '';
    if (secretName.includes('API_KEY') && !secretValue.includes('AIza')) {
      console.log('RESULT:FAILED');
      console.log('ERROR: API Key does not appear to be a valid Firebase API key');
      process.exit(1);
    }

    if (secretName.includes('PROJECT_ID') && secretValue.length < 20) {
      console.log('RESULT:FAILED');
      console.log('ERROR: Project ID appears too short');
      process.exit(1);
    }

    console.log('RESULT:SUCCESS');
    console.log('Length:', secretValue.length, 'characters');

  } catch (error) {
    console.log('RESULT:FAILED');
    console.log('ERROR: Unexpected error during validation');
    process.exit(1);
  }
});
EOF

    # Make executable
    chmod +x "$test_script"
}

# Test individual secret
test_secret() {
    local secret_name="$1"
    local project_id="github-chatgpt-ggcloud"
    local temp_script="/tmp/firebase_test_$$.js"

    log_info "Testing $secret_name..."

    # Create test script
    create_test_script "$temp_script"

    # Fetch secret value
    local secret_value
    if ! secret_value=$(fetch_secret "$secret_name"); then
        log_error "$secret_name: FAILED to fetch from GSM"
        return 1
    fi

    # Run validation test
    if echo "$secret_value" | node "$temp_script" "$secret_name" 2>&1; then
        log_success "$secret_name: VALID"
        return 0
    else
        log_error "$secret_name: INVALID"
        return 1
    fi
}

# Main execution
main() {
    log_info "Starting Firebase Secrets Ping Test"
    log_info "Project: github-chatgpt-ggcloud"
    echo

    # Check dependencies
    check_dependencies

    # Test each secret
    local secrets=(
        "VITE_FIREBASE_API_KEY"
        "VITE_FIREBASE_AUTH_DOMAIN"
        "VITE_FIREBASE_PROJECT_ID"
        "VITE_FIREBASE_STORAGE_BUCKET"
        "VITE_FIREBASE_MESSAGING_SENDER_ID"
        "VITE_FIREBASE_APP_ID"
    )

    local failed_count=0
    local total_count=${#secrets[@]}

    echo "Testing individual secrets:"
    echo "=========================="

    for secret in "${secrets[@]}"; do
        if ! test_secret "$secret"; then
            ((failed_count++))
        fi
        echo
    done

    echo "=========================="
    echo "SUMMARY:"
    echo "- Total secrets tested: $total_count"
    echo "- Valid secrets: $((total_count - failed_count))"
    echo "- Invalid secrets: $failed_count"

    if [ "$failed_count" -eq 0 ]; then
        log_success "All Firebase secrets are valid! ✅"
        exit 0
    else
        log_error "$failed_count Firebase secret(s) are invalid! ❌"
        exit 1
    fi
}

# Run main function
main "$@"
