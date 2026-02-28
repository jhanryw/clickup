/**
 * Helpers de permissão para uso em Server Actions.
 *
 * Centraliza a lógica de verificação de acesso para não duplicar
 * nas Server Actions. Sempre usa a service role para as queries.
 */

import { createServiceClient, getUserOrgRole } from './supabase/server'
import type { Role } from '@/types/database'

// Hierarquia de roles (maior índice = mais permissões)
const ROLE_HIERARCHY: Record<Role, number> = {
  viewer: 0,
  member: 1,
  admin: 2,
  owner: 3,
}

export function hasMinRole(userRole: Role | null, minRole: Role): boolean {
  if (!userRole) return false
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole]
}

// --------------------------------------------------------------------------

/**
 * Verifica se o usuário tem role mínimo na organização.
 * Lança erro se não tiver permissão.
 */
export async function requireOrgRole(
  userId: string,
  orgId: string,
  minRole: Role = 'viewer'
): Promise<Role> {
  const role = await getUserOrgRole(userId, orgId)

  if (!role || !hasMinRole(role, minRole)) {
    throw new Error(
      `Permissão negada: role '${minRole}' necessário na organização.`
    )
  }

  return role
}

/**
 * Verifica acesso a um Space.
 * Admins da org têm acesso automático. Spaces privados exigem membership.
 */
export async function requireSpaceAccess(
  userId: string,
  spaceId: string
): Promise<void> {
  const db = createServiceClient()

  const { data: space } = await db
    .from('spaces')
    .select('organization_id, is_private')
    .eq('id', spaceId)
    .single()

  if (!space) throw new Error('Space não encontrado.')

  const orgRole = await getUserOrgRole(userId, space.organization_id)

  // Admins e owners têm acesso irrestrito
  if (orgRole && hasMinRole(orgRole, 'admin')) return

  // Space público: qualquer membro da org acessa
  if (!space.is_private && orgRole !== null) return

  // Space privado: precisa de membership explícita
  const { data: membership } = await db
    .from('space_members')
    .select('id')
    .eq('space_id', spaceId)
    .eq('user_id', userId)
    .single()

  if (!membership) {
    throw new Error('Permissão negada: você não tem acesso a este Space.')
  }
}

/**
 * Verifica acesso a uma Task (via List > Folder/Space > Org).
 */
export async function requireTaskAccess(
  userId: string,
  taskId: string,
  minOrgRole: Role = 'member'
): Promise<void> {
  const db = createServiceClient()

  const { data: task } = await db
    .from('tasks')
    .select(`
      list_id,
      lists!inner(
        folder_id,
        space_id,
        folders(space_id),
        spaces(organization_id)
      )
    `)
    .eq('id', taskId)
    .single()

  if (!task) throw new Error('Tarefa não encontrada.')

  // Extrai org_id da hierarquia
  const list = task.lists as unknown as Record<string, unknown>
  const space = (list?.spaces ?? (list?.folders as Record<string, unknown>)?.spaces) as { organization_id: string } | null
  const orgId = space?.organization_id

  if (!orgId) throw new Error('Estrutura de task inválida.')

  await requireOrgRole(userId, orgId, minOrgRole)
}

/**
 * Wrapper para Server Actions — captura erros de permissão
 * e retorna em formato padronizado.
 */
export async function withPermission<T>(
  fn: () => Promise<T>
): Promise<{ data: T; error: null } | { data: null; error: string }> {
  try {
    const data = await fn()
    return { data, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    console.error('[Permission]', message)
    return { data: null, error: message }
  }
}
