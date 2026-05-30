-- Migration 007: Admin Role & Team Settings
-- Adds is_admin() helper function and team_settings table for configurable
-- per-team branding, roster groups, and notification channel preferences.
-- The admin role already exists in the user_role ENUM (001_initial_schema.sql).

-- ── Admin helper function ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- ── Team Settings table ───────────────────────────────────────────────────────
-- One row per team. Stores configurable settings that override app defaults.
-- groups: ordered array of { id, label, color } objects
-- notification_settings: { channel_id: { roles: ['coach','parent'], enabled: bool } }

CREATE TABLE team_settings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id               UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  team_name             TEXT,
  logo_url              TEXT,
  primary_color         TEXT DEFAULT '#1B3A5C',
  secondary_color       TEXT DEFAULT '#6BADE4',
  groups                JSONB NOT NULL DEFAULT '[
    {"id":"coaches",  "label":"Coaches",  "color":"#C4A44A"},
    {"id":"tots",     "label":"Tots",     "color":"#7B5EA7"},
    {"id":"beginner", "label":"Beginner", "color":"#6BADE4"},
    {"id":"advanced", "label":"Advanced", "color":"#1B3A5C"}
  ]'::jsonb,
  notification_settings JSONB NOT NULL DEFAULT '{
    "announcements": {"roles": ["coach","parent","admin"], "enabled": true},
    "advanced":      {"roles": ["coach","parent","admin"], "enabled": true},
    "beginner":      {"roles": ["coach","parent","admin"], "enabled": true},
    "tots":          {"roles": ["coach","parent","admin"], "enabled": true}
  }'::jsonb,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_id)
);

CREATE INDEX idx_team_settings_team ON team_settings(team_id);

ALTER TABLE team_settings ENABLE ROW LEVEL SECURITY;

-- All authenticated team members can read settings (needed for app config)
CREATE POLICY "Team members can read team settings"
  ON team_settings FOR SELECT
  USING (team_id = get_auth_team_id());

-- Only admins can modify team settings
CREATE POLICY "Admins can update team settings"
  ON team_settings FOR UPDATE
  USING (team_id = get_auth_team_id() AND is_admin())
  WITH CHECK (team_id = get_auth_team_id() AND is_admin());

CREATE POLICY "Admins can insert team settings"
  ON team_settings FOR INSERT
  WITH CHECK (team_id = get_auth_team_id() AND is_admin());

-- ── Seed default settings for the Lovett team ─────────────────────────────────

INSERT INTO team_settings (team_id, team_name)
VALUES ('a1b2c3d4-0000-0000-0000-000000000001', 'Lovett Wrestling')
ON CONFLICT (team_id) DO NOTHING;

-- ── Promote a user to admin ────────────────────────────────────────────────────
-- Run this manually in the SQL editor to grant admin access to a specific user:
--
--   UPDATE profiles SET role = 'admin' WHERE id = '<user-uuid>';
--
-- To find a user's UUID: SELECT id, full_name, email FROM profiles;
