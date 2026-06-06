-- Add slug column to teams for subdomain routing
-- e.g. "lovett" → lovett.mat-mind.com

ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Lowercase, alphanumeric + hyphens only
ALTER TABLE teams
  ADD CONSTRAINT teams_slug_format CHECK (slug ~ '^[a-z0-9-]+$');

CREATE UNIQUE INDEX IF NOT EXISTS teams_slug_idx ON teams (slug);

-- Seed the Lovett demo team slug if it exists (idempotent)
UPDATE teams SET slug = 'lovett' WHERE name = 'Lovett Wrestling' AND slug IS NULL;
