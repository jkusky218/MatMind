-- Migration 013: Per-channel push notification preferences
-- Adds a channel_prefs array to push_subscriptions so each user controls
-- which channels send them push notifications.

ALTER TABLE public.push_subscriptions
  ADD COLUMN IF NOT EXISTS channel_prefs TEXT[]
  DEFAULT ARRAY['announcements', 'advanced', 'beginner', 'tots'];

-- Back-fill existing rows with the default (all channels on)
UPDATE public.push_subscriptions
SET channel_prefs = ARRAY['announcements', 'advanced', 'beginner', 'tots']
WHERE channel_prefs IS NULL;

CREATE INDEX IF NOT EXISTS idx_push_subs_channel_prefs
  ON public.push_subscriptions USING GIN (channel_prefs);
