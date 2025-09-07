### Cloud Run Traffic Management Playbook (Promote / Rollback)

Mục tiêu: Cung cấp quy trình an toàn để quảng bá (promote) một revision canary hoặc quay lui (rollback) về revision ổn định trước đó trên Cloud Run.

Các biến dùng chung (thay bằng giá trị của bạn nếu cần):
- PROJECT: github-chatgpt-ggcloud
- REGION: asia-southeast1
- SERVICE: agent-data-test

Thiết lập biến môi trường nhanh:

```bash
export PROJECT=github-chatgpt-ggcloud
export REGION=asia-southeast1
export SERVICE=agent-data-test
```

Lấy danh sách revision và URL (tham khảo):

```bash
gcloud run revisions list \
  --project="$PROJECT" --region="$REGION" --service="$SERVICE" \
  --format='table(metadata.name,status.url,metadata.creationTimestamp)'

# Xem phân bổ traffic hiện tại
gcloud run services describe "$SERVICE" --project="$PROJECT" --region="$REGION" \
  --format='value(status.traffic)'
```

---

#### Kịch bản “Promote” (đưa canary thành 100% traffic)

Giả sử bạn đã deploy canary với `--no-traffic` và muốn chuyển 100% traffic sang revision canary (biết trước tên revision):

```bash
REVISION=<your-canary-revision-name>
gcloud run services update-traffic "$SERVICE" \
  --project="$PROJECT" --region="$REGION" \
  --to-revisions "$REVISION=100"

# Xác minh
gcloud run services describe "$SERVICE" --project="$PROJECT" --region="$REGION" \
  --format='value(status.traffic)'
```

---

#### Kịch bản “Rollback” (quay lui 100% traffic về revision ổn định trước đó)

Ý tưởng: Xác định revision đang giữ 100% traffic hiện tại, tìm revision cũ hơn liền kề trong danh sách và chuyển 100% traffic về đó.

Thao tác thủ công:

```bash
# 1) Xác định revision hiện tại đang giữ 100% traffic
CURR=$(gcloud run services describe "$SERVICE" --project="$PROJECT" --region="$REGION" \
  --format="json" | jq -r '.status.traffic[] | select(.percent==100) | .revisionName' | head -n1)

# 2) Lấy danh sách các revision theo thời gian (mới → cũ)
REVS=$(gcloud run revisions list --project="$PROJECT" --region="$REGION" --service="$SERVICE" \
  --format=json | jq -r 'sort_by(.metadata.creationTimestamp) | reverse | .[].metadata.name')

# 3) Chọn revision cũ hơn gần nhất (không trùng CURR)
PREV=$(echo "$REVS" | awk -v curr="$CURR" '$0!=curr{print; exit}')

# 4) Chuyển 100% traffic về PREV
gcloud run services update-traffic "$SERVICE" \
  --project="$PROJECT" --region="$REGION" \
  --to-revisions "$PREV=100"

# Xác minh
gcloud run services describe "$SERVICE" --project="$PROJECT" --region="$REGION" \
  --format='value(status.traffic)'
```

Gợi ý: Có thể dùng script `scripts/manage_traffic.sh` để tự động hoá promote/rollback.

