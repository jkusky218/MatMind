-- Support Knowledge Base — global product KB separate from team KB
-- Used by MatMind Support AI to answer product/billing/account questions.
-- Unlike knowledge_base (team-scoped), support_kb has no team_id —
-- it belongs to MatMind the product, not any individual team.

CREATE TABLE IF NOT EXISTS support_kb (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question         TEXT NOT NULL,
  answer           TEXT NOT NULL,
  category         TEXT NOT NULL DEFAULT 'general'
                     CHECK (category IN ('account','billing','feature','technical','legal','general')),
  source_ticket_id UUID REFERENCES support_tickets(id) ON DELETE SET NULL,
  created_by       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_kb_category_idx ON support_kb (category);
CREATE INDEX IF NOT EXISTS support_kb_ticket_idx   ON support_kb (source_ticket_id);

ALTER TABLE support_kb ENABLE ROW LEVEL SECURITY;

-- Super-admins can read/write all support KB entries
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'support_kb' AND policyname = 'support_kb_super_admin'
  ) THEN
    CREATE POLICY "support_kb_super_admin" ON support_kb
      USING (
        EXISTS (
          SELECT 1 FROM super_admins sa
          INNER JOIN profiles p ON p.id = sa.profile_id
          WHERE p.id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM super_admins sa
          INNER JOIN profiles p ON p.id = sa.profile_id
          WHERE p.id = auth.uid()
        )
      );
  END IF;
END $$;

-- Service role (used by serverless functions) bypasses RLS automatically.
-- No additional policy needed for API reads/writes via service role key.
