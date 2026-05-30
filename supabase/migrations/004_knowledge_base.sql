-- Migration 004: Knowledge Base
-- Stores extracted text from tournament flyers, team policies, FAQs, and other
-- reference material. Content is injected into Claude's system prompt so the AI
-- can answer questions and generate messages from it.

-- ── Table ─────────────────────────────────────────────────────────────────────

CREATE TABLE knowledge_base (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id     UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT 'other'
                CHECK (category IN ('tournament', 'policy', 'faq', 'other')),
  content     TEXT NOT NULL,
  file_name   TEXT,
  created_by  UUID REFERENCES profiles(id),
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_kb_team     ON knowledge_base(team_id);
CREATE INDEX idx_kb_category ON knowledge_base(team_id, category);

-- ── RLS ───────────────────────────────────────────────────────────────────────
-- Reuses get_auth_team_id() (migration 001) and is_coach() (migration 003).
-- Both are SECURITY DEFINER so there's no RLS recursion on profiles.

ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view KB"
  ON knowledge_base FOR SELECT
  USING (team_id = get_auth_team_id());

CREATE POLICY "Coaches can insert KB"
  ON knowledge_base FOR INSERT
  WITH CHECK (team_id = get_auth_team_id() AND is_coach());

CREATE POLICY "Coaches can update KB"
  ON knowledge_base FOR UPDATE
  USING  (team_id = get_auth_team_id())
  WITH CHECK (team_id = get_auth_team_id() AND is_coach());

CREATE POLICY "Coaches can delete KB"
  ON knowledge_base FOR DELETE
  USING (team_id = get_auth_team_id() AND is_coach());

-- ── Seed: Wolfpack Takedown Hammer ────────────────────────────────────────────

INSERT INTO knowledge_base (team_id, title, category, content, file_name)
VALUES (
  'a1b2c3d4-0000-0000-0000-000000000001',
  'Wolfpack Takedown Hammer',
  'tournament',
$$Tournament: Wolfpack Takedown Hammer
Date: Sunday, February 8, 2026
Venue: North Paulding High School — Main Gym
Address: 300 North Paulding Drive, Dallas, GA 30132
Format: USAW traditional age groups. NO HIGH SCHOOL WRESTLERS.
Divisions: 6u, 8u, 10u, 12u, 14u (Boys) | K-2, 3-5, MS 6-8 (Girls, Madison weights)

Registration: $30 (closes Friday Feb 7 at 9 AM — $35 last 24 hrs)
Link: https://www.usawmembership.com/usaw_events/2600240502?section=registration

Weigh-Ins (rear of main hallway, behind entrance table):
• 6:30–7:15 AM → 6u & 8u
• 9:30–10:15 AM → 10u & Girls
• 12:30–1:15 PM → 12u & 14u

Schedule:
• Session 1: 8:00 AM → 6u & 8u
• Session 2: 11:00 AM → 10u & Girls
• Session 3: 2:00 PM → 12u & 14u

Admission: $10 family (up to 3 members) | $7 individual
Awards: Hammer Medals — top 4 at each weight class
Concessions: Available on site
Rules: No outside coolers or food. Parents & wrestlers stay on upstairs level. Max 2 coaches in corner (USA Bronze Level required).

Contact: Mike Kintz — mkintz@paulding.k12.ga.us
Assistant TD: Robbie Prince — RPrince@paulding.k12.ga.us$$,
  'Wolfpack Takedown hammer fix.pdf'
);
