-- =========================================================================
-- Migration 009: user_favorites
-- Allows each user to star/favorite spaces, folders, or lists
-- =========================================================================

CREATE TABLE IF NOT EXISTS user_favorites (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  entity_type TEXT        NOT NULL CHECK (entity_type IN ('space', 'folder', 'list')),
  entity_id   UUID        NOT NULL,
  entity_name TEXT        NOT NULL DEFAULT '',
  entity_color TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_uf_user ON user_favorites(user_id);

-- RLS: each user sees and manages only their own favorites
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "favorites: own rows" ON user_favorites
  FOR ALL
  USING  (user_id = current_app_user())
  WITH CHECK (user_id = current_app_user());
