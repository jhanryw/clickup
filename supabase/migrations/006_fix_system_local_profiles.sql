-- ==========================================================================
-- 006_fix_system_local_profiles.sql
--
-- Objetivo:
--   1. Adicionar ON UPDATE CASCADE nas FKs que referenciam profiles(id)
--      para permitir a fusão de perfis @system.local → ID LogTo real.
--   2. Remover perfis órfãos com emails @system.local que não têm
--      nenhuma associação (org, tasks, docs, etc.).
--
-- Execute no Supabase SQL Editor: Dashboard → SQL Editor → New query
-- ==========================================================================

-- --------------------------------------------------------------------------
-- PARTE 1: ON UPDATE CASCADE nas FKs de profiles(id)
-- Permite renomear/mesclar profile IDs sem quebrar referências.
-- --------------------------------------------------------------------------

-- organization_members
ALTER TABLE organization_members
  DROP CONSTRAINT IF EXISTS organization_members_user_id_fkey;
ALTER TABLE organization_members
  ADD CONSTRAINT organization_members_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(id)
    ON DELETE CASCADE ON UPDATE CASCADE;

-- spaces
ALTER TABLE spaces
  DROP CONSTRAINT IF EXISTS spaces_created_by_fkey;
ALTER TABLE spaces
  ADD CONSTRAINT spaces_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES profiles(id)
    ON DELETE SET NULL ON UPDATE CASCADE;

-- folders
ALTER TABLE folders
  DROP CONSTRAINT IF EXISTS folders_created_by_fkey;
ALTER TABLE folders
  ADD CONSTRAINT folders_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES profiles(id)
    ON DELETE SET NULL ON UPDATE CASCADE;

-- lists
ALTER TABLE lists
  DROP CONSTRAINT IF EXISTS lists_created_by_fkey;
ALTER TABLE lists
  ADD CONSTRAINT lists_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES profiles(id)
    ON DELETE SET NULL ON UPDATE CASCADE;

-- tasks (created_by)
ALTER TABLE tasks
  DROP CONSTRAINT IF EXISTS tasks_created_by_fkey;
ALTER TABLE tasks
  ADD CONSTRAINT tasks_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES profiles(id)
    ON DELETE SET NULL ON UPDATE CASCADE;

-- task_assignments (user_id)
ALTER TABLE task_assignments
  DROP CONSTRAINT IF EXISTS task_assignments_user_id_fkey;
ALTER TABLE task_assignments
  ADD CONSTRAINT task_assignments_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(id)
    ON DELETE CASCADE ON UPDATE CASCADE;

-- task_assignments (assigned_by)
ALTER TABLE task_assignments
  DROP CONSTRAINT IF EXISTS task_assignments_assigned_by_fkey;
ALTER TABLE task_assignments
  ADD CONSTRAINT task_assignments_assigned_by_fkey
    FOREIGN KEY (assigned_by) REFERENCES profiles(id)
    ON DELETE SET NULL ON UPDATE CASCADE;

-- documents (created_by)
ALTER TABLE documents
  DROP CONSTRAINT IF EXISTS documents_created_by_fkey;
ALTER TABLE documents
  ADD CONSTRAINT documents_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES profiles(id)
    ON DELETE SET NULL ON UPDATE CASCADE;

-- invitations (invited_by)  — só se existir
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invitations' AND column_name = 'invited_by'
  ) THEN
    ALTER TABLE invitations
      DROP CONSTRAINT IF EXISTS invitations_invited_by_fkey;
    ALTER TABLE invitations
      ADD CONSTRAINT invitations_invited_by_fkey
        FOREIGN KEY (invited_by) REFERENCES profiles(id)
        ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- --------------------------------------------------------------------------
-- PARTE 2: Limpar perfis @system.local totalmente órfãos
-- (sem memberships de org, sem tasks criadas, sem assignments)
-- --------------------------------------------------------------------------

DELETE FROM profiles
WHERE
  (
    email LIKE '%@system.local'
    OR email LIKE '%@local'
    OR email LIKE '%@logto.local'
    OR email LIKE '%@pending.qarvon.com'
  )
  AND id NOT IN (SELECT DISTINCT user_id  FROM organization_members)
  AND id NOT IN (SELECT DISTINCT user_id  FROM task_assignments)
  AND id NOT IN (
    SELECT DISTINCT created_by FROM tasks WHERE created_by IS NOT NULL
  );

-- --------------------------------------------------------------------------
-- PARTE 3: Exibir quantos perfis @system.local ainda restam (com dados)
-- (estes precisam de fusão manual ou serão corrigidos no próximo login)
-- --------------------------------------------------------------------------

SELECT
  id,
  email,
  full_name,
  (SELECT COUNT(*) FROM organization_members om WHERE om.user_id = p.id) AS org_count,
  (SELECT COUNT(*) FROM task_assignments  ta WHERE ta.user_id = p.id)    AS task_count
FROM profiles p
WHERE
  email LIKE '%@system.local'
  OR email LIKE '%@local'
  OR email LIKE '%@pending.qarvon.com'
ORDER BY org_count DESC, task_count DESC;
