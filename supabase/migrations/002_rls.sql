-- ==========================================================================
-- MIGRATION 002: ROW LEVEL SECURITY (RLS)
--
-- ESTRATÉGIA:
--   - Todas as tabelas têm RLS habilitado (default DENY para anon)
--   - A função current_app_user() lê 'app.current_user_id' setada
--     pela aplicação no início de cada transação Server Action.
--   - Server Actions usam a service_role key (bypass RLS por padrão),
--     mas as políticas aqui protegem contra acesso direto ao DB e
--     servem como camada de defesa extra quando usamos roles restritos.
--
-- HIERARQUIA DE ACESSO:
--   org member (owner/admin) → acesso total ao org
--   space member → acesso ao space e seus folders/lists/tasks
--   folder member → acesso à folder e suas lists/tasks
--   list member → acesso à list e suas tasks
-- ==========================================================================

-- ---------------------------------------------------------------------------
-- FUNÇÕES AUXILIARES DE PERMISSÃO
-- ---------------------------------------------------------------------------

-- Verifica se o usuário atual é membro da organização com role mínimo
CREATE OR REPLACE FUNCTION is_org_member(
  p_org_id  UUID,
  p_min_role TEXT DEFAULT 'viewer'
) RETURNS BOOLEAN AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role
  FROM organization_members
  WHERE organization_id = p_org_id
    AND user_id = current_app_user();

  RETURN CASE p_min_role
    WHEN 'owner'  THEN v_role = 'owner'
    WHEN 'admin'  THEN v_role IN ('owner', 'admin')
    WHEN 'member' THEN v_role IN ('owner', 'admin', 'member')
    WHEN 'viewer' THEN v_role IN ('owner', 'admin', 'member', 'viewer')
    ELSE FALSE
  END;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Retorna a organização de um space (helper para policies encadeadas)
CREATE OR REPLACE FUNCTION get_space_org_id(p_space_id UUID)
RETURNS UUID AS $$
  SELECT organization_id FROM spaces WHERE id = p_space_id;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION get_folder_org_id(p_folder_id UUID)
RETURNS UUID AS $$
  SELECT s.organization_id
  FROM folders f JOIN spaces s ON s.id = f.space_id
  WHERE f.id = p_folder_id;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION get_list_org_id(p_list_id UUID)
RETURNS UUID AS $$
  SELECT COALESCE(
    (SELECT s.organization_id FROM lists l JOIN spaces s ON s.id = l.space_id WHERE l.id = p_list_id AND l.space_id IS NOT NULL),
    (SELECT s.organization_id FROM lists l JOIN folders f ON f.id = l.folder_id JOIN spaces s ON s.id = f.space_id WHERE l.id = p_list_id)
  );
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION get_task_org_id(p_task_id UUID)
RETURNS UUID AS $$
  SELECT get_list_org_id(list_id) FROM tasks WHERE id = p_task_id;
$$ LANGUAGE sql STABLE;

