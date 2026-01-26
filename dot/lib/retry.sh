#!/bin/bash

# DOT Retry Library - Cold Start Protection for Cloud Run Services
# Source this file in any DOT tool that makes cloud API calls
#
# Usage:
#   source "$(dirname "$0")/../lib/retry.sh"
#   curl_with_retry "https://api.example.com/health"
#   with_retry 3 30 "curl -sf https://api.example.com/data"
#
# Configuration (via environment variables):
#   DOT_RETRY_MAX      - Maximum retry attempts (default: 3)
#   DOT_RETRY_TIMEOUT  - Timeout per attempt in seconds (default: 30)
#   DOT_RETRY_DELAY    - Initial delay between retries (default: 5)
#   DOT_RETRY_BACKOFF  - Backoff multiplier (default: 2, for exponential backoff)
#   DOT_RETRY_VERBOSE  - Show retry messages (default: 1)

# Default configuration
DOT_RETRY_MAX="${DOT_RETRY_MAX:-3}"
DOT_RETRY_TIMEOUT="${DOT_RETRY_TIMEOUT:-30}"
DOT_RETRY_DELAY="${DOT_RETRY_DELAY:-5}"
DOT_RETRY_BACKOFF="${DOT_RETRY_BACKOFF:-2}"
DOT_RETRY_VERBOSE="${DOT_RETRY_VERBOSE:-1}"

# Colors
_RETRY_RED='\033[0;31m'
_RETRY_GREEN='\033[0;32m'
_RETRY_YELLOW='\033[0;33m'
_RETRY_CYAN='\033[0;36m'
_RETRY_NC='\033[0m' # No Color

# Log function
_retry_log() {
  local level="$1"
  shift
  if [[ "$DOT_RETRY_VERBOSE" == "1" ]]; then
    case "$level" in
      INFO)  echo -e "${_RETRY_CYAN}[RETRY]${_RETRY_NC} $*" ;;
      WARN)  echo -e "${_RETRY_YELLOW}[RETRY]${_RETRY_NC} $*" ;;
      ERROR) echo -e "${_RETRY_RED}[RETRY]${_RETRY_NC} $*" ;;
      OK)    echo -e "${_RETRY_GREEN}[RETRY]${_RETRY_NC} $*" ;;
    esac
  fi
}

# Generic retry wrapper for any command
# Usage: with_retry [max_attempts] [timeout] "command to run"
# Returns: Exit code of the command (0 on success, non-zero on failure)
with_retry() {
  local max_attempts="${1:-$DOT_RETRY_MAX}"
  local timeout="${2:-$DOT_RETRY_TIMEOUT}"
  shift 2
  local cmd="$*"

  local attempt=1
  local delay="$DOT_RETRY_DELAY"
  local exit_code=0
  local output=""

  while [[ $attempt -le $max_attempts ]]; do
    if [[ $attempt -gt 1 ]]; then
      _retry_log INFO "Attempt $attempt/$max_attempts (waiting ${delay}s for cold start...)"
    fi

    # Run command with timeout
    if command -v gtimeout >/dev/null 2>&1; then
      # macOS with coreutils
      output=$(gtimeout "$timeout" bash -c "$cmd" 2>&1)
      exit_code=$?
    elif command -v timeout >/dev/null 2>&1; then
      # Linux
      output=$(timeout "$timeout" bash -c "$cmd" 2>&1)
      exit_code=$?
    else
      # Fallback without timeout
      output=$(bash -c "$cmd" 2>&1)
      exit_code=$?
    fi

    # Check if successful
    if [[ $exit_code -eq 0 ]]; then
      if [[ $attempt -gt 1 ]]; then
        _retry_log OK "Success on attempt $attempt"
      fi
      echo "$output"
      return 0
    fi

    # Check if it's a timeout (exit code 124)
    if [[ $exit_code -eq 124 ]]; then
      _retry_log WARN "Timeout after ${timeout}s (cold start likely)"
    else
      _retry_log WARN "Failed with exit code $exit_code"
    fi

    # Wait before retry (if not last attempt)
    if [[ $attempt -lt $max_attempts ]]; then
      sleep "$delay"
      # Exponential backoff
      delay=$((delay * DOT_RETRY_BACKOFF))
    fi

    ((attempt++))
  done

  _retry_log ERROR "All $max_attempts attempts failed"
  echo "$output"
  return 1
}

