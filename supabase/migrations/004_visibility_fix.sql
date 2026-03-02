-- ==========================================================================
-- MIGRATION 004: Corrigir visibilidade de Spaces/Folders privados na sidebar
--
-- O get_space_hierarchy usa SECURITY DEFINER (bypass RLS), então precisa
-- filtrar explicitamente spaces e folders privados com base em:
--   1. Se o usuário é admin/owner da org → acesso irrestrito
--   2. Space privado → só membros em space_members
--   3. Folder privada → só membros em folder_members
-- ==========================================================================

CREATE OR REPLACE FUNCTION get_space_hierarchy(p_org_id UUID, p_user_id TEXT)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_is_admin BOOLEAN;
BEGIN
  -- Verifica se o usuário é admin/owner (acesso irrestrito)
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = p_org_id
      AND user_id = p_user_id
      AND role IN ('owner', 'admin')
  ) INTO v_is_admin;

  SELECT jsonb_agg(
    jsonb_build_object(
      'id',          s.id,
      'name',        s.name,
      'color',       s.color,
      'icon',        s.icon,
      'is_private',  s.is_private,
      'folders',     COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'id',         f.id,
            'name',       f.name,
            'color',      f.color,
            'is_private', f.is_private,
            'lists',      COALESCE((
              SELECT jsonb_agg(
                jsonb_build_object('id', l.id, 'name', l.name, 'color', l.color)
                ORDER BY l.name
              )
              FROM lists l
              WHERE l.folder_id = f.id
                AND (
                  NOT l.is_private
                  OR v_is_admin
                  OR EXISTS (SELECT 1 FROM list_members lm WHERE lm.list_id = l.id AND lm.user_id = p_user_id)
                )
            ), '[]'::jsonb)
          ) ORDER BY f.name
        )
        FROM folders f
        WHERE f.space_id = s.id
          AND (
            NOT f.is_private
            OR v_is_admin
            OR EXISTS (SELECT 1 FROM folder_members fm WHERE fm.folder_id = f.id AND fm.user_id = p_user_id)
          )
      ), '[]'::jsonb),
      'direct_lists', COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object('id', l.id, 'name', l.name, 'color', l.color)
          ORDER BY l.name
        )
        FROM lists l
        WHERE l.space_id = s.id
          AND (
            NOT l.is_private
            OR v_is_admin
            OR EXISTS (SELECT 1 FROM list_members lm WHERE lm.list_id = l.id AND lm.user_id = p_user_id)
          )
      ), '[]'::jsonb)
    ) ORDER BY s.name
  ) INTO v_result
  FROM spaces s
  WHERE s.organization_id = p_org_id
    AND (
      NOT s.is_private
      OR v_is_admin
      OR EXISTS (SELECT 1 FROM space_members sm WHERE sm.space_id = s.id AND sm.user_id = p_user_id)
    );

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_space_hierarchy(UUID, TEXT) TO authenticated;

-- Também adicionar tabela invitations e documents se ainda não existirem
-- (rodadas em migrações anteriores, mas por segurança aqui com IF NOT EXISTS)

CREATE TABLE IF NOT EXISTS invitations (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email           TEXT        NOT NULL,
  role            TEXT        NOT NULL CHECK (role IN ('admin', 'member', 'viewer')),
  invited_by      TEXT        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, email)
);

CREATE TABLE IF NOT EXISTS documents (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  folder_id       UUID        REFERENCES folders(id) ON DELETE SET NULL,
  title           TEXT        NOT NULL DEFAULT 'Sem título',
  content         JSONB       NOT NULL DEFAULT '{"type":"doc","content":[]}'::jsonb,
  created_by      TEXT        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_documents_updated_at ON documents;
CREATE TRIGGER trg_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS para documents
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "documents: org members view" ON documents;
CREATE POLICY "documents: org members view" ON documents
  FOR SELECT USING (is_org_member(organization_id, 'viewer'));

DROP POLICY IF EXISTS "documents: members create" ON documents;
CREATE POLICY "documents: members create" ON documents
  FOR INSERT WITH CHECK (is_org_member(organization_id, 'member'));

DROP POLICY IF EXISTS "documents: members update" ON documents;
CREATE POLICY "documents: members update" ON documents
  FOR UPDATE USING (is_org_member(organization_id, 'member'))
  WITH CHECK (is_org_member(organization_id, 'member'));

DROP POLICY IF EXISTS "documents: admins delete" ON documents;
CREATE POLICY "documents: admins delete" ON documents
  FOR DELETE USING (is_org_member(organization_id, 'admin'));

DROP POLICY IF EXISTS "invitations: admins manage" ON invitations;
CREATE POLICY "invitations: admins manage" ON invitations
  FOR ALL USING (is_org_member(organization_id, 'admin'))
  WITH CHECK (is_org_member(organization_id, 'admin'));
