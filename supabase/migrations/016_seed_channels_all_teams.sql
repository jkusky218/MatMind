-- Migration 016: Seed standard channels for all teams that don't have them
-- Standard channels: Announcements, Advanced, Beginner, Tots
-- Also creates a DB trigger so new teams automatically get channels.

-- ── Back-fill existing teams ──────────────────────────────────────────────────

INSERT INTO public.channels (team_id, name, channel_type, is_private)
SELECT
  t.id,
  ch.name,
  'group'::channel_type,
  ch.is_private
FROM public.teams t
CROSS JOIN (VALUES
  ('Announcements', false),
  ('Advanced',      false),
  ('Beginner',      false),
  ('Tots',          false)
) AS ch(name, is_private)
WHERE NOT EXISTS (
  SELECT 1 FROM public.channels c
  WHERE c.team_id = t.id AND c.name = ch.name
);

-- ── Trigger: auto-seed channels for every new team ────────────────────────────

CREATE OR REPLACE FUNCTION public.seed_default_channels_for_team()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.channels (team_id, name, channel_type, is_private)
  VALUES
    (NEW.id, 'Announcements', 'group', false),
    (NEW.id, 'Advanced',      'group', false),
    (NEW.id, 'Beginner',      'group', false),
    (NEW.id, 'Tots',          'group', false);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_team_created_seed_channels ON public.teams;

CREATE TRIGGER on_team_created_seed_channels
  AFTER INSERT ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.seed_default_channels_for_team();