# Specialized curl wrapper with retry
# Usage: curl_with_retry [curl_options...] URL
# Returns: curl output on success, empty on failure
# Exit code: 0 on success, 1 on failure
curl_with_retry() {
  local max_attempts="$DOT_RETRY_MAX"
  local timeout="$DOT_RETRY_TIMEOUT"
  local delay="$DOT_RETRY_DELAY"
  local attempt=1
  local output=""
  local http_code=""
  local curl_exit=0

  while [[ $attempt -le $max_attempts ]]; do
    if [[ $attempt -gt 1 ]]; then
      _retry_log INFO "Attempt $attempt/$max_attempts (waiting ${delay}s...)"
    fi

    # Run curl with extended timeout
    output=$(curl -sf --max-time "$timeout" "$@" 2>/dev/null)
    curl_exit=$?

    if [[ $curl_exit -eq 0 ]] && [[ -n "$output" ]]; then
      if [[ $attempt -gt 1 ]]; then
        _retry_log OK "Success on attempt $attempt"
      fi
      echo "$output"
      return 0
    fi

    # Determine failure reason
    case $curl_exit in
      28) _retry_log WARN "Timeout (${timeout}s) - cold start likely" ;;
      7)  _retry_log WARN "Connection refused" ;;
      22) _retry_log WARN "HTTP error (4xx/5xx)" ;;
      *)  _retry_log WARN "curl failed (exit: $curl_exit)" ;;
    esac

    # Wait before retry (if not last attempt)
    if [[ $attempt -lt $max_attempts ]]; then
      sleep "$delay"
      delay=$((delay * DOT_RETRY_BACKOFF))
    fi

    ((attempt++))
  done

  _retry_log ERROR "All $max_attempts attempts failed"
  return 1
}

# Specialized health check with retry
# Usage: health_check_with_retry URL [expected_status]
# Returns: 0 if healthy, 1 if not
health_check_with_retry() {
  local url="$1"
  local expected_status="${2:-200}"
  local max_attempts="$DOT_RETRY_MAX"
  local timeout="$DOT_RETRY_TIMEOUT"
  local delay="$DOT_RETRY_DELAY"
  local attempt=1
  local http_code=""

  while [[ $attempt -le $max_attempts ]]; do
    if [[ $attempt -gt 1 ]]; then
      _retry_log INFO "Health check attempt $attempt/$max_attempts (waiting ${delay}s...)"
    fi

    # Get HTTP status code
    http_code=$(curl -sf -o /dev/null -w "%{http_code}" --max-time "$timeout" "$url" 2>/dev/null)

    if [[ "$http_code" == "$expected_status" ]]; then
      if [[ $attempt -gt 1 ]]; then
        _retry_log OK "Healthy on attempt $attempt (HTTP $http_code)"
      fi
      return 0
    fi

    if [[ -z "$http_code" ]] || [[ "$http_code" == "000" ]]; then
      _retry_log WARN "No response (timeout/connection failed)"
    else
      _retry_log WARN "HTTP $http_code (expected $expected_status)"
    fi

    # Wait before retry (if not last attempt)
    if [[ $attempt -lt $max_attempts ]]; then
      sleep "$delay"
      delay=$((delay * DOT_RETRY_BACKOFF))
    fi

    ((attempt++))
  done

  _retry_log ERROR "Health check failed after $max_attempts attempts"
  return 1
}

