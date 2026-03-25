-- S161E: Classify 754 system_issues into sub_class (Layer 3)
-- Based on actual title/issue_type patterns from S161D investigation

-- render_fault: lỗi_lớp_2 → missing_registry_config
UPDATE system_issues SET sub_class = 'missing_registry_config'
WHERE issue_class = 'render_fault' AND issue_type = 'lỗi_lớp_2' AND sub_class IS NULL;

-- render_fault: link_hỏng with "target" → orphan_dep_target
UPDATE system_issues SET sub_class = 'orphan_dep_target'
WHERE issue_class = 'render_fault' AND issue_type = 'link_hỏng'
  AND title LIKE '%target%' AND sub_class IS NULL;

-- render_fault: link_hỏng with "source" → orphan_dep_source
UPDATE system_issues SET sub_class = 'orphan_dep_source'
WHERE issue_class = 'render_fault' AND issue_type = 'link_hỏng'
  AND title LIKE '%source%' AND sub_class IS NULL;

-- render_fault: runner issues (null issue_type) → stale_check (archived)
UPDATE system_issues SET sub_class = 'stale_check'
WHERE issue_class = 'render_fault' AND source_system = 'dieu31-runner' AND sub_class IS NULL;

-- data_fault: thiếu_quan_hệ with "Không có quan hệ entity_dep" → no_dependencies
UPDATE system_issues SET sub_class = 'no_dependencies'
WHERE issue_class = 'data_fault' AND issue_type = 'thiếu_quan_hệ'
  AND title LIKE '%Không có quan hệ entity_dep%' AND sub_class IS NULL;

-- data_fault: thiếu_quan_hệ with "Chưa có dữ liệu quan hệ" → no_dependencies
UPDATE system_issues SET sub_class = 'no_dependencies'
WHERE issue_class = 'data_fault' AND issue_type = 'thiếu_quan_hệ'
  AND sub_class IS NULL;

-- data_fault: thiếu_mã_định_danh → missing_identifier
UPDATE system_issues SET sub_class = 'missing_identifier'
WHERE issue_class = 'data_fault' AND issue_type = 'thiếu_mã_định_danh' AND sub_class IS NULL;

-- sync_fault → count_drift
UPDATE system_issues SET sub_class = 'count_drift'
WHERE issue_class = 'sync_fault' AND sub_class IS NULL;

-- contract_fault → cascade_failure
UPDATE system_issues SET sub_class = 'cascade_failure'
WHERE issue_class = 'contract_fault' AND sub_class IS NULL;

-- watchdog_fault → runner_liveness
UPDATE system_issues SET sub_class = 'runner_liveness'
WHERE issue_class = 'watchdog_fault' AND sub_class IS NULL;

-- Catch-all
UPDATE system_issues SET sub_class = 'unclassified'
WHERE sub_class IS NULL;

-- VERIFY
SELECT issue_class, sub_class, COUNT(*) as cnt
FROM system_issues GROUP BY issue_class, sub_class ORDER BY issue_class, cnt DESC;

SELECT COUNT(*) as null_count FROM system_issues WHERE sub_class IS NULL;
