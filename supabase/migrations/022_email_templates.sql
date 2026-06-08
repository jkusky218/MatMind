-- Email template system
-- Supports two creation paths: paste-and-learn (AI extraction) + section builder.

CREATE TABLE email_templates (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id      UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  created_by   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  name         TEXT NOT NULL,
  tone         TEXT NOT NULL DEFAULT 'friendly'
                 CHECK (tone IN ('formal', 'casual', 'friendly', 'energetic')),
  -- Ordered array of section objects:
  -- { id, type, title, description, guidance, is_required, auto_populate, default_content }
  sections     JSONB NOT NULL DEFAULT '[]',
  example_email TEXT,              -- original pasted text (paste-and-learn path)
  is_default   BOOLEAN NOT NULL DEFAULT false,
  last_used_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX email_templates_team_idx ON email_templates (team_id);

-- Only one default template per team
CREATE UNIQUE INDEX email_templates_one_default_idx
  ON email_templates (team_id)
  WHERE is_default = true;

ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- Coaches can read/write their team's templates
CREATE POLICY "email_templates_coach_all" ON email_templates
  USING (team_id = public.get_auth_team_id())
  WITH CHECK (team_id = public.get_auth_team_id());

-- Track template usage on broadcasts
ALTER TABLE broadcasts
  ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL;

-- Seed built-in section types reference (stored in KB as a convention list, not DB rows)
-- Section types: greeting, this_week_schedule, tournament_update, practice_notes,
--   shoutouts, reminders, action_items, dues_update, custom
