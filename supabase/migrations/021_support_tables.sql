-- Support system tables for MatMind Support AI
-- Three-tier triage: T1 instant AI / T2 AI-created ticket / T3 human escalation
-- Uses IF NOT EXISTS throughout — safe to run on databases that already have
-- a knowledge_base table from migration 004_knowledge_base.sql.

-- ============================================================
-- SUPPORT TICKETS
-- ============================================================

CREATE TABLE IF NOT EXISTS support_tickets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id       UUID REFERENCES teams(id) ON DELETE SET NULL,
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject       TEXT,
  conversation  JSONB NOT NULL DEFAULT '[]',  -- array of { role, content, ts }
  status        TEXT NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open', 'in_progress', 'resolved', 'escalated')),
  severity      TEXT NOT NULL DEFAULT 'low'
                  CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  category      TEXT,  -- 'account', 'feature', 'billing', 'legal', 'technical'
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  resolved_at   TIMESTAMPTZ,
  resolved_by   UUID REFERENCES profiles(id)
);

CREATE INDEX IF NOT EXISTS support_tickets_user_idx   ON support_tickets (user_id);
CREATE INDEX IF NOT EXISTS support_tickets_team_idx   ON support_tickets (team_id);
CREATE INDEX IF NOT EXISTS support_tickets_status_idx ON support_tickets (status);

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'support_tickets' AND policyname = 'support_tickets_select_own'
  ) THEN
    CREATE POLICY "support_tickets_select_own" ON support_tickets
      FOR SELECT USING (user_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'support_tickets' AND policyname = 'support_tickets_insert_own'
  ) THEN
    CREATE POLICY "support_tickets_insert_own" ON support_tickets
      FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'support_tickets' AND policyname = 'support_tickets_update_own'
  ) THEN
    CREATE POLICY "support_tickets_update_own" ON support_tickets
      FOR UPDATE USING (user_id = auth.uid() AND status IN ('open', 'in_progress'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'support_tickets' AND policyname = 'support_tickets_coaches_read'
  ) THEN
    CREATE POLICY "support_tickets_coaches_read" ON support_tickets
      FOR SELECT USING (
        team_id IS NOT NULL AND
        team_id IN (
          SELECT p.team_id FROM profiles p
          INNER JOIN coaches c ON c.profile_id = p.id
          WHERE p.id = auth.uid()
        )
      );
  END IF;
END $$;

-- ============================================================
-- KNOWLEDGE BASE — add source_ticket_id column if missing
-- (table already exists from 004_knowledge_base.sql)
-- ============================================================

ALTER TABLE knowledge_base
  ADD COLUMN IF NOT EXISTS source_ticket_id UUID REFERENCES support_tickets(id) ON DELETE SET NULL;
