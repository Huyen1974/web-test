-- Task 0048: Manual SQL script to link policies to roles
-- This script is needed because the API returns 403 errors when trying to update
-- role-policy relationships through the REST API, even as an admin user.
--
-- USAGE:
-- This script should be run directly on the Directus PostgreSQL database.
--
-- For Cloud SQL:
--   gcloud sql connect <instance-name> --user=postgres --database=directus
--   \i /path/to/this/file.sql
--
-- CAUTION: Only run this after verifying the IDs match your environment.

-- Link Agent Policy to Agent Role
-- Policy ID: 74d6c90f-1481-49f6-8b86-ee7d0f1ed269
-- Role ID: e7c71c3d-c0a5-4b07-b8f7-53d2dd995384
UPDATE directus_roles
SET policies = ARRAY['74d6c90f-1481-49f6-8b86-ee7d0f1ed269'::uuid]
WHERE id = 'e7c71c3d-c0a5-4b07-b8f7-53d2dd995384';

-- Link Editor Policy to Editor Role
-- Policy ID: 4ea86fab-5257-4835-a073-464f2a9285ab
-- Role ID: c60f9c5e-70ad-4477-96ac-00c28ffe7935
UPDATE directus_roles
SET policies = ARRAY['4ea86fab-5257-4835-a073-464f2a9285ab'::uuid]
WHERE id = 'c60f9c5e-70ad-4477-96ac-00c28ffe7935';

-- Verify the links
SELECT
  r.name as role_name,
  r.id as role_id,
  r.policies as policy_ids
FROM directus_roles r
WHERE r.name IN ('Agent', 'Editor', 'Administrator')
ORDER BY r.name;

-- Also update the policies' roles arrays (bidirectional relationship)
UPDATE directus_policies
SET roles = ARRAY['e7c71c3d-c0a5-4b07-b8f7-53d2dd995384'::uuid]
WHERE id = '74d6c90f-1481-49f6-8b86-ee7d0f1ed269';

UPDATE directus_policies
SET roles = ARRAY['c60f9c5e-70ad-4477-96ac-00c28ffe7935'::uuid]
WHERE id = '4ea86fab-5257-4835-a073-464f2a9285ab';

-- Verify policies
SELECT
  p.name as policy_name,
  p.id as policy_id,
  p.roles as role_ids
FROM directus_policies p
WHERE p.name LIKE '%Policy'
ORDER BY p.name;
