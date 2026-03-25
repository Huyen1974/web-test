-- S161B: Archive 15 stale runner issues from old v1.0 contracts
-- These were created by M1 test runs with wrong data-testid checks.
-- After M2 contract fix (v2.0), these checks no longer exist.
-- WATCHDOG #758 is KEPT open (legitimate, actively updating).

-- Before state: 16 open dieu31-runner issues
-- After state: 1 open (WATCHDOG #758) + 15 archived

UPDATE system_issues
SET status = 'archived',
    resolved_at = NOW(),
    resolved_by = 's161b-cleanup',
    resolution = 'Superseded by contract v2.0 (S132-M2). Old data-testid checks replaced with text-based checks.'
WHERE id IN (746, 747, 748, 749, 750, 751, 752, 753, 754, 755, 756, 757, 759, 760, 761)
  AND source_system = 'dieu31-runner'
  AND status = 'open';

-- Verify: only WATCHDOG should remain open
SELECT id, title, status, issue_class
FROM system_issues
WHERE source_system = 'dieu31-runner' AND status = 'open';
