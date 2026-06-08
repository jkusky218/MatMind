-- Migration 023: Admin dashboard support tables
-- system_health_log, ai_call_log, feature_events
-- These are read by /api/admin/* and written by serverless cron / chat endpoint.
-- Service-role key bypasses RLS for all admin reads; no extra policies needed.

-- ── System health log (written by cron every 5 min) ──────────────────────────
CREATE TABLE IF NOT EXISTS public.system_health_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checked_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  status      TEXT NOT NULL CHECK (status IN ('ok', 'degraded', 'down')),
  latency_ms  INTEGER,
  error_msg   TEXT
);

-- Keep the table small — only the last 7 days needed for the dashboard.
-- A cron job or manual cleanup can prune older rows.
CREATE INDEX IF NOT EXISTS system_health_log_checked_at_idx
  ON public.system_health_log (checked_at DESC);

ALTER TABLE public.system_health_log ENABLE ROW LEVEL SECURITY;

-- No user should read this directly from the client; admin API uses service role.
CREATE POLICY "No public access to health log"
  ON public.system_health_log FOR ALL
  USING (false);

-- ── AI call log (written by /api/chat on every call) ─────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_call_log (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id           UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  user_id           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ DEFAULT now(),
  input_tokens      INTEGER,
  output_tokens     INTEGER,
  cache_read_tokens INTEGER,
  tool_calls        JSONB,
  latency_ms        INTEGER
);

CREATE INDEX IF NOT EXISTS ai_call_log_created_at_idx
  ON public.ai_call_log (created_at DESC);

CREATE INDEX IF NOT EXISTS ai_call_log_team_id_idx
  ON public.ai_call_log (team_id);

ALTER TABLE public.ai_call_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No public access to AI call log"
  ON public.ai_call_log FOR ALL
  USING (false);

-- ── Feature event tracking (written by client trackFeature() calls) ───────────
CREATE TABLE IF NOT EXISTS public.feature_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id     UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  feature     TEXT NOT NULL,
  action      TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS feature_events_created_at_idx
  ON public.feature_events (created_at DESC);

ALTER TABLE public.feature_events ENABLE ROW LEVEL SECURITY;

-- Authenticated users can insert their own events (client-side tracking).
CREATE POLICY "Users can log their own feature events"
  ON public.feature_events FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- No user reads — admin API uses service role.
CREATE POLICY "No public reads on feature events"
  ON public.feature_events FOR SELECT
  USING (false);
