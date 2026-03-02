-- ==========================================================================
-- MIGRATION 005: Adiciona status e token à tabela invitations
--
-- Execute no Supabase SQL Editor.
-- ==========================================================================

-- Adiciona colunas à tabela invitations (se não existirem)
ALTER TABLE invitations
  ADD COLUMN IF NOT EXISTS token  UUID NOT NULL DEFAULT uuid_generate_v4(),
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'cancelled'));

-- Garante que cada token é único (para lookup seguro)
CREATE UNIQUE INDEX IF NOT EXISTS idx_invitations_token ON invitations (token);

-- Índice para busca por email + org (já existe UNIQUE constraint, mas garante)
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations (email);
CREATE INDEX IF NOT EXISTS idx_invitations_org   ON invitations (organization_id);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations (status);
