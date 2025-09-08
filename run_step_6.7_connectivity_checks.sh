#!/usr/bin/env bash
set -Eeuo pipefail

echo "[LOG] Starting Step 6.7: Connectivity Checks"
echo "--------------------------------------------------"

echo "[LOG] Running CPG1.1: Checking Qdrant connection..."
python scripts/check_qdrant.py
echo "[PASS] Qdrant connection successful."

echo "[LOG] Running CPG1.2: Checking OpenAI API connection..."
python scripts/check_openai.py
echo "[PASS] OpenAI API connection successful."

echo "[LOG] Running CPG3.1: Checking Cloud Run SA roles..."
python scripts/check_run_sa_roles.py
echo "[PASS] Cloud Run Service Account permissions are correct."

echo "--------------------------------------------------"
echo "[LOG] Script finished. All connectivity checks passed."
