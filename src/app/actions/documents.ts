'use server'

import { headers } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'
import { withPermission, requireOrgRole } from '@/lib/permissions'

function getUserId(): string {
  const userId = headers().get('x-user-id')
  if (!userId) throw new Error('Não autenticado')
  return userId
}

async function getOrgFromFolder(folderId: string): Promise<string> {
  const db = createServiceClient()
  const { data } = await db
    .from('folders')
    .select('space_id, spaces(organization_id)')
    .eq('id', folderId)
    .single()
  const orgId = (data?.spaces as any)?.organization_id
  if (!orgId) throw new Error('Organização não encontrada')
  return orgId
}

export async function createDocument(input: {
  organization_id: string
  folder_id?: string | null
  title: string
  content?: any
}) {
  return withPermission(async () => {
    const userId = getUserId()
    await requireOrgRole(userId, input.organization_id, 'member')

    const db = createServiceClient()
    const { data, error } = await db
      .from('documents')
      .insert({
        organization_id: input.organization_id,
        folder_id: input.folder_id || null,
        title: input.title || 'Sem título',
        content: input.content || { type: 'doc', content: [] },
        created_by: userId,
      })
      .select('id, title')
      .single()

    if (error) throw new Error(error.message)
    return data!
  })
}

export async function updateDocument(docId: string, input: { title?: string; content?: any }) {
  return withPermission(async () => {
    const userId = getUserId()

    const db = createServiceClient()
    const { data: doc } = await db.from('documents').select('organization_id').eq('id', docId).single()
    if (!doc) throw new Error('Documento não encontrado')

    await requireOrgRole(userId, doc.organization_id, 'member')

    const { error } = await db
      .from('documents')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', docId)

    if (error) throw new Error(error.message)
    return { success: true }
  })
}

export async function deleteDocument(docId: string) {
  return withPermission(async () => {
    const userId = getUserId()

    const db = createServiceClient()
    const { data: doc } = await db.from('documents').select('organization_id').eq('id', docId).single()
    if (!doc) throw new Error('Documento não encontrado')

    await requireOrgRole(userId, doc.organization_id, 'admin')

    const { error } = await db.from('documents').delete().eq('id', docId)
    if (error) throw new Error(error.message)
    return { success: true }
  })
}

export async function getDocumentsByFolder(folderId: string) {
  return withPermission(async () => {
    const db = createServiceClient()
    const { data, error } = await db
      .from('documents')
      .select('id, title, created_at, updated_at, created_by')
      .eq('folder_id', folderId)
      .order('updated_at', { ascending: false })

    if (error) throw new Error(error.message)
    return data || []
  })
}

export async function getDocumentsByOrg(orgId: string) {
  return withPermission(async () => {
    const userId = getUserId()
    await requireOrgRole(userId, orgId, 'member')

    const db = createServiceClient()
    const { data, error } = await db
      .from('documents')
      .select('id, title, folder_id, created_at, updated_at')
      .eq('organization_id', orgId)
      .order('updated_at', { ascending: false })

    if (error) throw new Error(error.message)
    return data || []
  })
}
