-- Migration 019: AI auto-reply mode for group channels (admin-controlled)
-- off      = AI never replies in group channels
-- mentions = AI replies only when explicitly tagged (@MatMind)
-- smart    = AI replies to genuine questions + mentions (default)

ALTER TABLE public.team_settings
  ADD COLUMN IF NOT EXISTS ai_channel_mode TEXT NOT NULL DEFAULT 'smart'
  CHECK (ai_channel_mode IN ('off', 'mentions', 'smart'));
