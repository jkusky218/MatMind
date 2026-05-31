-- ============================================================
-- Make Debbie Kennedy and Joey Kusky admins on lovetths team
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Preview who is currently on the lovetths team
SELECT id, full_name, email, role
FROM profiles
WHERE team_id = (SELECT id FROM teams WHERE slug = 'lovetths')
ORDER BY role, full_name;

-- 2. Promote Debbie Kennedy
UPDATE profiles
SET role = 'admin'
WHERE team_id = (SELECT id FROM teams WHERE slug = 'lovetths')
  AND full_name ILIKE '%Debbie Kennedy%';

-- 3. Promote Joey (update email if different)
UPDATE profiles
SET role = 'admin'
WHERE email ILIKE 'joey.kusky@gmail.com';

-- NOTE: If Joey's profile row currently points to a different team,
-- this still sets his role to admin. When he visits lovetths.mat-mind.com
-- the subdomain routing loads the lovetths team data, and his admin role
-- grants full access. No team_id change needed.

-- 4. Verify
SELECT full_name, email, role, team_id
FROM profiles
WHERE role = 'admin'
   OR full_name ILIKE '%Debbie Kennedy%'
   OR email ILIKE 'joey.kusky@gmail.com'
ORDER BY full_name;
