-- Migration 017: Add source_url to knowledge_base
-- Tracks where a KB entry was imported from so it can be refreshed later.

ALTER TABLE public.knowledge_base
  ADD COLUMN IF NOT EXISTS source_url TEXT DEFAULT NULL;
