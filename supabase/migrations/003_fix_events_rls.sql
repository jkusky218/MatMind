-- Migration 003: Fix events RLS policies
-- The original "Coaches can manage events" FOR ALL policy uses only a USING clause.
-- PostgreSQL derives WITH CHECK from USING for INSERT, but this can behave unexpectedly
-- when the USING expression queries a table that is itself protected by RLS.
-- Solution: add a SECURITY DEFINER helper (no RLS recursion) + explicit per-operation policies.

-- ── Helper: is_coach() ────────────────────────────────────────────────────────
-- SECURITY DEFINER bypasses RLS on the inner profiles read, same as get_auth_team_id().

CREATE OR REPLACE FUNCTION public.is_coach()
RETURNS BOOLEAN LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('coach', 'admin')
  );
$$;

-- ── Drop old events policies ──────────────────────────────────────────────────

DROP POLICY IF EXISTS "Coaches can manage events" ON events;
DROP POLICY IF EXISTS "Team members can view events"  ON events;

-- ── Explicit per-operation policies ──────────────────────────────────────────

-- All team members can see events
CREATE POLICY "Team members can view events"
  ON events FOR SELECT
  USING (team_id = get_auth_team_id());

-- Coaches can add events for their team (explicit WITH CHECK required for INSERT)
CREATE POLICY "Coaches can insert events"
  ON events FOR INSERT
  WITH CHECK (team_id = get_auth_team_id() AND is_coach());

-- Coaches can update events for their team
CREATE POLICY "Coaches can update events"
  ON events FOR UPDATE
  USING  (team_id = get_auth_team_id())
  WITH CHECK (team_id = get_auth_team_id() AND is_coach());

-- Coaches can delete events for their team
CREATE POLICY "Coaches can delete events"
  ON events FOR DELETE
  USING (team_id = get_auth_team_id() AND is_coach());
