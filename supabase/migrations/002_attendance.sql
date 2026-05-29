-- MatMind: Attendance tracking
-- Records actual attendance (present/absent) per athlete per event.
-- Distinct from `availability` (RSVP intent) — this is what actually happened.

-- ============================================================
-- ENUM
-- ============================================================

CREATE TYPE attendance_status AS ENUM ('present', 'absent');

-- ============================================================
-- TABLE
-- ============================================================

CREATE TABLE attendance (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  athlete_id   UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  status       attendance_status NOT NULL,
  recorded_by  UUID REFERENCES profiles(id),   -- coach who took attendance
  recorded_at  TIMESTAMPTZ DEFAULT now(),
  created_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(event_id, athlete_id)
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_attendance_event   ON attendance(event_id);
CREATE INDEX idx_attendance_athlete ON attendance(athlete_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Team members (coaches + parents) can read attendance for their team's events
CREATE POLICY "Team members can view attendance"
  ON attendance FOR SELECT
  USING (event_id IN (
    SELECT e.id FROM events e
    JOIN profiles p ON p.team_id = e.team_id
    WHERE p.id = auth.uid()
  ));

-- Only coaches can insert / update / delete attendance records
CREATE POLICY "Coaches can manage attendance"
  ON attendance FOR ALL
  USING (event_id IN (
    SELECT e.id FROM events e
    JOIN profiles p ON p.team_id = e.team_id
    WHERE p.id = auth.uid() AND p.role IN ('coach', 'admin')
  ));
