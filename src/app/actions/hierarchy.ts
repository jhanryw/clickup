'use server'

import { headers } from 'next/headers'
import { z } from 'zod'
import { CreateSpaceSchema, CreateFolderSchema, CreateListSchema, InviteMemberSchema } from '@/lib/validators'
import { withPermission, requireOrgRole, requireSpaceAccess } from '@/lib/permissions'
import { createServiceClient } from '@/lib/supabase/server'

function getUserId(): string {
  const userId = headers().get('x-user-id')
  if (!userId) throw new Error('Não autenticado')
  return userId
}

export async function createSpace(input: z.infer<typeof CreateSpaceSchema>) {
  return withPermission(async () => {
    const userId = getUserId()
    const parsed = CreateSpaceSchema.parse(input)

    await requireOrgRole(userId, parsed.organization_id, 'admin')

    const db = createServiceClient()
    const { data, error } = await db
      .from('spaces')
      .insert({
        organization_id: parsed.organization_id,
        name: parsed.name,
        description: parsed.description || null,
        color: parsed.color || '#4f46e5',
        icon: parsed.icon || null,
        is_private: parsed.is_private,
        created_by: userId,
      })
      .select('id, name')
      .single()

    if (error) throw new Error(error.message)
    return data!
  })
}

export async function createFolder(input: z.infer<typeof CreateFolderSchema>) {
  return withPermission(async () => {
    const userId = getUserId()
    const parsed = CreateFolderSchema.parse(input)

    await requireSpaceAccess(userId, parsed.space_id)

    // Verifica se é ao menos membro da org
    const db = createServiceClient()
    const { data: space } = await db
      .from('spaces')
      .select('organization_id')
      .eq('id', parsed.space_id)
      .single()

    if (!space) throw new Error('Space não encontrado')
    await requireOrgRole(userId, space.organization_id, 'member')

    const { data, error } = await db
      .from('folders')
      .insert({
        space_id: parsed.space_id,
        name: parsed.name,
        description: parsed.description || null,
        color: parsed.color || null,
        is_private: parsed.is_private,
        created_by: userId,
      })
      .select('id, name')
      .single()

    if (error) throw new Error(error.message)
    return data!
  })
}

export async function createList(input: {
  folder_id?: string | null
  space_id?: string | null
  name: string
  description?: string | null
  color?: string | null
  is_private?: boolean
}) {
  return withPermission(async () => {
    const userId = getUserId()
    const parsed = CreateListSchema.parse(input)

    const db = createServiceClient()

    // Resolve space_id para verificar acesso
    let resolvedSpaceId = parsed.space_id
    if (!resolvedSpaceId && parsed.folder_id) {
      const { data: folder } = await db
        .from('folders')
        .select('space_id')
        .eq('id', parsed.folder_id)
        .single()
      resolvedSpaceId = folder?.space_id
    }

    if (!resolvedSpaceId) throw new Error('Não foi possível determinar o space')
    await requireSpaceAccess(userId, resolvedSpaceId)

    // Busca o primeiro status default para usar como default_status_id
    const { data: defaultStatus } = await db
      .from('custom_statuses')
      .select('id')
      .order('order', { ascending: true })
      .limit(1)
      .single()

    // Insere a lista
    const { data: list, error } = await db
      .from('lists')
      .insert({
        folder_id: parsed.folder_id || null,
        space_id: parsed.space_id || null,
        name: parsed.name,
        description: parsed.description || null,
        color: parsed.color || null,
        is_private: parsed.is_private ?? false,
        default_status_id: defaultStatus?.id || null,
        created_by: userId,
      })
      .select('id, name')
      .single()

    if (error) throw new Error(error.message)

    // Linka os statuses default à lista
    if (list) {
      const { data: allStatuses } = await db
        .from('custom_statuses')
        .select('id, order')
        .order('order', { ascending: true })

      if (allStatuses && allStatuses.length > 0) {
        const statusLinks = allStatuses.map((s) => ({
          list_id: list.id,
          status_id: s.id,
          order: s.order,
        }))
        await db.from('list_statuses').insert(statusLinks)
      }
    }

    return list!
  })
}

export async function inviteMember(orgId: string, email: string, role: string) {
  return withPermission(async () => {
    const userId = getUserId()
    const parsed = InviteMemberSchema.parse({ email, role })

    await requireOrgRole(userId, orgId, 'admin')

    const db = createServiceClient()

    // Busca perfil pelo email
    const { data: profile } = await db
      .from('profiles')
      .select('id')
      .eq('email', parsed.email)
      .single()

    if (!profile) {
      throw new Error('Usuário não encontrado. O usuário precisa ter feito login pelo menos uma vez.')
    }

    // Verifica se já é membro
    const { data: existing } = await db
      .from('organization_members')
      .select('id')
      .eq('organization_id', orgId)
      .eq('user_id', profile.id)
      .single()

    if (existing) {
      throw new Error('Este usuário já é membro da organização.')
    }

    const { error } = await db
      .from('organization_members')
      .insert({
        organization_id: orgId,
        user_id: profile.id,
        role: parsed.role,
      })

    if (error) throw new Error(error.message)
    return { success: true }
  })
}
