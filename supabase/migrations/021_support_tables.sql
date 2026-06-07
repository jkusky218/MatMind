-- Support system tables for MatMind Support AI
-- Three-tier triage: T1 instant AI / T2 AI-created ticket / T3 human escalation

-- ============================================================
-- SUPPORT TICKETS
-- ============================================================

CREATE TABLE support_tickets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id       UUID REFERENCES teams(id) ON DELETE SET NULL,
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject       TEXT,
  conversation  JSONB NOT NULL DEFAULT '[]',  -- array of { role, content, ts }
  status        TEXT NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open', 'in_progress', 'resolved', 'escalated')),
  severity      TEXT NOT NULL DEFAULT 'low'
                  CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  category      TEXT,  -- 'account', 'feature', 'billing', 'safety', 'legal', 'technical'
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  resolved_at   TIMESTAMPTZ,
  resolved_by   UUID REFERENCES profiles(id)
);

CREATE INDEX support_tickets_user_idx   ON support_tickets (user_id);
CREATE INDEX support_tickets_team_idx   ON support_tickets (team_id);
CREATE INDEX support_tickets_status_idx ON support_tickets (status);

-- ============================================================
-- KNOWLEDGE BASE (product-level; NULL team_id = global MatMind KB)
-- ============================================================

CREATE TABLE knowledge_base (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id          UUID REFERENCES teams(id) ON DELETE CASCADE,  -- NULL = global
  question         TEXT NOT NULL,
  answer           TEXT NOT NULL,
  source           TEXT NOT NULL DEFAULT 'manual'
                     CHECK (source IN ('manual', 'resolved_ticket')),
  source_ticket_id UUID REFERENCES support_tickets(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base  ENABLE ROW LEVEL SECURITY;

-- Users can read their own tickets
CREATE POLICY "support_tickets_select_own" ON support_tickets
  FOR SELECT USING (user_id = auth.uid());

-- Users can create tickets for themselves
CREATE POLICY "support_tickets_insert_own" ON support_tickets
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can update their own open/in_progress tickets (e.g. append messages)
CREATE POLICY "support_tickets_update_own" ON support_tickets
  FOR UPDATE USING (user_id = auth.uid() AND status IN ('open', 'in_progress'));

-- Coaches can read all tickets belonging to their team
CREATE POLICY "support_tickets_coaches_read" ON support_tickets
  FOR SELECT USING (
    team_id IS NOT NULL AND
    team_id IN (
      SELECT p.team_id FROM profiles p
      INNER JOIN coaches c ON c.profile_id = p.id
      WHERE p.id = auth.uid()
    )
  );

-- All authenticated users can read the knowledge base
CREATE POLICY "knowledge_base_read_all" ON knowledge_base
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only service role inserts KB entries (populated via resolved-ticket review)
-- (No INSERT policy for anon/authenticated — managed server-side)

-- ============================================================
-- SEED: global product KB entries
-- ============================================================

INSERT INTO knowledge_base (team_id, question, answer, source) VALUES
  (NULL, 'How do I add an athlete to the roster?',
   'Tell the MatMind AI in your private command center: "Add [name], [weight] lbs, [grade], [group (Tots/Beginner/Advanced)]." The AI confirms and creates the athlete record.',
   'manual'),
  (NULL, 'How do parents RSVP to events?',
   'Parents open the Schedule tab and tap "Going" or "Not Going" next to any event. Coaches see the live attendance summary from the same screen.',
   'manual'),
  (NULL, 'How do I send a message to a group?',
   'Open the channel for that group (#Advanced, #Beginner, or #Tots) and post your message. The MatMind AI can also post on your behalf — just tell it in the MatMind AI channel.',
   'manual'),
  (NULL, 'I cannot log in. What should I do?',
   'On the login screen, tap "Send a magic link instead" and enter your email. You will receive a one-click sign-in link — no password required. If the problem persists, contact your team admin.',
   'manual'),
  (NULL, 'What is demo mode?',
   'Demo mode runs when no Supabase credentials are configured. Everything works with sample data. To go live, add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file and redeploy.',
   'manual'),
  (NULL, 'What groups are available?',
   'MatMind uses skill-based groups: Tots, Beginner, and Advanced. These are NOT age-based — coaches assign athletes based on skill level. There is also a Coaches group for staff.',
   'manual');
