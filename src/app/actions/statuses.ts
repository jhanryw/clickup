'use server'

import { headers } from 'next/headers'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import { withPermission, requireOrgRole } from '@/lib/permissions'

function getUserId(): string {
  const userId = headers().get('x-user-id')
  if (!userId) throw new Error('Não autenticado')
  return userId
}

async function getOrgIdFromList(listId: string): Promise<string> {
  const db = createServiceClient()
  const { data: list } = await db
    .from('lists')
    .select('folder_id, space_id')
    .eq('id', listId)
    .single()

  if (!list) throw new Error('Lista não encontrada')

  let spaceId = list.space_id
  if (!spaceId && list.folder_id) {
    const { data: folder } = await db
      .from('folders')
      .select('space_id')
      .eq('id', list.folder_id)
      .single()
    spaceId = folder?.space_id
  }

  const { data: space } = await db
    .from('spaces')
    .select('organization_id')
    .eq('id', spaceId)
    .single()

  return space?.organization_id ?? (() => { throw new Error('Org não encontrada') })()
}

/** Cria um novo status e vincula à lista */
export async function addStatusToList(
  listId: string,
  name: string,
  color: string,
  isClosed = false
) {
  return withPermission(async () => {
    const userId = getUserId()
    z.string().uuid().parse(listId)
    if (!name?.trim()) throw new Error('Nome inválido')

    const orgId = await getOrgIdFromList(listId)
    await requireOrgRole(userId, orgId, 'admin')

    const db = createServiceClient()

    // Calcula a maior order já existente para esta lista
    const { data: currentStatuses } = await db
      .from('list_statuses')
      .select('order')
      .eq('list_id', listId)
      .order('order', { ascending: false })
      .limit(1)

    const nextOrder = (currentStatuses?.[0]?.order ?? -1) + 1

    const { data: newStatus, error: statusError } = await db
      .from('custom_statuses')
      .insert({ name: name.trim(), color, is_closed: isClosed, order: nextOrder })
      .select('id')
      .single()

    if (statusError) throw new Error(statusError.message)

    const { error: linkError } = await db.from('list_statuses').insert({
      list_id: listId,
      status_id: newStatus!.id,
      order: nextOrder,
    })

    if (linkError) throw new Error(linkError.message)

    return { success: true, statusId: newStatus!.id }
  })
}

/** Atualiza nome/cor/isClosed de um status existente */
export async function updateStatus(
  statusId: string,
  name: string,
  color: string,
  isClosed: boolean
) {
  return withPermission(async () => {
    const userId = getUserId()
    z.string().uuid().parse(statusId)
    if (!name?.trim()) throw new Error('Nome inválido')

    // Verifica que o status existe e pega qualquer lista vinculada para checar permissão
    const db = createServiceClient()
    const { data: link } = await db
      .from('list_statuses')
      .select('list_id')
      .eq('status_id', statusId)
      .limit(1)
      .single()

    if (link) {
      const orgId = await getOrgIdFromList(link.list_id)
      await requireOrgRole(userId, orgId, 'admin')
    }

    const { error } = await db
      .from('custom_statuses')
      .update({ name: name.trim(), color, is_closed: isClosed })
      .eq('id', statusId)

    if (error) throw new Error(error.message)
    return { success: true }
  })
}

/** Remove o vínculo do status com a lista (não apaga o custom_status global) */
export async function removeStatusFromList(listId: string, statusId: string) {
  return withPermission(async () => {
    const userId = getUserId()
    z.string().uuid().parse(listId)
    z.string().uuid().parse(statusId)

    const orgId = await getOrgIdFromList(listId)
    await requireOrgRole(userId, orgId, 'admin')

    const db = createServiceClient()

    // Verifica quantos statuses restam — não pode remover o último
    const { count } = await db
      .from('list_statuses')
      .select('*', { count: 'exact', head: true })
      .eq('list_id', listId)

    if ((count ?? 0) <= 1) throw new Error('A lista precisa ter ao menos 1 status.')

    const { error } = await db
      .from('list_statuses')
      .delete()
      .eq('list_id', listId)
      .eq('status_id', statusId)

    if (error) throw new Error(error.message)
    return { success: true }
  })
}