-- Verifica acesso a um Space (direto ou via org admin)
CREATE OR REPLACE FUNCTION can_access_space(p_space_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_org_id UUID;
  v_is_private BOOLEAN;
BEGIN
  SELECT organization_id, is_private INTO v_org_id, v_is_private
  FROM spaces WHERE id = p_space_id;

  -- Org admins/owners têm acesso irrestrito
  IF is_org_member(v_org_id, 'admin') THEN RETURN TRUE; END IF;

  -- Space público: qualquer membro da org pode ver
  IF NOT v_is_private AND is_org_member(v_org_id, 'viewer') THEN RETURN TRUE; END IF;

  -- Space privado: apenas membros explícitos
  RETURN EXISTS (
    SELECT 1 FROM space_members
    WHERE space_id = p_space_id AND user_id = current_app_user()
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Verifica acesso a uma Folder
CREATE OR REPLACE FUNCTION can_access_folder(p_folder_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_space_id  UUID;
  v_is_private BOOLEAN;
BEGIN
  SELECT space_id, is_private INTO v_space_id, v_is_private
  FROM folders WHERE id = p_folder_id;

  -- Se não tem acesso ao space pai, nega
  IF NOT can_access_space(v_space_id) THEN RETURN FALSE; END IF;

  -- Folder pública: herda acesso do space
  IF NOT v_is_private THEN RETURN TRUE; END IF;

  -- Folder privada: apenas membros explícitos ou admins do space/org
  RETURN EXISTS (
    SELECT 1 FROM folder_members
    WHERE folder_id = p_folder_id AND user_id = current_app_user()
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Verifica acesso a uma List
CREATE OR REPLACE FUNCTION can_access_list(p_list_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_folder_id UUID;
  v_space_id  UUID;
  v_is_private BOOLEAN;
BEGIN
  SELECT folder_id, space_id, is_private INTO v_folder_id, v_space_id, v_is_private
  FROM lists WHERE id = p_list_id;

  -- Verifica acesso ao pai
  IF v_folder_id IS NOT NULL AND NOT can_access_folder(v_folder_id) THEN RETURN FALSE; END IF;
  IF v_space_id  IS NOT NULL AND NOT can_access_space(v_space_id)  THEN RETURN FALSE; END IF;

  IF NOT v_is_private THEN RETURN TRUE; END IF;

  RETURN EXISTS (
    SELECT 1 FROM list_members
    WHERE list_id = p_list_id AND user_id = current_app_user()
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ==========================================================================
-- HABILITAR RLS EM TODAS AS TABELAS
-- ==========================================================================
ALTER TABLE profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE spaces               ENABLE ROW LEVEL SECURITY;
ALTER TABLE space_members        ENABLE ROW LEVEL SECURITY;
ALTER TABLE folders              ENABLE ROW LEVEL SECURITY;
ALTER TABLE folder_members       ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_statuses      ENABLE ROW LEVEL SECURITY;
ALTER TABLE lists                ENABLE ROW LEVEL SECURITY;
ALTER TABLE list_statuses        ENABLE ROW LEVEL SECURITY;
ALTER TABLE list_members         ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks                ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignees       ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_attachments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks_config      ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE forms                ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_submissions     ENABLE ROW LEVEL SECURITY;

-- ==========================================================================
-- POLICIES: PROFILES
-- ==========================================================================
CREATE POLICY "profiles: own profile is visible" ON profiles
  FOR SELECT USING (id = current_app_user());

CREATE POLICY "profiles: org members see each other" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members om1
      JOIN   organization_members om2 ON om2.organization_id = om1.organization_id
      WHERE  om1.user_id = profiles.id
        AND  om2.user_id = current_app_user()
    )
  );

CREATE POLICY "profiles: upsert own profile" ON profiles
  FOR ALL USING (id = current_app_user())
  WITH CHECK (id = current_app_user());

-- ==========================================================================
-- POLICIES: ORGANIZATIONS
-- ==========================================================================
CREATE POLICY "orgs: members can view" ON organizations
  FOR SELECT USING (is_org_member(id, 'viewer'));

CREATE POLICY "orgs: admins can update" ON organizations
  FOR UPDATE USING (is_org_member(id, 'admin'))
  WITH CHECK (is_org_member(id, 'admin'));

CREATE POLICY "orgs: owners can delete" ON organizations
  FOR DELETE USING (is_org_member(id, 'owner'));

-- Criação de org não requer checagem (qualquer autenticado pode criar)
CREATE POLICY "orgs: authenticated can create" ON organizations
  FOR INSERT WITH CHECK (current_app_user() IS NOT NULL);

-- ==========================================================================
-- POLICIES: ORGANIZATION MEMBERS
-- ==========================================================================
CREATE POLICY "org_members: members see members of same org" ON organization_members
  FOR SELECT USING (is_org_member(organization_id, 'viewer'));

CREATE POLICY "org_members: admins manage members" ON organization_members
  FOR ALL USING (is_org_member(organization_id, 'admin'))
  WITH CHECK (is_org_member(organization_id, 'admin'));

-- ==========================================================================
-- POLICIES: SPACES
-- ==========================================================================
CREATE POLICY "spaces: select with access check" ON spaces
  FOR SELECT USING (can_access_space(id));

CREATE POLICY "spaces: admins insert" ON spaces
  FOR INSERT WITH CHECK (is_org_member(organization_id, 'admin'));

CREATE POLICY "spaces: admins update" ON spaces
  FOR UPDATE USING (is_org_member(organization_id, 'admin'))
  WITH CHECK (is_org_member(organization_id, 'admin'));

CREATE POLICY "spaces: owners delete" ON spaces
  FOR DELETE USING (is_org_member(organization_id, 'owner'));

-- ==========================================================================
-- POLICIES: SPACE MEMBERS
-- ==========================================================================
CREATE POLICY "space_members: select" ON space_members
  FOR SELECT USING (can_access_space(space_id));

CREATE POLICY "space_members: manage" ON space_members
  FOR ALL USING (is_org_member(get_space_org_id(space_id), 'admin'))
  WITH CHECK (is_org_member(get_space_org_id(space_id), 'admin'));

-- ==========================================================================
-- POLICIES: FOLDERS
-- ==========================================================================
CREATE POLICY "folders: select with access check" ON folders
  FOR SELECT USING (can_access_folder(id));

CREATE POLICY "folders: space admins insert" ON folders
  FOR INSERT WITH CHECK (can_access_space(space_id) AND is_org_member(get_space_org_id(space_id), 'admin'));

CREATE POLICY "folders: space admins update" ON folders
  FOR UPDATE USING (is_org_member(get_space_org_id(space_id), 'admin'))
  WITH CHECK (is_org_member(get_space_org_id(space_id), 'admin'));

CREATE POLICY "folders: org owners delete" ON folders
  FOR DELETE USING (is_org_member(get_space_org_id(space_id), 'owner'));

-- ==========================================================================
-- POLICIES: FOLDER MEMBERS
-- ==========================================================================
CREATE POLICY "folder_members: select" ON folder_members
  FOR SELECT USING (can_access_folder(folder_id));

CREATE POLICY "folder_members: manage" ON folder_members
  FOR ALL USING (is_org_member(get_folder_org_id(folder_id), 'admin'))
  WITH CHECK (is_org_member(get_folder_org_id(folder_id), 'admin'));

-- ==========================================================================
-- POLICIES: CUSTOM STATUSES
-- (Statuses padrão são visíveis para todos autenticados)
-- ==========================================================================
CREATE POLICY "custom_statuses: authenticated read" ON custom_statuses
  FOR SELECT USING (current_app_user() IS NOT NULL);

CREATE POLICY "custom_statuses: authenticated write" ON custom_statuses
  FOR ALL USING (current_app_user() IS NOT NULL)
  WITH CHECK (current_app_user() IS NOT NULL);

-- ==========================================================================
-- POLICIES: LISTS
-- ==========================================================================
CREATE POLICY "lists: select with access check" ON lists
  FOR SELECT USING (can_access_list(id));

CREATE POLICY "lists: members insert" ON lists
  FOR INSERT WITH CHECK (
    (folder_id IS NOT NULL AND can_access_folder(folder_id)) OR
    (space_id  IS NOT NULL AND can_access_space(space_id))
  );

CREATE POLICY "lists: admins update" ON lists
  FOR UPDATE USING (is_org_member(get_list_org_id(id), 'admin'))
  WITH CHECK (is_org_member(get_list_org_id(id), 'admin'));

CREATE POLICY "lists: owners delete" ON lists
  FOR DELETE USING (is_org_member(get_list_org_id(id), 'owner'));

-- ==========================================================================
-- POLICIES: LIST STATUSES & MEMBERS
-- ==========================================================================
CREATE POLICY "list_statuses: select" ON list_statuses
  FOR SELECT USING (can_access_list(list_id));

CREATE POLICY "list_statuses: manage" ON list_statuses
  FOR ALL USING (is_org_member(get_list_org_id(list_id), 'admin'))
  WITH CHECK (is_org_member(get_list_org_id(list_id), 'admin'));

CREATE POLICY "list_members: select" ON list_members
  FOR SELECT USING (can_access_list(list_id));

CREATE POLICY "list_members: manage" ON list_members
  FOR ALL USING (is_org_member(get_list_org_id(list_id), 'admin'))
  WITH CHECK (is_org_member(get_list_org_id(list_id), 'admin'));

-- ==========================================================================
-- POLICIES: TASKS
-- ==========================================================================
CREATE POLICY "tasks: select with list access" ON tasks
  FOR SELECT USING (can_access_list(list_id));

CREATE POLICY "tasks: members insert" ON tasks
  FOR INSERT WITH CHECK (
    can_access_list(list_id) AND
    is_org_member(get_list_org_id(list_id), 'member')
  );

CREATE POLICY "tasks: members update own, admins all" ON tasks
  FOR UPDATE USING (
    can_access_list(list_id) AND (
      created_by = current_app_user() OR
      EXISTS (SELECT 1 FROM task_assignees ta WHERE ta.task_id = tasks.id AND ta.user_id = current_app_user()) OR
      is_org_member(get_list_org_id(list_id), 'admin')
    )
  );

CREATE POLICY "tasks: admins delete" ON tasks
  FOR DELETE USING (is_org_member(get_list_org_id(list_id), 'admin'));

-- ==========================================================================
-- POLICIES: TASK ASSIGNEES, COMMENTS, ATTACHMENTS
-- ==========================================================================
CREATE POLICY "task_assignees: select" ON task_assignees
  FOR SELECT USING (can_access_list((SELECT list_id FROM tasks WHERE id = task_id)));

CREATE POLICY "task_assignees: manage" ON task_assignees
  FOR ALL USING (
    is_org_member(get_task_org_id(task_id), 'member')
  ) WITH CHECK (
    is_org_member(get_task_org_id(task_id), 'member')
  );

CREATE POLICY "task_comments: select" ON task_comments
  FOR SELECT USING (can_access_list((SELECT list_id FROM tasks WHERE id = task_id)));

CREATE POLICY "task_comments: insert" ON task_comments
  FOR INSERT WITH CHECK (
    user_id = current_app_user() AND
    is_org_member(get_task_org_id(task_id), 'member')
  );

CREATE POLICY "task_comments: update own" ON task_comments
  FOR UPDATE USING (user_id = current_app_user())
  WITH CHECK (user_id = current_app_user());

CREATE POLICY "task_comments: delete own or admin" ON task_comments
  FOR DELETE USING (
    user_id = current_app_user() OR
    is_org_member(get_task_org_id(task_id), 'admin')
  );

CREATE POLICY "task_attachments: select" ON task_attachments
  FOR SELECT USING (can_access_list((SELECT list_id FROM tasks WHERE id = task_id)));

CREATE POLICY "task_attachments: insert" ON task_attachments
  FOR INSERT WITH CHECK (user_id = current_app_user());

CREATE POLICY "task_attachments: delete own or admin" ON task_attachments
  FOR DELETE USING (
    user_id = current_app_user() OR
    is_org_member(get_task_org_id(task_id), 'admin')
  );

-- ==========================================================================
-- POLICIES: WEBHOOKS
-- ==========================================================================
CREATE POLICY "webhooks: org admins manage" ON webhooks_config
  FOR ALL USING (is_org_member(organization_id, 'admin'))
  WITH CHECK (is_org_member(organization_id, 'admin'));

CREATE POLICY "webhook_logs: org admins view" ON webhook_logs
  FOR SELECT USING (
    is_org_member(
      (SELECT organization_id FROM webhooks_config WHERE id = webhook_logs.webhook_id),
      'admin'
    )
  );

-- ==========================================================================
-- POLICIES: FORMS
-- Forms têm duas políticas: gestão interna e submissão pública
-- ==========================================================================
CREATE POLICY "forms: members view" ON forms
  FOR SELECT USING (can_access_list(list_id));

CREATE POLICY "forms: admins manage" ON forms
  FOR ALL USING (is_org_member(get_list_org_id(list_id), 'admin'))
  WITH CHECK (is_org_member(get_list_org_id(list_id), 'admin'));

-- Submissões são inseridas via API Route pública (anon pode submeter)
CREATE POLICY "form_submissions: public insert" ON form_submissions
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM forms WHERE id = form_id AND is_active = TRUE)
  );

CREATE POLICY "form_submissions: admins select" ON form_submissions
  FOR SELECT USING (
    is_org_member(
      get_list_org_id((SELECT list_id FROM forms WHERE id = form_submissions.form_id)),
      'admin'
    )
  );
