#!/bin/bash
set -euo pipefail

# --- Cấu hình cơ bản ---
SECRET_NAME="figma_token_for_agents"
TOKEN_FILE="/Users/nmhuyen/Library/CloudStorage/GoogleDrive-nmhuyen@gmail.com/Drive của tôi/nmhuyen_backup/Secret quan trọng!/json/figma_token_for_agents.txt"
PROJECT_ID="github-chatgpt-ggcloud"
REGION="asia-southeast1"

echo "🔹 Step 1: Tạo vỏ secret (user-managed, Singapore)..."
if ! gcloud secrets describe "$SECRET_NAME" --project="$PROJECT_ID" &>/dev/null; then
  gcloud secrets create "$SECRET_NAME" \
    --replication-policy="user-managed" \
    --locations="$REGION" \
    --project="$PROJECT_ID"
  echo "✅ Đã tạo secret mới: $SECRET_NAME"
else
  echo "ℹ️ Secret đã tồn tại, bỏ qua bước tạo."
fi

echo "🔹 Step 2: Nạp giá trị token từ file..."
gcloud secrets versions add "$SECRET_NAME" \
  --data-file="$TOKEN_FILE" \
  --project="$PROJECT_ID"

echo "🔹 Step 3: Kiểm tra và xác thực secret (ẩn token)..."
TOKEN_SNIPPET=$(gcloud secrets versions access latest --secret="$SECRET_NAME" --project="$PROJECT_ID" | head -c 5)
if [[ -n "$TOKEN_SNIPPET" ]]; then
  echo "✅ Token đã được nạp thành công. Kiểm tra vùng Singapore..."
  gcloud secrets describe "$SECRET_NAME" --project="$PROJECT_ID" --format="value(replication.userManaged.replicas[0].location)"
  echo "✅ Secret hoạt động bình thường (ẩn token, chỉ hiển thị 5 ký tự đầu): ${TOKEN_SNIPPET}*****"
else
  echo "❌ Không đọc được token. Kiểm tra lại file hoặc quyền truy cập."
fi
