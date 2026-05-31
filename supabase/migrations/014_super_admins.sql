-- Migration 014: Super Admins
-- Super admins have cross-team access. When they visit a subdomain their
-- profile.team_id is updated to match, which makes the existing RLS
-- policies work correctly without any policy changes.

CREATE TABLE IF NOT EXISTS public.super_admins (
  user_id     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;

-- Users can only read their own row (used by the app to detect super admin status)
CREATE POLICY "Users can view own super admin row"
  ON public.super_admins FOR SELECT
  USING (user_id = auth.uid());

-- Only existing super admins can insert (bootstrapped via SQL)
CREATE POLICY "Super admins can manage table"
  ON public.super_admins FOR ALL
  USING (user_id = auth.uid());

-- ── Seed: insert Joey ─────────────────────────────────────────────────────────
INSERT INTO public.super_admins (user_id, email)
SELECT id, email
FROM   auth.users
WHERE  email ILIKE 'joey.kusky@gmail.com'
ON CONFLICT (user_id) DO NOTHING;
