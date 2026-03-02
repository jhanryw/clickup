'use server'

import { headers } from 'next/headers'
import { z } from 'zod'
import { CreateSpaceSchema, CreateFolderSchema, CreateListSchema } from '@/lib/validators'
import { withPermission, requireOrgRole, requireSpaceAccess } from '@/lib/permissions'
import { createServiceClient } from '@/lib/supabase/server'
import { sendTransactionalEmail } from './listmonk'

function getUserId(): string {
  const userId = headers().get('x-user-id')
  if (!userId) throw new Error('Não autenticado')
  return userId
}

// ─── CREATE ───────────────────────────────────────────────────────────

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

    const { data: defaultStatus } = await db
      .from('custom_statuses')
      .select('id')
      .order('order', { ascending: true })
      .limit(1)
      .single()

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

    if (list) {
      const { data: allStatuses } = await db
        .from('custom_statuses')
        .select('id, order')
        .order('order', { ascending: true })

      if (allStatuses && allStatuses.length > 0) {
        await db.from('list_statuses').insert(
          allStatuses.map((s) => ({ list_id: list.id, status_id: s.id, order: s.order }))
        )
      }
    }

    return list!
  })
}

// ─── RENAME ───────────────────────────────────────────────────────────

export async function renameSpace(spaceId: string, name: string) {
  return withPermission(async () => {
    const userId = getUserId()
    if (!name?.trim()) throw new Error('Nome inválido')

    const db = createServiceClient()
    const { data: space } = await db.from('spaces').select('organization_id').eq('id', spaceId).single()
    if (!space) throw new Error('Space não encontrado')

    await requireOrgRole(userId, space.organization_id, 'admin')

    const { error } = await db.from('spaces').update({ name: name.trim() }).eq('id', spaceId)
    if (error) throw new Error(error.message)
    return { success: true }
  })
}

export async function renameFolder(folderId: string, name: string) {
  return withPermission(async () => {
    const userId = getUserId()
    if (!name?.trim()) throw new Error('Nome inválido')

    const db = createServiceClient()
    const { data: folder } = await db
      .from('folders')
      .select('space_id, spaces(organization_id)')
      .eq('id', folderId)
      .single()
    if (!folder) throw new Error('Folder não encontrado')

    const orgId = (folder.spaces as any)?.organization_id
    await requireOrgRole(userId, orgId, 'member')

    const { error } = await db.from('folders').update({ name: name.trim() }).eq('id', folderId)
    if (error) throw new Error(error.message)
    return { success: true }
  })
}

export async function renameList(listId: string, name: string) {
  return withPermission(async () => {
    const userId = getUserId()
    if (!name?.trim()) throw new Error('Nome inválido')

    const db = createServiceClient()
    const { data: list } = await db.from('lists').select('id').eq('id', listId).single()
    if (!list) throw new Error('Lista não encontrada')

    const { error } = await db.from('lists').update({ name: name.trim() }).eq('id', listId)
    if (error) throw new Error(error.message)
    return { success: true }
  })
}

// ─── DELETE ───────────────────────────────────────────────────────────

export async function deleteSpace(spaceId: string) {
  return withPermission(async () => {
    const userId = getUserId()

    const db = createServiceClient()
    const { data: space } = await db.from('spaces').select('organization_id').eq('id', spaceId).single()
    if (!space) throw new Error('Space não encontrado')

    await requireOrgRole(userId, space.organization_id, 'owner')

    const { error } = await db.from('spaces').delete().eq('id', spaceId)
    if (error) throw new Error(error.message)
    return { success: true }
  })
}

export async function deleteFolder(folderId: string) {
  return withPermission(async () => {
    const userId = getUserId()

    const db = createServiceClient()
    const { data: folder } = await db
      .from('folders')
      .select('space_id, spaces(organization_id)')
      .eq('id', folderId)
      .single()
    if (!folder) throw new Error('Folder não encontrado')

    const orgId = (folder.spaces as any)?.organization_id
    await requireOrgRole(userId, orgId, 'admin')

    const { error } = await db.from('folders').delete().eq('id', folderId)
    if (error) throw new Error(error.message)
    return { success: true }
  })
}

