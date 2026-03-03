-- ==========================================================================
-- 007_invitations_rls_fix.sql
--
-- Problema 1: A tabela invitations tem UNIQUE (organization_id, email) sem
-- filtro por status. Isso impede re-convidar o mesmo email depois que o
-- convite anterior foi aceito (a linha fica com status='accepted' e a
-- constraint bloqueia um novo INSERT).
--
-- Fix: Trocar por índice único PARCIAL — apenas um convite pendente por
-- organização+email (permite ter histórico de convites aceitos).
--
-- Problema 2: A tabela invitations tem RLS habilitado (migration 004) mas
-- NÃO tem políticas definidas, tornando-a inacessível fora da service role.
--
-- Execute no Supabase SQL Editor: Dashboard → SQL Editor → New query
-- ==========================================================================

-- --------------------------------------------------------------------------
-- PARTE 1: Substituir UNIQUE constraint por partial unique index
-- --------------------------------------------------------------------------

-- Remove a constraint original (criada pelo CREATE TABLE)
ALTER TABLE invitations
  DROP CONSTRAINT IF EXISTS invitations_organization_id_email_key;

-- Remove índice antigo se existir de migration anterior
DROP INDEX IF EXISTS invitations_organization_id_email_key;

-- Cria partial unique index: apenas UM convite PENDING por org+email
-- (convites aceitos/cancelados ficam como histórico sem bloquear reenvio)
CREATE UNIQUE INDEX IF NOT EXISTS idx_invitations_pending_unique
  ON invitations (organization_id, email)
  WHERE status = 'pending';

-- --------------------------------------------------------------------------
-- PARTE 2: Políticas RLS para a tabela invitations
-- (a tabela já tem RLS habilitado, faltavam apenas as policies)
-- --------------------------------------------------------------------------

-- SELECT: admins e owners da org podem ver os convites
DROP POLICY IF EXISTS "invitations: admins select" ON invitations;
CREATE POLICY "invitations: admins select" ON invitations
  FOR SELECT
  USING (is_org_member(organization_id, 'admin'));

-- INSERT: admins e owners da org podem criar convites
DROP POLICY IF EXISTS "invitations: admins insert" ON invitations;
CREATE POLICY "invitations: admins insert" ON invitations
  FOR INSERT
  WITH CHECK (is_org_member(organization_id, 'admin'));

-- UPDATE: apenas a service role pode mudar o status (accept/cancel)
-- Políticas sem USING/WITH CHECK restringem acesso via anon key —
-- a service role usada pelos Server Actions bypassa RLS completamente.
-- Não há necessidade de policy UPDATE para client-side.

-- DELETE: admins e owners da org podem excluir convites
DROP POLICY IF EXISTS "invitations: admins delete" ON invitations;
CREATE POLICY "invitations: admins delete" ON invitations
  FOR DELETE
  USING (is_org_member(organization_id, 'admin'));

-- Permite que o próprio convidado veja o convite pelo token
-- (necessário para /accept-invite via service role — já funciona sem policy)
-- Se houver acesso client-side ao token, descomentar:
-- DROP POLICY IF EXISTS "invitations: token select" ON invitations;
-- CREATE POLICY "invitations: token select" ON invitations
--   FOR SELECT USING (true); -- Token é o segredo, não precisa de auth extra

-- --------------------------------------------------------------------------
-- PARTE 3: Índices de performance (idempotentes)
-- --------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_invitations_token      ON invitations (token);
CREATE INDEX IF NOT EXISTS idx_invitations_email      ON invitations (email);
CREATE INDEX IF NOT EXISTS idx_invitations_org_status ON invitations (organization_id, status);

-- --------------------------------------------------------------------------
-- VERIFICAÇÃO: mostra o estado atual das constraints e policies
-- --------------------------------------------------------------------------
SELECT
  'Constraints'   AS tipo,
  conname         AS nome,
  pg_get_constraintdef(oid) AS definicao
FROM pg_constraint
WHERE conrelid = 'invitations'::regclass

UNION ALL

SELECT
  'Index'         AS tipo,
  indexname       AS nome,
  indexdef        AS definicao
FROM pg_indexes
WHERE tablename = 'invitations'

UNION ALL

SELECT
  'RLS Policy'    AS tipo,
  policyname      AS nome,
  cmd             AS definicao
FROM pg_policies
WHERE tablename = 'invitations'

ORDER BY tipo, nome;
