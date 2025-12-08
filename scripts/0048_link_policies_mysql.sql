-- Task 0048: MySQL SQL script to link policies to roles
-- This script is needed because the original script uses PostgreSQL syntax.
-- In MySQL/Directus, role-policy relationships are stored in directus_access table.
--
-- Role IDs:
--   Agent:  e7c71c3d-c0a5-4b07-b8f7-53d2dd995384
--   Editor: c60f9c5e-70ad-4477-96ac-00c28ffe7935
--
-- Policy IDs:
--   Agent Policy:  74d6c90f-1481-49f6-8b86-ee7d0f1ed269
--   Editor Policy: 4ea86fab-5257-4835-a073-464f2a9285ab

-- Check if links already exist before inserting (idempotent)
-- Link Agent Role to Agent Policy
INSERT INTO directus_access (id, role, user, policy, sort)
SELECT UUID(), 'e7c71c3d-c0a5-4b07-b8f7-53d2dd995384', NULL, '74d6c90f-1481-49f6-8b86-ee7d0f1ed269', 1
WHERE NOT EXISTS (
  SELECT 1 FROM directus_access 
  WHERE role = 'e7c71c3d-c0a5-4b07-b8f7-53d2dd995384' 
    AND policy = '74d6c90f-1481-49f6-8b86-ee7d0f1ed269'
);

-- Link Editor Role to Editor Policy
INSERT INTO directus_access (id, role, user, policy, sort)
SELECT UUID(), 'c60f9c5e-70ad-4477-96ac-00c28ffe7935', NULL, '4ea86fab-5257-4835-a073-464f2a9285ab', 1
WHERE NOT EXISTS (
  SELECT 1 FROM directus_access 
  WHERE role = 'c60f9c5e-70ad-4477-96ac-00c28ffe7935' 
    AND policy = '4ea86fab-5257-4835-a073-464f2a9285ab'
);

-- Verify the links
SELECT 
  a.id as access_id,
  r.name as role_name,
  p.name as policy_name
FROM directus_access a
JOIN directus_roles r ON a.role = r.id
JOIN directus_policies p ON a.policy = p.id
WHERE r.name IN ('Agent', 'Editor');

