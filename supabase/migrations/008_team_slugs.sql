-- Migration 008: Team Slugs for Subdomain Routing
-- Adds a unique short identifier to each team that maps to a subdomain.
-- e.g. slug='lovett' → lovett.matmind.app

ALTER TABLE teams ADD COLUMN slug TEXT UNIQUE;

CREATE INDEX idx_teams_slug ON teams(slug);

-- Seed Lovett's slug
UPDATE teams SET slug = 'lovett' WHERE id = 'a1b2c3d4-0000-0000-0000-000000000001';

-- ── How to add a new team ──────────────────────────────────────────────────────
-- 1. Insert the team row:
--    INSERT INTO teams (name, school, mascot, primary_color, secondary_color, slug)
--    VALUES ('Northside Wrestling', 'Northside', 'Warriors', '#1a472a', '#ffffff', 'northside');
--
-- 2. Insert default team_settings:
--    INSERT INTO team_settings (team_id, team_name, primary_color, secondary_color)
--    SELECT id, name, primary_color, secondary_color FROM teams WHERE slug = 'northside';
--
-- 3. Create a DNS subdomain in your domain registrar:
--    northside.matmind.app → CNAME → cname.vercel-dns.com
--
-- 4. Add the subdomain in Vercel dashboard → Project → Domains.
--
-- 5. Invite the new team's admin:
--    Use the + button in the app (or /api/admin) to add their first coach.
