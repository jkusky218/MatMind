-- Migration 005: Push Subscriptions
-- Stores browser PushSubscription objects so the server can send
-- push notifications to specific users or entire teams.

CREATE TABLE push_subscriptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  team_id     UUID NOT NULL REFERENCES teams(id)    ON DELETE CASCADE,
  endpoint    TEXT NOT NULL,
  subscription JSONB NOT NULL,   -- full PushSubscription JSON (endpoint + keys)
  user_agent  TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, endpoint)      -- one row per device per user
);

CREATE INDEX idx_push_subs_team ON push_subscriptions(team_id);
CREATE INDEX idx_push_subs_user ON push_subscriptions(user_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can manage their own subscriptions
CREATE POLICY "Users can manage own push subscriptions"
  ON push_subscriptions FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Coaches can read all subscriptions for their team (needed to send team-wide notifications)
CREATE POLICY "Coaches can view team push subscriptions"
  ON push_subscriptions FOR SELECT
  USING (team_id = get_auth_team_id() AND is_coach());