# Auth with retry - specialized for Directus login
# Usage: auth_with_retry URL EMAIL PASSWORD
# Returns: access_token on success, empty on failure
auth_with_retry() {
  local url="$1"
  local email="$2"
  local password="$3"
  local max_attempts="$DOT_RETRY_MAX"
  local timeout="$DOT_RETRY_TIMEOUT"
  local delay="$DOT_RETRY_DELAY"
  local attempt=1
  local response=""
  local token=""
  local tmp_file=""

  # Create temp file for JSON payload to avoid shell escaping issues
  tmp_file=$(mktemp)

  # Remove shell-escaped backslashes before special chars (e.g., \! -> !)
  local clean_password="${password//\\!/!}"
  clean_password="${clean_password//\\\$/\$}"
  clean_password="${clean_password//\\\`/\`}"

  # Write JSON using printf to preserve special characters exactly
  printf '{"email":"%s","password":"%s"}' "$email" "$clean_password" > "$tmp_file"

  while [[ $attempt -le $max_attempts ]]; do
    if [[ $attempt -gt 1 ]]; then
      _retry_log INFO "Auth attempt $attempt/$max_attempts (waiting ${delay}s...)"
    fi

    response=$(curl -sf --max-time "$timeout" "${url}/auth/login" \
      -H "Content-Type: application/json" \
      -d @"$tmp_file" 2>/dev/null)

    if [[ -n "$response" ]]; then
      token=$(echo "$response" | jq -r '.data.access_token // empty' 2>/dev/null)
      if [[ -n "$token" ]]; then
        if [[ $attempt -gt 1 ]]; then
          _retry_log OK "Authenticated on attempt $attempt"
        fi
        rm -f "$tmp_file"
        echo "$token"
        return 0
      fi
    fi

    _retry_log WARN "Auth failed"

    # Wait before retry (if not last attempt)
    if [[ $attempt -lt $max_attempts ]]; then
      sleep "$delay"
      delay=$((delay * DOT_RETRY_BACKOFF))
    fi

    ((attempt++))
  done

  rm -f "$tmp_file"
  _retry_log ERROR "Authentication failed after $max_attempts attempts"
  return 1
}

# API call with retry - for authenticated Directus API calls
# Usage: api_with_retry METHOD URL TOKEN [DATA]
# Returns: API response on success
api_with_retry() {
  local method="$1"
  local url="$2"
  local token="$3"
  local data="${4:-}"
  local max_attempts="$DOT_RETRY_MAX"
  local timeout="$DOT_RETRY_TIMEOUT"
  local delay="$DOT_RETRY_DELAY"
  local attempt=1
  local response=""
  local curl_exit=0

  while [[ $attempt -le $max_attempts ]]; do
    if [[ $attempt -gt 1 ]]; then
      _retry_log INFO "API call attempt $attempt/$max_attempts (waiting ${delay}s...)"
    fi

    if [[ -n "$data" ]]; then
      response=$(curl -sf --max-time "$timeout" -X "$method" "$url" \
        -H "Authorization: Bearer $token" \
        -H "Content-Type: application/json" \
        -d "$data" 2>/dev/null)
      curl_exit=$?
    else
      response=$(curl -sf --max-time "$timeout" -X "$method" "$url" \
        -H "Authorization: Bearer $token" 2>/dev/null)
      curl_exit=$?
    fi

    if [[ $curl_exit -eq 0 ]] && [[ -n "$response" ]]; then
      # Check for Directus error response
      if ! echo "$response" | jq -e '.errors' >/dev/null 2>&1; then
        if [[ $attempt -gt 1 ]]; then
          _retry_log OK "API success on attempt $attempt"
        fi
        echo "$response"
        return 0
      fi
    fi

    _retry_log WARN "API call failed"

    # Wait before retry (if not last attempt)
    if [[ $attempt -lt $max_attempts ]]; then
      sleep "$delay"
      delay=$((delay * DOT_RETRY_BACKOFF))
    fi

    ((attempt++))
  done

  _retry_log ERROR "API call failed after $max_attempts attempts"
  echo "$response"
  return 1
}

# Print retry configuration (for debugging)
print_retry_config() {
  echo "DOT Retry Configuration:"
  echo "  Max attempts:  $DOT_RETRY_MAX"
  echo "  Timeout:       ${DOT_RETRY_TIMEOUT}s"
  echo "  Initial delay: ${DOT_RETRY_DELAY}s"
  echo "  Backoff:       ${DOT_RETRY_BACKOFF}x"
  echo "  Verbose:       $DOT_RETRY_VERBOSE"
}
