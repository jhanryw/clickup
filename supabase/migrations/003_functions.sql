-- ==========================================================================
-- MIGRATION 003: FUNÇÕES AUXILIARES E RPC
-- ==========================================================================

-- Função chamada pelo cliente Supabase server-side para definir o user context
-- antes de executar queries com RLS (quando não usando service_role).
CREATE OR REPLACE FUNCTION set_user_context(p_user_id TEXT)
RETURNS VOID AS $$
BEGIN
  -- LOCAL = válido apenas nesta transação
  PERFORM set_config('app.current_user_id', p_user_id, TRUE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Concede permissão para a role 'anon' e 'authenticated' chamarem a função
GRANT EXECUTE ON FUNCTION set_user_context(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION current_app_user() TO anon, authenticated;

-- ==========================================================================
-- FUNÇÃO: dispatch_webhook
-- Chamada por triggers quando eventos ocorrem em tasks.
-- Não envia o webhook diretamente (isso é feito por Edge Function / cron),
-- mas insere um registro em webhook_logs para processamento assíncrono.
-- ==========================================================================
CREATE OR REPLACE FUNCTION dispatch_webhook_event(
  p_organization_id UUID,
  p_event           TEXT,
  p_payload         JSONB
) RETURNS VOID AS $$
DECLARE
  v_webhook RECORD;
BEGIN
  FOR v_webhook IN
    SELECT id FROM webhooks_config
    WHERE organization_id = p_organization_id
      AND is_active = TRUE
      AND p_event = ANY(events)
  LOOP
    INSERT INTO webhook_logs (webhook_id, event, payload)
    VALUES (v_webhook.id, p_event, p_payload);
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================================================
-- TRIGGER: task_webhook_trigger
-- Dispara quando uma task é criada, atualizada ou deletada.
-- ==========================================================================
CREATE OR REPLACE FUNCTION task_webhook_trigger_fn()
RETURNS TRIGGER AS $$
DECLARE
  v_list_rec  RECORD;
  v_org_id    UUID;
  v_event     TEXT;
  v_payload   JSONB;
BEGIN
  -- Descobre a organização da tarefa
  SELECT
    COALESCE(s.organization_id, s2.organization_id) INTO v_org_id
  FROM lists l
  LEFT JOIN folders f  ON f.id = l.folder_id
  LEFT JOIN spaces s   ON s.id = f.space_id
  LEFT JOIN spaces s2  ON s2.id = l.space_id
  WHERE l.id = COALESCE(NEW.list_id, OLD.list_id);

  IF v_org_id IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  -- Determina o evento
  IF TG_OP = 'INSERT' THEN
    v_event := 'task.created';
    v_payload := to_jsonb(NEW);
  ELSIF TG_OP = 'DELETE' THEN
    v_event := 'task.deleted';
    v_payload := to_jsonb(OLD);
  ELSIF TG_OP = 'UPDATE' THEN
    -- Verifica se o status mudou para um status "fechado"
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

CREATE TRIGGER trg_task_webhook
  AFTER INSERT OR UPDATE OR DELETE ON tasks
  FOR EACH ROW EXECUTE FUNCTION task_webhook_trigger_fn();

-- ==========================================================================
-- FUNÇÃO: get_space_hierarchy
-- Retorna a hierarquia completa de um space para o sidebar.
-- Retorna JSON com spaces -> folders -> lists.
-- ==========================================================================
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
                jsonb_build_object(
                  'id',    l.id,
                  'name',  l.name,
                  'color', l.color
                ) ORDER BY l.name
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
