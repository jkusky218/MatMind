-- Migration 015: Message editing and deletion
-- Adds edited_at column, RLS policies, and full replica identity so
-- Supabase Realtime can fire DELETE events with the old row's data.

-- 1. Track edit timestamp
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Full replica identity — required for Realtime DELETE events to include
--    the old row's id so clients can remove the right message.
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- 3. Users can edit their own messages
CREATE POLICY "Users can edit own messages"
  ON public.messages FOR UPDATE
  USING     (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

-- 4. Users can delete their own messages
CREATE POLICY "Users can delete own messages"
  ON public.messages FOR DELETE
  USING (sender_id = auth.uid());

-- 5. Coaches can delete any message in their team's channels (moderation)
CREATE POLICY "Coaches can delete any team message"
  ON public.messages FOR DELETE
  USING (
    is_coach() AND
    channel_id IN (
      SELECT id FROM public.channels
      WHERE  team_id = get_auth_team_id()
    )
  );