export async function deleteList(listId: string) {
  return withPermission(async () => {
    const userId = getUserId()

    const db = createServiceClient()
    const { data: list } = await db.from('lists').select('id').eq('id', listId).single()
    if (!list) throw new Error('Lista não encontrada')

    const { error } = await db.from('lists').delete().eq('id', listId)
    if (error) throw new Error(error.message)
    return { success: true }
  })
}

// ─── MEMBERS ──────────────────────────────────────────────────────────

export async function inviteMember(orgId: string, email: string, role: string) {
  return withPermission(async () => {
    const userId = getUserId()

    const validRoles = ['admin', 'member', 'viewer']
    if (!validRoles.includes(role)) throw new Error('Role inválido')
    if (!email || !email.includes('@')) throw new Error('Email inválido')

    await requireOrgRole(userId, orgId, 'admin')

    const db = createServiceClient()

    // Verifica se já é membro pelo perfil existente
    const { data: profile } = await db
      .from('profiles')
      .select('id')
      .eq('email', email.toLowerCase())
      .single()

    if (profile) {
      const { data: existingMember } = await db
        .from('organization_members')
        .select('id')
        .eq('organization_id', orgId)
        .eq('user_id', profile.id)
        .single()

      if (existingMember) throw new Error('Este usuário já é membro da organização.')

      const { error } = await db.from('organization_members').insert({
        organization_id: orgId,
        user_id: profile.id,
        role,
      })
      if (error) throw new Error(error.message)
      return { success: true, joined: true }
    }

    // Usuário ainda não tem perfil → cria convite pendente
    const { data: existingInvite } = await db
      .from('invitations')
      .select('id')
      .eq('organization_id', orgId)
      .eq('email', email.toLowerCase())
      .single()

    if (existingInvite) {
      throw new Error('Já existe um convite pendente para este email.')
    }

    const { error } = await db.from('invitations').insert({
      organization_id: orgId,
      email: email.toLowerCase(),
      role,
      invited_by: userId,
    })
    if (error) throw new Error(error.message)

    // Email de convite via Listmonk (se configurado)
    const inviteTemplateId = parseInt(process.env.LISTMONK_INVITE_TEMPLATE_ID || '0')
    if (inviteTemplateId > 0) {
      try {
        const { data: orgData } = await db
          .from('organizations')
          .select('name')
          .eq('id', orgId)
          .single()
        await sendTransactionalEmail({
          subscriberEmail: email.toLowerCase(),
          subscriberName: email.split('@')[0],
          templateId: inviteTemplateId,
          data: {
            org_name: orgData?.name || 'Qarvon',
            role,
          },
        })
      } catch (emailErr) {
        console.error('[Listmonk] Falha ao enviar email de convite', emailErr)
      }
    }

    return {
      success: true,
      joined: false,
      message: 'Convite criado. O usuário será adicionado automaticamente ao fazer login.',
    }
  })
}

// Chamada no layout após login para processar convites pendentes
export async function processInvitations(userEmail: string, userId: string) {
  if (!userEmail || !userId) return

  const db = createServiceClient()

  const { data: pendingInvites } = await db
    .from('invitations')
    .select('id, organization_id, role')
    .eq('email', userEmail.toLowerCase())

  if (!pendingInvites || pendingInvites.length === 0) return

  for (const invite of pendingInvites) {
    // Garante perfil existe
    await db
      .from('profiles')
      .upsert({ id: userId, email: userEmail.toLowerCase() }, { onConflict: 'id' })

    // Evita duplicata
    const { data: existing } = await db
      .from('organization_members')
      .select('id')
      .eq('organization_id', invite.organization_id)
      .eq('user_id', userId)
      .single()

    if (!existing) {
      await db.from('organization_members').insert({
        organization_id: invite.organization_id,
        user_id: userId,
        role: invite.role,
      })
    }

    await db.from('invitations').delete().eq('id', invite.id)
  }
}
