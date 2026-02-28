-- ==========================================================================
-- MIGRATION 001: SCHEMA INICIAL
-- Hierarquia: Organization -> Space -> Folder -> List -> Task
-- Autor: Sistema Interno de Gestão de Tarefas
-- ==========================================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================================================
-- FUNÇÃO AUXILIAR: current_app_user()
-- Lê o user_id setado pela aplicação no início de cada transação.
-- Permite que as políticas RLS funcionem sem Supabase Auth nativo.
-- ==========================================================================
CREATE OR REPLACE FUNCTION current_app_user()
RETURNS TEXT AS $$
  SELECT NULLIF(current_setting('app.current_user_id', TRUE), '');
$$ LANGUAGE sql STABLE;

-- ==========================================================================
-- FUNÇÃO AUXILIAR: update_updated_at_column()
-- Trigger para atualizar automaticamente a coluna updated_at
-- ==========================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==========================================================================
-- PROFILES
-- Sincronizado com LogTo. O 'id' é o 'sub' do JWT do LogTo.
-- ==========================================================================
CREATE TABLE profiles (
  id           TEXT PRIMARY KEY,                -- LogTo sub (ex: "usr_abc123")
  email        TEXT UNIQUE NOT NULL,
  full_name    TEXT,
  avatar_url   TEXT,
  logto_roles  TEXT[]       NOT NULL DEFAULT '{}', -- roles vindos do LogTo
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================================================
-- ORGANIZATIONS (Tenant / Nível máximo)
-- ==========================================================================
CREATE TABLE organizations (
  id         UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT         NOT NULL,
  slug       TEXT         UNIQUE NOT NULL,
  logo_url   TEXT,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Membros da organização com RBAC granular
-- Roles: owner > admin > member > viewer
CREATE TABLE organization_members (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         TEXT        NOT NULL REFERENCES profiles(id)       ON DELETE CASCADE,
  role            TEXT        NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, user_id)
);

-- ==========================================================================
-- SPACES (Grandes áreas: Marketing, Dev, etc.)
-- ==========================================================================
CREATE TABLE spaces (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  description     TEXT,
  color           TEXT,                         -- hex color
  icon            TEXT,                         -- emoji ou nome de ícone
  is_private      BOOLEAN     NOT NULL DEFAULT FALSE,
  created_by      TEXT        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_spaces_updated_at
  BEFORE UPDATE ON spaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Membros de um Space específico (override das permissões da org)
CREATE TABLE space_members (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  space_id   UUID        NOT NULL REFERENCES spaces(id)   ON DELETE CASCADE,
  user_id    TEXT        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role       TEXT        NOT NULL CHECK (role IN ('admin', 'member', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (space_id, user_id)
);

-- ==========================================================================
-- FOLDERS (Agrupadores de Lists dentro de um Space)
-- ==========================================================================
CREATE TABLE folders (
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

CREATE TRIGGER trg_folders_updated_at
  BEFORE UPDATE ON folders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Membros de uma Folder específica
CREATE TABLE folder_members (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  folder_id  UUID        NOT NULL REFERENCES folders(id)  ON DELETE CASCADE,
  user_id    TEXT        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role       TEXT        NOT NULL CHECK (role IN ('admin', 'member', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (folder_id, user_id)
);

-- ==========================================================================
-- CUSTOM STATUSES (configuráveis por lista)
-- ==========================================================================
CREATE TABLE custom_statuses (
  id        UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name      TEXT        NOT NULL,
  color     TEXT        NOT NULL DEFAULT '#6B7280',
  "order"   INTEGER     NOT NULL DEFAULT 0,
  is_closed BOOLEAN     NOT NULL DEFAULT FALSE,  -- tarefas neste status = concluídas
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insere statuses padrão do sistema
INSERT INTO custom_statuses (id, name, color, "order", is_closed) VALUES
  ('00000000-0000-0000-0000-000000000001', 'A Fazer',     '#6B7280', 0, FALSE),
  ('00000000-0000-0000-0000-000000000002', 'Em Progresso', '#3B82F6', 1, FALSE),
  ('00000000-0000-0000-0000-000000000003', 'Em Revisão',  '#F59E0B', 2, FALSE),
  ('00000000-0000-0000-0000-000000000004', 'Concluído',   '#10B981', 3, TRUE);

-- ==========================================================================
-- LISTS (Conjunto de tarefas — dentro de Folder ou diretamente em Space)
-- ==========================================================================
CREATE TABLE lists (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- Uma lista pertence a um folder OU diretamente a um space
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
  -- Garante que a lista tem exatamente um pai
  CONSTRAINT lists_parent_check CHECK (
    (folder_id IS NOT NULL AND space_id IS NULL) OR
    (folder_id IS NULL     AND space_id IS NOT NULL)
  )
);

CREATE TRIGGER trg_lists_updated_at
  BEFORE UPDATE ON lists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Statuses disponíveis em cada lista (M2M)
CREATE TABLE list_statuses (
  list_id    UUID    NOT NULL REFERENCES lists(id)           ON DELETE CASCADE,
  status_id  UUID    NOT NULL REFERENCES custom_statuses(id) ON DELETE CASCADE,
  "order"    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (list_id, status_id)
);

-- Membros de uma List específica
CREATE TABLE list_members (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  list_id    UUID        NOT NULL REFERENCES lists(id)   ON DELETE CASCADE,
  user_id    TEXT        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role       TEXT        NOT NULL CHECK (role IN ('admin', 'member', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (list_id, user_id)
);

-- ==========================================================================
-- TASKS (Unidade mínima de trabalho)
-- ==========================================================================
CREATE TABLE tasks (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  list_id        UUID        NOT NULL REFERENCES lists(id)          ON DELETE CASCADE,
  parent_task_id UUID        REFERENCES tasks(id)                   ON DELETE CASCADE,  -- subtarefas
  title          TEXT        NOT NULL,
  description    TEXT,
  status_id      UUID        REFERENCES custom_statuses(id)         ON DELETE SET NULL,
  priority       TEXT        CHECK (priority IN ('urgent', 'high', 'normal', 'low')),
  due_date       TIMESTAMPTZ,
  start_date     TIMESTAMPTZ,
  estimated_hours DECIMAL(8,2),
  "order"        INTEGER     NOT NULL DEFAULT 0,
  created_by     TEXT        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Responsáveis por uma tarefa (M2M)
CREATE TABLE task_assignees (
  task_id     UUID        NOT NULL REFERENCES tasks(id)    ON DELETE CASCADE,
  user_id     TEXT        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by TEXT        REFERENCES profiles(id) ON DELETE SET NULL,
  PRIMARY KEY (task_id, user_id)
);

-- Comentários em tarefas
CREATE TABLE task_comments (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id    UUID        NOT NULL REFERENCES tasks(id)    ON DELETE CASCADE,
  user_id    TEXT        NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  content    TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_task_comments_updated_at
  BEFORE UPDATE ON task_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Anexos de tarefas
CREATE TABLE task_attachments (
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
-- WEBHOOKS (Saída: disparo quando tarefa é criada/concluída)
-- ==========================================================================
CREATE TABLE webhooks_config (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  url             TEXT        NOT NULL,
  -- HMAC secret para assinar o payload (NUNCA exposto ao cliente)
  secret          TEXT,
  -- Eventos suportados: task.created, task.updated, task.completed, task.deleted
  events          TEXT[]      NOT NULL DEFAULT '{}',
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  created_by      TEXT        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_webhooks_config_updated_at
  BEFORE UPDATE ON webhooks_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Log de entregas de webhook
CREATE TABLE webhook_logs (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  webhook_id      UUID        NOT NULL REFERENCES webhooks_config(id) ON DELETE CASCADE,
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
-- FORMS (Formulários públicos que criam tasks automaticamente)
-- ==========================================================================
CREATE TABLE forms (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  list_id     UUID        NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  description TEXT,
  -- slug único para URL pública: /f/{slug}
  slug        TEXT        UNIQUE NOT NULL,
  -- Definição dos campos: [{label, type, required, options}]
  fields      JSONB       NOT NULL DEFAULT '[]',
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_by  TEXT        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_forms_updated_at
  BEFORE UPDATE ON forms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Submissões de formulários
CREATE TABLE form_submissions (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  form_id      UUID        NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  task_id      UUID        REFERENCES tasks(id) ON DELETE SET NULL,  -- tarefa criada
  data         JSONB       NOT NULL DEFAULT '{}',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================================================
-- INDEXES (Performance)
-- ==========================================================================

-- Organization members
CREATE INDEX idx_org_members_user_id ON organization_members(user_id);
CREATE INDEX idx_org_members_org_id  ON organization_members(organization_id);

-- Spaces
CREATE INDEX idx_spaces_org_id      ON spaces(organization_id);
CREATE INDEX idx_space_members_uid  ON space_members(user_id);
CREATE INDEX idx_space_members_sid  ON space_members(space_id);

-- Folders
CREATE INDEX idx_folders_space_id    ON folders(space_id);
CREATE INDEX idx_folder_members_uid  ON folder_members(user_id);
CREATE INDEX idx_folder_members_fid  ON folder_members(folder_id);

-- Lists
CREATE INDEX idx_lists_folder_id    ON lists(folder_id);
CREATE INDEX idx_lists_space_id     ON lists(space_id);
CREATE INDEX idx_list_members_uid   ON list_members(user_id);
CREATE INDEX idx_list_members_lid   ON list_members(list_id);

-- Tasks
CREATE INDEX idx_tasks_list_id        ON tasks(list_id);
CREATE INDEX idx_tasks_parent_id      ON tasks(parent_task_id);
CREATE INDEX idx_tasks_status_id      ON tasks(status_id);
CREATE INDEX idx_tasks_created_by     ON tasks(created_by);
CREATE INDEX idx_task_assignees_uid   ON task_assignees(user_id);
CREATE INDEX idx_task_comments_tid    ON task_comments(task_id);
CREATE INDEX idx_task_attachments_tid ON task_attachments(task_id);

-- Webhooks
CREATE INDEX idx_webhooks_org_id      ON webhooks_config(organization_id);
CREATE INDEX idx_webhook_logs_wid     ON webhook_logs(webhook_id);
CREATE INDEX idx_webhook_logs_retry   ON webhook_logs(next_retry_at) WHERE next_retry_at IS NOT NULL;

-- Forms
CREATE INDEX idx_forms_list_id        ON forms(list_id);
CREATE INDEX idx_forms_slug           ON forms(slug);
CREATE INDEX idx_form_submissions_fid ON form_submissions(form_id);
