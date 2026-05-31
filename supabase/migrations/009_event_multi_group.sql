-- Migration 009: Multi-group events
-- Adds roster_groups (array) so a single event can target multiple skill groups.
-- The old roster_group (single ENUM) is kept for backward compatibility but
-- new writes use roster_groups. Both are read by normalizeEvent with
-- roster_groups taking priority.

ALTER TABLE events ADD COLUMN IF NOT EXISTS roster_groups roster_group[] DEFAULT NULL;

-- Migrate existing single-group events into the new array column
UPDATE events
SET roster_groups = ARRAY[roster_group]::roster_group[]
WHERE roster_group IS NOT NULL AND roster_groups IS NULL;

-- Index for common query: "events for a team on or after today"
-- (roster_groups filtering is done in the app layer, not in SQL)
CREATE INDEX IF NOT EXISTS idx_events_roster_groups ON events USING GIN (roster_groups);

-- Runbook for new events going forward:
--   roster_groups = ARRAY['advanced','beginner']::roster_group[]  → specific groups
--   roster_groups = NULL                                           → all groups
