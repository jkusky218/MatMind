-- MatMind Database Schema
-- Run this in your Supabase SQL Editor or as a migration

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('coach', 'parent', 'admin');
CREATE TYPE roster_group AS ENUM ('coaches', 'tots', 'beginner', 'advanced');
CREATE TYPE event_type AS ENUM ('practice', 'match', 'tournament', 'meeting', 'other');
CREATE TYPE availability_status AS ENUM ('confirmed', 'declined', 'pending');
CREATE TYPE channel_type AS ENUM ('ai', 'announcements', 'group', 'private');
CREATE TYPE message_channel_scope AS ENUM ('email', 'sms', 'in_app');

-- ============================================================
-- TEAMS (supports multi-team scaling later)
-- ============================================================

CREATE TABLE teams (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  school        TEXT,
  mascot        TEXT,
  primary_color TEXT DEFAULT '#1B3A5C',
  secondary_color TEXT DEFAULT '#6BADE4',
  accent_color  TEXT DEFAULT '#C4A44A',
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================

CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id       UUID REFERENCES teams(id) ON DELETE CASCADE,
  full_name     TEXT NOT NULL,
  email         TEXT NOT NULL,
  phone         TEXT,
  role          user_role NOT NULL DEFAULT 'parent',
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- ATHLETES (the wrestlers)
-- ============================================================

CREATE TABLE athletes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id       UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  first_name    TEXT NOT NULL,
  last_name     TEXT NOT NULL,
  weight        DECIMAL(5,1),
  grade         TEXT,
  school        TEXT,
  roster_group  roster_group NOT NULL DEFAULT 'beginner',
  active        BOOLEAN DEFAULT true,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- ATHLETE-PARENT LINK (many-to-many: each athlete can have 2 parents)
-- ============================================================

CREATE TABLE athlete_parents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id    UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  parent_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  relationship  TEXT DEFAULT 'Parent/Guardian',
  is_primary    BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(athlete_id, parent_id)
);

-- ============================================================
-- COACHES (links profiles to teams with role info)
-- ============================================================

CREATE TABLE coaches (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id       UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  profile_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title         TEXT DEFAULT 'Coach',
  roster_group  roster_group,  -- NULL means all groups
  active        BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_id, profile_id)
);

-- ============================================================
-- EVENTS (practices, matches, tournaments)
-- ============================================================

CREATE TABLE events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id       UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  event_type    event_type NOT NULL DEFAULT 'practice',
  event_date    DATE NOT NULL,
  start_time    TIME NOT NULL,
  end_time      TIME,
  location_name TEXT,
  location_addr TEXT,
  roster_group  roster_group,  -- NULL means all groups
  notes         TEXT,
  notify_on_change BOOLEAN DEFAULT true,
  created_by    UUID REFERENCES profiles(id),
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- AVAILABILITY (RSVP per athlete per event)
-- ============================================================

CREATE TABLE availability (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  athlete_id    UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  status        availability_status NOT NULL DEFAULT 'pending',
  responded_by  UUID REFERENCES profiles(id),  -- which parent responded
  responded_at  TIMESTAMPTZ,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(event_id, athlete_id)
);

-- ============================================================
-- CHANNELS (team communication channels)
-- ============================================================

