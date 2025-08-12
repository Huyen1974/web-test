#!/bin/bash
set -euo pipefail
TERRAFORM_DIR="${1:-terraform}"; MAX_ATTEMPTS=2
AUTOFIX_LOG_FILE=".ci/p169d/autofix_summary.json"; mkdir -p .ci/p169d
export TF_IN_AUTOMATION=${TF_IN_AUTOMATION:-1}; export TF_CLI_ARGS=${TF_CLI_ARGS:--no-color}
AUTOFIX_SUMMARY='{"script":"tf_plan.sh","attempts":[],"final_status":"pending","timestamp":"'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'"}'

log_attempt(){ local n="$1";local sig="$2";local fix="$3";local ok="$4";
  local e='{"attempt":'"$n"',"error_signature":"'"$sig"'","fix_applied":"'"$fix"'","success":'"$ok"',"timestamp":"'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'"}'
  AUTOFIX_SUMMARY=$(echo "$AUTOFIX_SUMMARY"|jq --argjson entry "$e" '.attempts += [$entry]'); }
save_summary(){ AUTOFIX_SUMMARY=$(echo "$AUTOFIX_SUMMARY"|jq --arg s "$1" '.final_status=$s'); echo "$AUTOFIX_SUMMARY" > "$AUTOFIX_LOG_FILE"; }

detect_err(){ local s="$1";
  echo "$s"|grep -Eq "(bucket.*not found|Error loading backend|403.*storage)" && { echo backend_state_error; return; }
  echo "$s"|grep -Eq "(Required variable|No value for required variable)" && { echo missing_variables; return; }
  echo "$s"|grep -Eq "(provider.*version|lock file|dependency lock file)" && { echo provider_lock_error; return; }
  echo "$s"|grep -Eq "(permission denied|insufficient.*permission|401|403)" && { echo permission_error; return; }
  echo unknown_error; }

apply_fix(){ local sig="$1";
  case "$sig" in
    backend_state_error)
      [[ ! -f "$TERRAFORM_DIR/.terraformrc" ]] && printf "disable_checkpoint = true\n" > "$TERRAFORM_DIR/.terraformrc"
      (cd "$TERRAFORM_DIR" && terraform init -backend=false -input=false -upgrade -no-color || true); return 0;;
    missing_variables)
      cat > "$TERRAFORM_DIR/ci.auto.tfvars" <<EOF
project_id = "${TF_VAR_project_id:-github-chatgpt-ggcloud}"
region     = "${TF_VAR_region:-asia-southeast1}"
env        = "${TF_VAR_env:-test}"
qdrant_cluster_id = "${TF_VAR_qdrant_cluster_id:-529a17a6-01b8-4304-bc5c-b936aec8fca9}"
qdrant_region     = "${TF_VAR_qdrant_region:-us-east4}"
qdrant_api_key    = "CI_PLACEHOLDER_VALUE"
EOF
      return 0;;
    provider_lock_error)
      (cd "$TERRAFORM_DIR" && terraform providers lock -platform=linux_amd64 -platform=darwin_amd64 || true && terraform init -input=false -upgrade -no-color || true); return 0;;
    permission_error) return 0;;
    *) return 1;;
  esac; }

run_plan(){ local use_backend_false="${1:-false}"; local tmp=$(mktemp); local ec=0; cd "$TERRAFORM_DIR"
  if [[ "$use_backend_false" == "true" ]]; then
    terraform init -backend=false -input=false -no-color 2>&1|tee "$tmp"||ec=$?
  else
    local args="";
    # Only use backend config if TF_BACKEND_BUCKET is set and not empty
    if [[ -n "${TF_BACKEND_BUCKET:-}" ]]; then
      args="-backend-config=bucket=${TF_BACKEND_BUCKET}"
    elif [[ -f ".tf_backend_config/backend.conf" ]]; then
      args="-backend-config=.tf_backend_config/backend.conf"
    fi
    terraform init $args -input=false -upgrade -no-color 2>&1|tee "$tmp"||ec=$?
  fi
  [[ $ec -ne 0 ]] && { cat "$tmp"; rm -f "$tmp"; return $ec; }
  terraform validate -no-color 2>&1|tee -a "$tmp"||{ cat "$tmp"; rm -f "$tmp"; return 1; }
  if [[ "$use_backend_false" == "true" ]]; then
    terraform plan -input=false -lock=false -no-color 2>&1|tee -a "$tmp"||ec=$?
  else
    terraform plan -input=false -lock=false -no-color -detailed-exitcode -refresh=false -parallelism=2 2>&1|tee -a "$tmp"||ec=$?
  fi
  case $ec in 0|2) rm -f "$tmp"; return 0;; 1) cat "$tmp"; rm -f "$tmp"; return 1;; *) cat "$tmp"; rm -f "$tmp"; return $ec;; esac; }

[[ -d "$TERRAFORM_DIR" ]] || { echo "No terraform dir"; save_summary config_error; exit 2; }
command -v terraform >/dev/null || { echo "terraform missing"; save_summary config_error; exit 2; }
command -v jq >/dev/null || { echo "jq missing"; save_summary config_error; exit 2; }

# Attempt 1: normal flow
if run_plan false; then log_attempt 1 none none true; save_summary success; exit 0; fi

# Capture error for analysis
err=$( (cd "$TERRAFORM_DIR"; terraform plan -input=false -lock=false -no-color 2>&1) || true )
sig=$(detect_err "$err"); log_attempt 1 "$sig" none false

# Attempt 2: apply fix and retry
if apply_fix "$sig"; then
  use_bf=false; [[ "$sig" == backend_state_error ]] && use_bf=true
  if run_plan "$use_bf"; then
    log_attempt 2 "$sig" applied true; save_summary success; exit 0
  fi
  log_attempt 2 "$sig" applied false; save_summary failed
  (cd "$TERRAFORM_DIR"; terraform plan -input=false -lock=false -no-color 2>&1|tail -30|tee ../.ci/p169d/last_error.txt||true)
  exit 1
else
  log_attempt 2 "$sig" failed false; save_summary failed
  (cd "$TERRAFORM_DIR"; terraform plan -input=false -lock=false -no-color 2>&1|tail -30|tee ../.ci/p169d/last_error.txt||true)
  exit 1
fi
