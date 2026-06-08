-- Migration 024: Tenant operations support columns
-- Adds active flag to teams table for soft-deactivation via the CEO dashboard.
-- plan_tier is a stub for future billing integration (P3 Finance).

ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS active     BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS plan_tier  TEXT    NOT NULL DEFAULT 'starter';

-- Index for the at-risk query (active teams ordered by last activity)
CREATE INDEX IF NOT EXISTS teams_active_idx ON public.teams (active);
