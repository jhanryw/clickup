-- ==========================================================================
-- SCHEMA COMPLETO CONSOLIDADO — QARVON (ClickUp Clone)
-- Execute este script INTEIRO no Supabase SQL Editor.
-- Hierarquia: Organization > Space > Folder > List > Task
-- ==========================================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================================================
-- FUNÇÕES AUXILIARES
-- ==========================================================================

CREATE OR REPLACE FUNCTION current_app_user()
RETURNS TEXT AS $$
  SELECT NULLIF(current_setting('app.current_user_id', TRUE), '');
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==========================================================================
-- PROFILES (sincronizado com LogTo — id = LogTo sub)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS profiles (
  id           TEXT PRIMARY KEY,
  email        TEXT UNIQUE NOT NULL,
  full_name    TEXT,
  avatar_url   TEXT,
  logto_roles  TEXT[]       NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================================================
-- ORGANIZATIONS
-- ==========================================================================
CREATE TABLE IF NOT EXISTS organizations (
  id         UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT         NOT NULL,
  slug       TEXT         UNIQUE NOT NULL,
  logo_url   TEXT,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_organizations_updated_at ON organizations;
CREATE TRIGGER trg_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Membros da organização (RBAC: owner > admin > member > viewer)
CREATE TABLE IF NOT EXISTS organization_members (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         TEXT        NOT NULL REFERENCES profiles(id)       ON DELETE CASCADE,
  role            TEXT        NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, user_id)
);

-- ==========================================================================
-- SPACES
-- ==========================================================================
CREATE TABLE IF NOT EXISTS spaces (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  description     TEXT,
  color           TEXT,
  icon            TEXT,
  is_private      BOOLEAN     NOT NULL DEFAULT FALSE,
  created_by      TEXT        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_spaces_updated_at ON spaces;
CREATE TRIGGER trg_spaces_updated_at
  BEFORE UPDATE ON spaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS space_members (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  space_id   UUID        NOT NULL REFERENCES spaces(id)   ON DELETE CASCADE,
  user_id    TEXT        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role       TEXT        NOT NULL CHECK (role IN ('admin', 'member', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (space_id, user_id)
);

-- ==========================================================================
-- FOLDERS
-- ==========================================================================
CREATE TABLE IF NOT EXISTS folders (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  space_id    UUID        NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  description TEXT,
  color       TEXT,
  is_private  BOOLEAN     NOT NULL DEFAULT FALSE,
  created_by  TEXT        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_folders_updated_at ON folders;
CREATE TRIGGER trg_folders_updated_at
  BEFORE UPDATE ON folders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS folder_members (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  folder_id  UUID        NOT NULL REFERENCES folders(id)  ON DELETE CASCADE,
  user_id    TEXT        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role       TEXT        NOT NULL CHECK (role IN ('admin', 'member', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (folder_id, user_id)
);

-- ==========================================================================
-- CUSTOM STATUSES
-- ==========================================================================
CREATE TABLE IF NOT EXISTS custom_statuses (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT        NOT NULL,
  color      TEXT        NOT NULL DEFAULT '#6B7280',
  "order"    INTEGER     NOT NULL DEFAULT 0,
  is_closed  BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Statuses padrão do sistema
INSERT INTO custom_statuses (id, name, color, "order", is_closed) VALUES
  ('00000000-0000-0000-0000-000000000001', 'A Fazer',      '#6B7280', 0, FALSE),
  ('00000000-0000-0000-0000-000000000002', 'Em Progresso', '#3B82F6', 1, FALSE),
  ('00000000-0000-0000-0000-000000000003', 'Em Revisão',   '#F59E0B', 2, FALSE),
  ('00000000-0000-0000-0000-000000000004', 'Concluído',    '#10B981', 3, TRUE)
ON CONFLICT (id) DO NOTHING;

-- ==========================================================================
-- LISTS
-- ==========================================================================
CREATE TABLE IF NOT EXISTS lists (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  folder_id         UUID        REFERENCES folders(id) ON DELETE CASCADE,
  space_id          UUID        REFERENCES spaces(id)  ON DELETE CASCADE,
  name              TEXT        NOT NULL,
  description       TEXT,
  color             TEXT,
  is_private        BOOLEAN     NOT NULL DEFAULT FALSE,
  default_status_id UUID        REFERENCES custom_statuses(id) ON DELETE SET NULL,
  created_by        TEXT        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT lists_parent_check CHECK (
    (folder_id IS NOT NULL AND space_id IS NULL) OR
    (folder_id IS NULL     AND space_id IS NOT NULL)
  )
);

DROP TRIGGER IF EXISTS trg_lists_updated_at ON lists;
CREATE TRIGGER trg_lists_updated_at
  BEFORE UPDATE ON lists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS list_statuses (
  list_id    UUID    NOT NULL REFERENCES lists(id)           ON DELETE CASCADE,
  status_id  UUID    NOT NULL REFERENCES custom_statuses(id) ON DELETE CASCADE,
  "order"    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (list_id, status_id)
);

CREATE TABLE IF NOT EXISTS list_members (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  list_id    UUID        NOT NULL REFERENCES lists(id)   ON DELETE CASCADE,
  user_id    TEXT        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role       TEXT        NOT NULL CHECK (role IN ('admin', 'member', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (list_id, user_id)
);

-- ==========================================================================
-- TASKS
-- ==========================================================================
CREATE TABLE IF NOT EXISTS tasks (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  list_id         UUID        NOT NULL REFERENCES lists(id)          ON DELETE CASCADE,
  parent_task_id  UUID        REFERENCES tasks(id)                   ON DELETE CASCADE,
  title           TEXT        NOT NULL,
  description     TEXT,
  status_id       UUID        REFERENCES custom_statuses(id)         ON DELETE SET NULL,
  priority        TEXT        CHECK (priority IN ('urgent', 'high', 'normal', 'low')),
  due_date        TIMESTAMPTZ,
  start_date      TIMESTAMPTZ,
  estimated_hours DECIMAL(8,2),
  "order"         INTEGER     NOT NULL DEFAULT 0,
  created_by      TEXT        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_tasks_updated_at ON tasks;
CREATE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS task_assignees (
  task_id     UUID        NOT NULL REFERENCES tasks(id)    ON DELETE CASCADE,
  user_id     TEXT        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by TEXT        REFERENCES profiles(id) ON DELETE SET NULL,
  PRIMARY KEY (task_id, user_id)
);

CREATE TABLE IF NOT EXISTS task_comments (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id    UUID        NOT NULL REFERENCES tasks(id)    ON DELETE CASCADE,
  user_id    TEXT        NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  content    TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_task_comments_updated_at ON task_comments;
CREATE TRIGGER trg_task_comments_updated_at
  BEFORE UPDATE ON task_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS task_attachments (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id    UUID        NOT NULL REFERENCES tasks(id)    ON DELETE CASCADE,
  user_id    TEXT        NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  file_name  TEXT        NOT NULL,
  file_url   TEXT        NOT NULL,
  file_size  BIGINT,
  mime_type  TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================================================
-- WEBHOOKS (tabela = "webhooks" para coincidir com o app)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS webhooks (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  url             TEXT        NOT NULL,
  secret          TEXT,
  events          TEXT[]      NOT NULL DEFAULT '{}',
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  created_by      TEXT        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_webhooks_updated_at ON webhooks;
CREATE TRIGGER trg_webhooks_updated_at
  BEFORE UPDATE ON webhooks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS webhook_logs (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  webhook_id      UUID        NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event           TEXT        NOT NULL,
  payload         JSONB       NOT NULL,
  response_status INTEGER,
  response_body   TEXT,
  attempt_count   INTEGER     NOT NULL DEFAULT 1,
  next_retry_at   TIMESTAMPTZ,
  delivered_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================================================
-- FORMS (com organization_id para coincidir com o app)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS forms (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  list_id         UUID        NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  description     TEXT,
  slug            TEXT        UNIQUE NOT NULL,
  fields          JSONB       NOT NULL DEFAULT '[]',
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  created_by      TEXT        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_forms_updated_at ON forms;
CREATE TRIGGER trg_forms_updated_at
  BEFORE UPDATE ON forms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS form_submissions (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  form_id      UUID        NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  task_id      UUID        REFERENCES tasks(id) ON DELETE SET NULL,
  data         JSONB       NOT NULL DEFAULT '{}',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================================================
-- INDEXES
-- ==========================================================================
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org_id  ON organization_members(organization_id);

CREATE INDEX IF NOT EXISTS idx_spaces_org_id      ON spaces(organization_id);
CREATE INDEX IF NOT EXISTS idx_space_members_uid  ON space_members(user_id);
CREATE INDEX IF NOT EXISTS idx_space_members_sid  ON space_members(space_id);

CREATE INDEX IF NOT EXISTS idx_folders_space_id    ON folders(space_id);
CREATE INDEX IF NOT EXISTS idx_folder_members_uid  ON folder_members(user_id);
CREATE INDEX IF NOT EXISTS idx_folder_members_fid  ON folder_members(folder_id);

CREATE INDEX IF NOT EXISTS idx_lists_folder_id    ON lists(folder_id);
CREATE INDEX IF NOT EXISTS idx_lists_space_id     ON lists(space_id);
CREATE INDEX IF NOT EXISTS idx_list_members_uid   ON list_members(user_id);
CREATE INDEX IF NOT EXISTS idx_list_members_lid   ON list_members(list_id);

CREATE INDEX IF NOT EXISTS idx_tasks_list_id        ON tasks(list_id);
CREATE INDEX IF NOT EXISTS idx_tasks_parent_id      ON tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status_id      ON tasks(status_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by     ON tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_task_assignees_uid   ON task_assignees(user_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_tid    ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_attachments_tid ON task_attachments(task_id);

CREATE INDEX IF NOT EXISTS idx_webhooks_org_id      ON webhooks(organization_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_wid     ON webhook_logs(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_retry   ON webhook_logs(next_retry_at) WHERE next_retry_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_forms_org_id         ON forms(organization_id);
CREATE INDEX IF NOT EXISTS idx_forms_list_id        ON forms(list_id);
CREATE INDEX IF NOT EXISTS idx_forms_slug           ON forms(slug);
CREATE INDEX IF NOT EXISTS idx_form_submissions_fid ON form_submissions(form_id);

-- ==========================================================================
-- RLS — HABILITAR EM TODAS AS TABELAS
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
ALTER TABLE webhooks             ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE forms                ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_submissions     ENABLE ROW LEVEL SECURITY;

-- ==========================================================================
-- FUNÇÕES AUXILIARES DE PERMISSÃO
-- ==========================================================================

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

CREATE OR REPLACE FUNCTION can_access_space(p_space_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_org_id UUID;
  v_is_private BOOLEAN;
BEGIN
  SELECT organization_id, is_private INTO v_org_id, v_is_private
  FROM spaces WHERE id = p_space_id;

  IF is_org_member(v_org_id, 'admin') THEN RETURN TRUE; END IF;
  IF NOT v_is_private AND is_org_member(v_org_id, 'viewer') THEN RETURN TRUE; END IF;

  RETURN EXISTS (
    SELECT 1 FROM space_members
    WHERE space_id = p_space_id AND user_id = current_app_user()
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION can_access_folder(p_folder_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_space_id  UUID;
  v_is_private BOOLEAN;
BEGIN
  SELECT space_id, is_private INTO v_space_id, v_is_private
  FROM folders WHERE id = p_folder_id;

  IF NOT can_access_space(v_space_id) THEN RETURN FALSE; END IF;
  IF NOT v_is_private THEN RETURN TRUE; END IF;

  RETURN EXISTS (
    SELECT 1 FROM folder_members
    WHERE folder_id = p_folder_id AND user_id = current_app_user()
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION can_access_list(p_list_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_folder_id UUID;
  v_space_id  UUID;
  v_is_private BOOLEAN;
BEGIN
  SELECT folder_id, space_id, is_private INTO v_folder_id, v_space_id, v_is_private
  FROM lists WHERE id = p_list_id;

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
-- RLS POLICIES
-- ==========================================================================

-- ── PROFILES ──
DROP POLICY IF EXISTS "profiles: own profile is visible" ON profiles;
CREATE POLICY "profiles: own profile is visible" ON profiles
  FOR SELECT USING (id = current_app_user());

DROP POLICY IF EXISTS "profiles: org members see each other" ON profiles;
CREATE POLICY "profiles: org members see each other" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members om1
      JOIN   organization_members om2 ON om2.organization_id = om1.organization_id
      WHERE  om1.user_id = profiles.id
        AND  om2.user_id = current_app_user()
    )
  );

DROP POLICY IF EXISTS "profiles: upsert own profile" ON profiles;
CREATE POLICY "profiles: upsert own profile" ON profiles
  FOR ALL USING (id = current_app_user())
  WITH CHECK (id = current_app_user());

-- ── ORGANIZATIONS ──
DROP POLICY IF EXISTS "orgs: members can view" ON organizations;
CREATE POLICY "orgs: members can view" ON organizations
  FOR SELECT USING (is_org_member(id, 'viewer'));

DROP POLICY IF EXISTS "orgs: admins can update" ON organizations;
CREATE POLICY "orgs: admins can update" ON organizations
  FOR UPDATE USING (is_org_member(id, 'admin'))
  WITH CHECK (is_org_member(id, 'admin'));

DROP POLICY IF EXISTS "orgs: owners can delete" ON organizations;
CREATE POLICY "orgs: owners can delete" ON organizations
  FOR DELETE USING (is_org_member(id, 'owner'));

DROP POLICY IF EXISTS "orgs: authenticated can create" ON organizations;
CREATE POLICY "orgs: authenticated can create" ON organizations
  FOR INSERT WITH CHECK (current_app_user() IS NOT NULL);

-- ── ORGANIZATION MEMBERS ──
DROP POLICY IF EXISTS "org_members: members see members of same org" ON organization_members;
CREATE POLICY "org_members: members see members of same org" ON organization_members
  FOR SELECT USING (is_org_member(organization_id, 'viewer'));

DROP POLICY IF EXISTS "org_members: admins manage members" ON organization_members;
CREATE POLICY "org_members: admins manage members" ON organization_members
  FOR ALL USING (is_org_member(organization_id, 'admin'))
  WITH CHECK (is_org_member(organization_id, 'admin'));

-- Permitir que qualquer autenticado insira a si mesmo como owner (criação de org)
DROP POLICY IF EXISTS "org_members: self insert as owner" ON organization_members;
CREATE POLICY "org_members: self insert as owner" ON organization_members
  FOR INSERT WITH CHECK (
    user_id = current_app_user() AND role = 'owner'
  );

-- ── SPACES ──
DROP POLICY IF EXISTS "spaces: select with access check" ON spaces;
CREATE POLICY "spaces: select with access check" ON spaces
  FOR SELECT USING (can_access_space(id));

DROP POLICY IF EXISTS "spaces: admins insert" ON spaces;
CREATE POLICY "spaces: admins insert" ON spaces
  FOR INSERT WITH CHECK (is_org_member(organization_id, 'admin'));

DROP POLICY IF EXISTS "spaces: admins update" ON spaces;
CREATE POLICY "spaces: admins update" ON spaces
  FOR UPDATE USING (is_org_member(organization_id, 'admin'))
  WITH CHECK (is_org_member(organization_id, 'admin'));

DROP POLICY IF EXISTS "spaces: owners delete" ON spaces;
CREATE POLICY "spaces: owners delete" ON spaces
  FOR DELETE USING (is_org_member(organization_id, 'owner'));

-- ── SPACE MEMBERS ──
DROP POLICY IF EXISTS "space_members: select" ON space_members;
CREATE POLICY "space_members: select" ON space_members
  FOR SELECT USING (can_access_space(space_id));

DROP POLICY IF EXISTS "space_members: manage" ON space_members;
CREATE POLICY "space_members: manage" ON space_members
  FOR ALL USING (is_org_member(get_space_org_id(space_id), 'admin'))
  WITH CHECK (is_org_member(get_space_org_id(space_id), 'admin'));

-- ── FOLDERS ──
DROP POLICY IF EXISTS "folders: select with access check" ON folders;
CREATE POLICY "folders: select with access check" ON folders
  FOR SELECT USING (can_access_folder(id));

DROP POLICY IF EXISTS "folders: space admins insert" ON folders;
CREATE POLICY "folders: space admins insert" ON folders
  FOR INSERT WITH CHECK (can_access_space(space_id));

DROP POLICY IF EXISTS "folders: space admins update" ON folders;
CREATE POLICY "folders: space admins update" ON folders
  FOR UPDATE USING (is_org_member(get_space_org_id(space_id), 'admin'))
  WITH CHECK (is_org_member(get_space_org_id(space_id), 'admin'));

DROP POLICY IF EXISTS "folders: org owners delete" ON folders;
CREATE POLICY "folders: org owners delete" ON folders
  FOR DELETE USING (is_org_member(get_space_org_id(space_id), 'owner'));

-- ── FOLDER MEMBERS ──
DROP POLICY IF EXISTS "folder_members: select" ON folder_members;
CREATE POLICY "folder_members: select" ON folder_members
  FOR SELECT USING (can_access_folder(folder_id));

DROP POLICY IF EXISTS "folder_members: manage" ON folder_members;
CREATE POLICY "folder_members: manage" ON folder_members
  FOR ALL USING (is_org_member(get_folder_org_id(folder_id), 'admin'))
  WITH CHECK (is_org_member(get_folder_org_id(folder_id), 'admin'));

-- ── CUSTOM STATUSES ──
DROP POLICY IF EXISTS "custom_statuses: authenticated read" ON custom_statuses;
CREATE POLICY "custom_statuses: authenticated read" ON custom_statuses
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "custom_statuses: authenticated write" ON custom_statuses;
CREATE POLICY "custom_statuses: authenticated write" ON custom_statuses
  FOR ALL USING (current_app_user() IS NOT NULL)
  WITH CHECK (current_app_user() IS NOT NULL);

-- ── LISTS ──
DROP POLICY IF EXISTS "lists: select with access check" ON lists;
CREATE POLICY "lists: select with access check" ON lists
  FOR SELECT USING (can_access_list(id));

DROP POLICY IF EXISTS "lists: members insert" ON lists;
CREATE POLICY "lists: members insert" ON lists
  FOR INSERT WITH CHECK (
    (folder_id IS NOT NULL AND can_access_folder(folder_id)) OR
    (space_id  IS NOT NULL AND can_access_space(space_id))
  );

DROP POLICY IF EXISTS "lists: admins update" ON lists;
CREATE POLICY "lists: admins update" ON lists
  FOR UPDATE USING (is_org_member(get_list_org_id(id), 'admin'))
  WITH CHECK (is_org_member(get_list_org_id(id), 'admin'));

DROP POLICY IF EXISTS "lists: owners delete" ON lists;
CREATE POLICY "lists: owners delete" ON lists
  FOR DELETE USING (is_org_member(get_list_org_id(id), 'owner'));

-- ── LIST STATUSES & MEMBERS ──
DROP POLICY IF EXISTS "list_statuses: select" ON list_statuses;
CREATE POLICY "list_statuses: select" ON list_statuses
  FOR SELECT USING (can_access_list(list_id));

DROP POLICY IF EXISTS "list_statuses: manage" ON list_statuses;
CREATE POLICY "list_statuses: manage" ON list_statuses
  FOR ALL USING (TRUE)
  WITH CHECK (TRUE);

DROP POLICY IF EXISTS "list_members: select" ON list_members;
CREATE POLICY "list_members: select" ON list_members
  FOR SELECT USING (can_access_list(list_id));

DROP POLICY IF EXISTS "list_members: manage" ON list_members;
CREATE POLICY "list_members: manage" ON list_members
  FOR ALL USING (is_org_member(get_list_org_id(list_id), 'admin'))
  WITH CHECK (is_org_member(get_list_org_id(list_id), 'admin'));

-- ── TASKS ──
DROP POLICY IF EXISTS "tasks: select with list access" ON tasks;
CREATE POLICY "tasks: select with list access" ON tasks
  FOR SELECT USING (can_access_list(list_id));

DROP POLICY IF EXISTS "tasks: members insert" ON tasks;
CREATE POLICY "tasks: members insert" ON tasks
  FOR INSERT WITH CHECK (
    can_access_list(list_id) AND
    is_org_member(get_list_org_id(list_id), 'member')
  );

DROP POLICY IF EXISTS "tasks: members update own, admins all" ON tasks;
CREATE POLICY "tasks: members update own, admins all" ON tasks
  FOR UPDATE USING (
    can_access_list(list_id) AND (
      created_by = current_app_user() OR
      EXISTS (SELECT 1 FROM task_assignees ta WHERE ta.task_id = tasks.id AND ta.user_id = current_app_user()) OR
      is_org_member(get_list_org_id(list_id), 'admin')
    )
  );

DROP POLICY IF EXISTS "tasks: admins delete" ON tasks;
CREATE POLICY "tasks: admins delete" ON tasks
  FOR DELETE USING (is_org_member(get_list_org_id(list_id), 'admin'));

-- ── TASK ASSIGNEES ──
DROP POLICY IF EXISTS "task_assignees: select" ON task_assignees;
CREATE POLICY "task_assignees: select" ON task_assignees
  FOR SELECT USING (can_access_list((SELECT list_id FROM tasks WHERE id = task_id)));

DROP POLICY IF EXISTS "task_assignees: manage" ON task_assignees;
CREATE POLICY "task_assignees: manage" ON task_assignees
  FOR ALL USING (
    is_org_member(get_task_org_id(task_id), 'member')
  ) WITH CHECK (
    is_org_member(get_task_org_id(task_id), 'member')
  );

-- ── TASK COMMENTS ──
DROP POLICY IF EXISTS "task_comments: select" ON task_comments;
CREATE POLICY "task_comments: select" ON task_comments
  FOR SELECT USING (can_access_list((SELECT list_id FROM tasks WHERE id = task_id)));

DROP POLICY IF EXISTS "task_comments: insert" ON task_comments;
CREATE POLICY "task_comments: insert" ON task_comments
  FOR INSERT WITH CHECK (
    user_id = current_app_user() AND
    is_org_member(get_task_org_id(task_id), 'member')
  );

DROP POLICY IF EXISTS "task_comments: update own" ON task_comments;
CREATE POLICY "task_comments: update own" ON task_comments
  FOR UPDATE USING (user_id = current_app_user())
  WITH CHECK (user_id = current_app_user());

DROP POLICY IF EXISTS "task_comments: delete own or admin" ON task_comments;
CREATE POLICY "task_comments: delete own or admin" ON task_comments
  FOR DELETE USING (
    user_id = current_app_user() OR
    is_org_member(get_task_org_id(task_id), 'admin')
  );

-- ── TASK ATTACHMENTS ──
DROP POLICY IF EXISTS "task_attachments: select" ON task_attachments;
CREATE POLICY "task_attachments: select" ON task_attachments
  FOR SELECT USING (can_access_list((SELECT list_id FROM tasks WHERE id = task_id)));

DROP POLICY IF EXISTS "task_attachments: insert" ON task_attachments;
CREATE POLICY "task_attachments: insert" ON task_attachments
  FOR INSERT WITH CHECK (user_id = current_app_user());

DROP POLICY IF EXISTS "task_attachments: delete own or admin" ON task_attachments;
CREATE POLICY "task_attachments: delete own or admin" ON task_attachments
  FOR DELETE USING (
    user_id = current_app_user() OR
    is_org_member(get_task_org_id(task_id), 'admin')
  );

-- ── WEBHOOKS ──
DROP POLICY IF EXISTS "webhooks: org admins manage" ON webhooks;
CREATE POLICY "webhooks: org admins manage" ON webhooks
  FOR ALL USING (is_org_member(organization_id, 'admin'))
  WITH CHECK (is_org_member(organization_id, 'admin'));

DROP POLICY IF EXISTS "webhook_logs: org admins view" ON webhook_logs;
CREATE POLICY "webhook_logs: org admins view" ON webhook_logs
  FOR SELECT USING (
    is_org_member(
      (SELECT organization_id FROM webhooks WHERE id = webhook_logs.webhook_id),
      'admin'
    )
  );

-- ── FORMS ──
DROP POLICY IF EXISTS "forms: members view" ON forms;
CREATE POLICY "forms: members view" ON forms
  FOR SELECT USING (is_org_member(organization_id, 'viewer'));

DROP POLICY IF EXISTS "forms: admins manage" ON forms;
CREATE POLICY "forms: admins manage" ON forms
  FOR ALL USING (is_org_member(organization_id, 'admin'))
  WITH CHECK (is_org_member(organization_id, 'admin'));

DROP POLICY IF EXISTS "form_submissions: public insert" ON form_submissions;
CREATE POLICY "form_submissions: public insert" ON form_submissions
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM forms WHERE id = form_id AND is_active = TRUE)
  );

DROP POLICY IF EXISTS "form_submissions: admins select" ON form_submissions;
CREATE POLICY "form_submissions: admins select" ON form_submissions
  FOR SELECT USING (
    is_org_member(
      (SELECT organization_id FROM forms WHERE id = form_submissions.form_id),
      'admin'
    )
  );

-- ==========================================================================
-- FUNÇÕES RPC
-- ==========================================================================

-- Função para setar o user context em transações com RLS
CREATE OR REPLACE FUNCTION set_user_context(p_user_id TEXT)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.current_user_id', p_user_id, TRUE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION set_user_context(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION current_app_user() TO anon, authenticated;

-- Dispatch webhook events
CREATE OR REPLACE FUNCTION dispatch_webhook_event(
  p_organization_id UUID,
  p_event           TEXT,
  p_payload         JSONB
) RETURNS VOID AS $$
DECLARE
  v_webhook RECORD;
BEGIN
  FOR v_webhook IN
    SELECT id FROM webhooks
    WHERE organization_id = p_organization_id
      AND is_active = TRUE
      AND p_event = ANY(events)
  LOOP
    INSERT INTO webhook_logs (webhook_id, event, payload)
    VALUES (v_webhook.id, p_event, p_payload);
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger de webhook para tasks
CREATE OR REPLACE FUNCTION task_webhook_trigger_fn()
RETURNS TRIGGER AS $$
DECLARE
  v_org_id    UUID;
  v_event     TEXT;
  v_payload   JSONB;
BEGIN
  SELECT
    COALESCE(s.organization_id, s2.organization_id) INTO v_org_id
  FROM lists l
  LEFT JOIN folders f  ON f.id = l.folder_id
  LEFT JOIN spaces s   ON s.id = f.space_id
  LEFT JOIN spaces s2  ON s2.id = l.space_id
  WHERE l.id = COALESCE(NEW.list_id, OLD.list_id);

  IF v_org_id IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  IF TG_OP = 'INSERT' THEN
    v_event := 'task.created';
    v_payload := to_jsonb(NEW);
  ELSIF TG_OP = 'DELETE' THEN
    v_event := 'task.deleted';
    v_payload := to_jsonb(OLD);
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status_id IS DISTINCT FROM OLD.status_id THEN
      DECLARE v_is_closed BOOLEAN;
      BEGIN
        SELECT is_closed INTO v_is_closed FROM custom_statuses WHERE id = NEW.status_id;
        IF v_is_closed THEN
          v_event := 'task.completed';
        ELSE
          v_event := 'task.updated';
        END IF;
      END;
    ELSE
      v_event := 'task.updated';
    END IF;
    v_payload := to_jsonb(NEW);
  END IF;

  PERFORM dispatch_webhook_event(v_org_id, v_event, v_payload);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_task_webhook ON tasks;
CREATE TRIGGER trg_task_webhook
  AFTER INSERT OR UPDATE OR DELETE ON tasks
  FOR EACH ROW EXECUTE FUNCTION task_webhook_trigger_fn();

-- Hierarquia para sidebar (retorna spaces > folders > lists)
CREATE OR REPLACE FUNCTION get_space_hierarchy(p_org_id UUID, p_user_id TEXT)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
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
            'id',        f.id,
            'name',      f.name,
            'color',     f.color,
            'is_private', f.is_private,
            'lists',     COALESCE((
              SELECT jsonb_agg(
                jsonb_build_object('id', l.id, 'name', l.name, 'color', l.color)
                ORDER BY l.name
              )
              FROM lists l WHERE l.folder_id = f.id
            ), '[]'::jsonb)
          ) ORDER BY f.name
        )
        FROM folders f WHERE f.space_id = s.id
      ), '[]'::jsonb),
      'direct_lists', COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object('id', l.id, 'name', l.name, 'color', l.color)
          ORDER BY l.name
        )
        FROM lists l WHERE l.space_id = s.id
      ), '[]'::jsonb)
    ) ORDER BY s.name
  ) INTO v_result
  FROM spaces s
  WHERE s.organization_id = p_org_id;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_space_hierarchy(UUID, TEXT) TO authenticated;

-- ==========================================================================
-- FIM DO SCHEMA
-- ==========================================================================
