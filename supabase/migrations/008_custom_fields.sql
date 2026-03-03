-- =========================================================================
-- Migration 008: Custom Fields (definitions per list + task values)
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. ENUM for field types
-- -------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE custom_field_type AS ENUM (
    'text',
    'number',
    'date',
    'select',
    'multiselect',
    'checkbox',
    'url',
    'email',
    'phone'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- -------------------------------------------------------------------------
-- 2. custom_field_definitions  (one row per field template, per list)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS custom_field_definitions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id     UUID        NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  type        custom_field_type NOT NULL DEFAULT 'text',
  -- For select/multiselect: [{value: string, label: string, color?: string}]
  options     JSONB       NOT NULL DEFAULT '[]'::jsonb,
  position    INTEGER     NOT NULL DEFAULT 0,
  is_required BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cfd_list_pos
  ON custom_field_definitions(list_id, position);

-- -------------------------------------------------------------------------
-- 3. task_custom_field_values  (one row per task × field)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS task_custom_field_values (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id      UUID        NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  field_id     UUID        NOT NULL REFERENCES custom_field_definitions(id) ON DELETE CASCADE,
  value_text   TEXT,
  value_number NUMERIC,
  value_date   DATE,
  value_bool   BOOLEAN,
  value_json   JSONB,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (task_id, field_id)
);

CREATE INDEX IF NOT EXISTS idx_tcfv_task  ON task_custom_field_values(task_id);
CREATE INDEX IF NOT EXISTS idx_tcfv_field ON task_custom_field_values(field_id);

-- -------------------------------------------------------------------------
-- 4. Enable RLS
-- -------------------------------------------------------------------------
ALTER TABLE custom_field_definitions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_custom_field_values    ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------------------------
-- 5. RLS Policies for custom_field_definitions
-- -------------------------------------------------------------------------

-- Helper CTE reused in both policies: resolves org_id from list_id
-- Members can SELECT
CREATE POLICY "cfd: members can read" ON custom_field_definitions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM   lists l
      LEFT JOIN spaces     s1 ON s1.id = l.space_id
      LEFT JOIN folders    fo ON fo.id = l.folder_id
      LEFT JOIN spaces     s2 ON s2.id = fo.space_id
      WHERE  l.id = custom_field_definitions.list_id
        AND  is_org_member(COALESCE(s1.organization_id, s2.organization_id), 'member')
    )
  );

-- Admins can INSERT / UPDATE / DELETE
CREATE POLICY "cfd: admins can manage" ON custom_field_definitions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM   lists l
      LEFT JOIN spaces     s1 ON s1.id = l.space_id
      LEFT JOIN folders    fo ON fo.id = l.folder_id
      LEFT JOIN spaces     s2 ON s2.id = fo.space_id
      WHERE  l.id = custom_field_definitions.list_id
        AND  is_org_member(COALESCE(s1.organization_id, s2.organization_id), 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM   lists l
      LEFT JOIN spaces     s1 ON s1.id = l.space_id
      LEFT JOIN folders    fo ON fo.id = l.folder_id
      LEFT JOIN spaces     s2 ON s2.id = fo.space_id
      WHERE  l.id = custom_field_definitions.list_id
        AND  is_org_member(COALESCE(s1.organization_id, s2.organization_id), 'admin')
    )
  );

-- -------------------------------------------------------------------------
-- 6. RLS Policies for task_custom_field_values
-- -------------------------------------------------------------------------

-- Members can SELECT their org's task values
CREATE POLICY "tcfv: members can read" ON task_custom_field_values
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM   tasks t
      JOIN   lists l ON l.id = t.list_id
      LEFT JOIN spaces     s1 ON s1.id = l.space_id
      LEFT JOIN folders    fo ON fo.id = l.folder_id
      LEFT JOIN spaces     s2 ON s2.id = fo.space_id
      WHERE  t.id = task_custom_field_values.task_id
        AND  is_org_member(COALESCE(s1.organization_id, s2.organization_id), 'member')
    )
  );

-- Members can INSERT / UPDATE / DELETE values for tasks they can access
CREATE POLICY "tcfv: members can manage" ON task_custom_field_values
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM   tasks t
      JOIN   lists l ON l.id = t.list_id
      LEFT JOIN spaces     s1 ON s1.id = l.space_id
      LEFT JOIN folders    fo ON fo.id = l.folder_id
      LEFT JOIN spaces     s2 ON s2.id = fo.space_id
      WHERE  t.id = task_custom_field_values.task_id
        AND  is_org_member(COALESCE(s1.organization_id, s2.organization_id), 'member')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM   tasks t
      JOIN   lists l ON l.id = t.list_id
      LEFT JOIN spaces     s1 ON s1.id = l.space_id
      LEFT JOIN folders    fo ON fo.id = l.folder_id
      LEFT JOIN spaces     s2 ON s2.id = fo.space_id
      WHERE  t.id = task_custom_field_values.task_id
        AND  is_org_member(COALESCE(s1.organization_id, s2.organization_id), 'member')
    )
  );