CREATE TABLE channels (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id       UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,
  channel_type  channel_type NOT NULL DEFAULT 'group',
  roster_group  roster_group,  -- which group this channel serves (NULL = all)
  is_private    BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- MESSAGES (in-app channel messages)
-- ============================================================

CREATE TABLE messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id    UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  sender_id     UUID REFERENCES profiles(id),  -- NULL = system/AI message
  sender_name   TEXT NOT NULL,
  sender_role   user_role,
  is_ai         BOOLEAN DEFAULT false,
  content       TEXT NOT NULL,
  is_pinned     BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- BROADCASTS (email/SMS sent from coaches)
-- ============================================================

CREATE TABLE broadcasts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id       UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  sent_by       UUID NOT NULL REFERENCES profiles(id),
  subject       TEXT,
  body          TEXT NOT NULL,
  scope         message_channel_scope NOT NULL,
  roster_group  roster_group,  -- NULL = all
  recipient_count INT DEFAULT 0,
  sent_at       TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- AI CHAT HISTORY (private coach-AI conversations)
-- ============================================================

CREATE TABLE ai_conversations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  team_id       UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  messages      JSONB NOT NULL DEFAULT '[]',
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- INDEXES for performance
-- ============================================================

CREATE INDEX idx_athletes_team ON athletes(team_id);
CREATE INDEX idx_athletes_group ON athletes(team_id, roster_group);
CREATE INDEX idx_events_team_date ON events(team_id, event_date);
CREATE INDEX idx_availability_event ON availability(event_id);
CREATE INDEX idx_availability_athlete ON availability(athlete_id);
CREATE INDEX idx_messages_channel ON messages(channel_id, created_at);
CREATE INDEX idx_channels_team ON channels(team_id);
CREATE INDEX idx_athlete_parents_athlete ON athlete_parents(athlete_id);
CREATE INDEX idx_athlete_parents_parent ON athlete_parents(parent_id);
CREATE INDEX idx_profiles_team ON profiles(team_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE athletes ENABLE ROW LEVEL SECURITY;
ALTER TABLE athlete_parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read teammates, update own
CREATE POLICY "Users can view team profiles"
  ON profiles FOR SELECT
  USING (team_id IN (SELECT team_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

-- Athletes: team members can read, coaches can write
CREATE POLICY "Team members can view athletes"
  ON athletes FOR SELECT
  USING (team_id IN (SELECT team_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Coaches can manage athletes"
  ON athletes FOR ALL
  USING (team_id IN (
    SELECT team_id FROM profiles WHERE id = auth.uid() AND role = 'coach'
  ));

-- Events: team members can read, coaches can write
CREATE POLICY "Team members can view events"
  ON events FOR SELECT
  USING (team_id IN (SELECT team_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Coaches can manage events"
  ON events FOR ALL
  USING (team_id IN (
    SELECT team_id FROM profiles WHERE id = auth.uid() AND role = 'coach'
  ));

-- Availability: team members can read, parents can update their athletes
CREATE POLICY "Team members can view availability"
  ON availability FOR SELECT
  USING (event_id IN (
    SELECT e.id FROM events e
    JOIN profiles p ON p.team_id = e.team_id
    WHERE p.id = auth.uid()
  ));

CREATE POLICY "Parents can update own athlete availability"
  ON availability FOR UPDATE
  USING (athlete_id IN (
    SELECT athlete_id FROM athlete_parents WHERE parent_id = auth.uid()
  ));

CREATE POLICY "Coaches can manage all availability"
  ON availability FOR ALL
  USING (event_id IN (
    SELECT e.id FROM events e
    JOIN profiles p ON p.team_id = e.team_id
    WHERE p.id = auth.uid() AND p.role = 'coach'
  ));

-- Messages: channel members can read and write
CREATE POLICY "Team members can view messages"
  ON messages FOR SELECT
  USING (channel_id IN (
    SELECT c.id FROM channels c
    JOIN profiles p ON p.team_id = c.team_id
    WHERE p.id = auth.uid()
  ));

CREATE POLICY "Team members can send messages"
  ON messages FOR INSERT
  WITH CHECK (channel_id IN (
    SELECT c.id FROM channels c
    JOIN profiles p ON p.team_id = c.team_id
    WHERE p.id = auth.uid()
  ));

-- AI conversations: private to the user
CREATE POLICY "Users can manage own AI conversations"
  ON ai_conversations FOR ALL
  USING (user_id = auth.uid());

-- Channels: team members can view
CREATE POLICY "Team members can view channels"
  ON channels FOR SELECT
  USING (team_id IN (SELECT team_id FROM profiles WHERE id = auth.uid()));

-- ============================================================
-- REALTIME (enable for live chat)
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE availability;

-- ============================================================
-- SEED DATA: Lovett Wrestling team
-- ============================================================

INSERT INTO teams (id, name, school, mascot, primary_color, secondary_color, accent_color)
VALUES ('a1b2c3d4-0000-0000-0000-000000000001', 'Lovett Wrestling', 'The Lovett School', 'Lions', '#1B3A5C', '#6BADE4', '#C4A44A');

-- Default channels for Lovett
INSERT INTO channels (team_id, name, description, channel_type, roster_group, is_private) VALUES
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Announcements', 'Team-wide updates', 'announcements', NULL, false),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Advanced', 'Skill-based group', 'group', 'advanced', false),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Beginner', 'Skill-based group', 'group', 'beginner', false),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Tots', 'Youngest wrestlers', 'group', 'tots', false),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Coaches Only', 'Staff-only channel', 'private', 'coaches', true);
