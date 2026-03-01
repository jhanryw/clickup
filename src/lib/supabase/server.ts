/**
 * Cliente Supabase para uso SERVER-SIDE APENAS.
 *
 * SEGURANÇA:
 *  - Usa SUPABASE_SERVICE_ROLE_KEY (nunca exposta ao cliente)
 *  - Usa SUPABASE_URL interna do Docker (não sai para internet)
 *  - Chama set_user_context() antes de queries que precisam de contexto de usuário
 *
 * USO: Apenas em Server Components, Server Actions e Route Handlers.
 * NUNCA importe este arquivo em Client Components.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Validação das variáveis de ambiente em tempo de execução (server-only)
function getServerEnv() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    console.error(
      '[Supabase] SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY não configuradas. ' +
      'Verifique as variáveis de ambiente no Easypanel/Dockerfile.'
    )
    // Retorna valores vazios para evitar crash durante SSR/build.
    // As queries vão falhar gracefully em vez de derrubar o servidor.
    return { url: url || '', key: key || '' }
  }
  return { url, key }
}

/**
 * Cria um cliente Supabase com a service role key.
 * RLS é bypassado por padrão — use withUserContext() para aplicar RLS.
 */
export function createServiceClient(): SupabaseClient {
  const { url, key } = getServerEnv()
  return createClient(url, key, {
    auth: { persistSession: false },
  })
}

/**
 * Executa uma função com o contexto de usuário definido na sessão do Postgres.
 *
 * Define 'app.current_user_id' na transação para que as políticas RLS
 * possam usar current_app_user() — mesmo com a service role.
 *
 * @example
 * const tasks = await withUserContext(userId, async (db) => {
 *   const { data } = await db.from('tasks').select('*')
 *   return data
 * })
 */
export async function withUserContext<T>(
  userId: string,
  fn: (db: SupabaseClient) => Promise<T>
): Promise<T> {
  const db = createServiceClient()

  // Seta o user_id na sessão Postgres (LOCAL = apenas nesta transação)
  const { error } = await db.rpc('set_user_context', { p_user_id: userId })
  if (error) {
    throw new Error(`Falha ao definir contexto de usuário: ${error.message}`)
  }

  return fn(db)
}

/**
 * Verifica se um usuário tem role mínimo em uma organização.
 * Usa a service role para fazer a query sem interferência de RLS.
 */
export async function getUserOrgRole(
  userId: string,
  organizationId: string
): Promise<'owner' | 'admin' | 'member' | 'viewer' | null> {
  const db = createServiceClient()

  const { data } = await db
    .from('organization_members')
    .select('role')
    .eq('user_id', userId)
    .eq('organization_id', organizationId)
    .single()

  return (data?.role as 'owner' | 'admin' | 'member' | 'viewer') ?? null
}

/**
 * Verifica se o usuário tem acesso a um space (direto ou via org)
 */
export async function canUserAccessSpace(
  userId: string,
  spaceId: string
): Promise<boolean> {
  const db = createServiceClient()

  // Pega o space e verifica org membership
  const { data: space } = await db
    .from('spaces')
    .select('organization_id, is_private')
    .eq('id', spaceId)
    .single()

  if (!space) return false

  const orgRole = await getUserOrgRole(userId, space.organization_id)

  // Admins/owners da org têm acesso total
  if (orgRole === 'owner' || orgRole === 'admin') return true

  // Space público + membro da org
  if (!space.is_private && orgRole !== null) return true

  // Space privado: verifica membership explícita
  const { data: membership } = await db
    .from('space_members')
    .select('id')
    .eq('space_id', spaceId)
    .eq('user_id', userId)
    .single()

  return membership !== null
}

/**
 * Sincroniza o perfil do usuário LogTo no Supabase.
 * Chamado após o login.
 */
export async function upsertUserProfile(profile: {
  id: string
  email: string
  full_name?: string | null
  avatar_url?: string | null
  logto_roles?: string[]
}): Promise<void> {
  const db = createServiceClient()

  const { error } = await db.from('profiles').upsert(
    {
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name ?? null,
      avatar_url: profile.avatar_url ?? null,
      logto_roles: profile.logto_roles ?? [],
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  )

  if (error) {
    throw new Error(`Falha ao sincronizar perfil: ${error.message}`)
  }
}
