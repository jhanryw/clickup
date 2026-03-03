'use server'

import { headers } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'
import { withPermission, requireOrgRole } from '@/lib/permissions'

function getUserId(): string {
  const userId = headers().get('x-user-id')
  if (!userId) throw new Error('Não autenticado')
  return userId
}

/** Resolve org_id a partir de list_id */
async function getOrgFromList(listId: string): Promise<string> {
  const db = createServiceClient()
  const { data } = await db
    .from('lists')
    .select('space_id, folder_id, spaces(organization_id), folders(spaces(organization_id))')
    .eq('id', listId)
    .single()

  if (!data) throw new Error('Lista não encontrada')

  const orgId =
    (data.spaces as any)?.organization_id ??
    ((data.folders as any)?.spaces as any)?.organization_id

  if (!orgId) throw new Error('Organização não encontrada')
  return orgId
}

// ---------------------------------------------------------------------------
// Field Definitions — CRUD
// ---------------------------------------------------------------------------

/** Retorna todos os campos personalizados de uma lista ordenados por posição */
export async function getCustomFields(listId: string) {
  return withPermission(async () => {
    const db = createServiceClient()
    const { data, error } = await db
      .from('custom_field_definitions')
      .select('*')
      .eq('list_id', listId)
      .order('position', { ascending: true })

    if (error) throw new Error(error.message)
    return data ?? []
  })
}

/** Cria um campo personalizado na lista (requer role admin) */
export async function createCustomField(input: {
  listId: string
  name: string
  type: 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'checkbox' | 'url' | 'email' | 'phone'
  options?: { value: string; label: string; color?: string }[]
  isRequired?: boolean
}) {
  return withPermission(async () => {
    const userId = getUserId()
    const orgId = await getOrgFromList(input.listId)
    await requireOrgRole(userId, orgId, 'admin')

    const db = createServiceClient()

    // próxima posição
    const { data: last } = await db
      .from('custom_field_definitions')
      .select('position')
      .eq('list_id', input.listId)
      .order('position', { ascending: false })
      .limit(1)
      .single()

    const position = (last?.position ?? -1) + 1

    const { data, error } = await db
      .from('custom_field_definitions')
      .insert({
        list_id: input.listId,
        name: input.name.trim(),
        type: input.type,
        options: input.options ?? [],
        position,
        is_required: input.isRequired ?? false,
      })
      .select('*')
      .single()

    if (error) throw new Error(error.message)
    return data!
  })
}

/** Atualiza nome, tipo, opções ou is_required de um campo */
export async function updateCustomField(
  fieldId: string,
  updates: {
    name?: string
    type?: string
    options?: any[]
    is_required?: boolean
  },
) {
  return withPermission(async () => {
    const userId = getUserId()
    const db = createServiceClient()

    const { data: field } = await db
      .from('custom_field_definitions')
      .select('list_id')
      .eq('id', fieldId)
      .single()

    if (!field) throw new Error('Campo não encontrado')

    const orgId = await getOrgFromList(field.list_id)
    await requireOrgRole(userId, orgId, 'admin')

    const { error } = await db
      .from('custom_field_definitions')
      .update(updates)
      .eq('id', fieldId)

    if (error) throw new Error(error.message)
    return { success: true }
  })
}

/** Exclui um campo personalizado (e todos os valores vinculados via CASCADE) */
export async function deleteCustomField(fieldId: string) {
  return withPermission(async () => {
    const userId = getUserId()
    const db = createServiceClient()

    const { data: field } = await db
      .from('custom_field_definitions')
      .select('list_id')
      .eq('id', fieldId)
      .single()

    if (!field) throw new Error('Campo não encontrado')

    const orgId = await getOrgFromList(field.list_id)
    await requireOrgRole(userId, orgId, 'admin')

    const { error } = await db
      .from('custom_field_definitions')
      .delete()
      .eq('id', fieldId)

    if (error) throw new Error(error.message)
    return { success: true }
  })
}

// ---------------------------------------------------------------------------
// Field Values — por tarefa
// ---------------------------------------------------------------------------

/** Retorna todos os valores de campos customizados de uma tarefa */
export async function getTaskCustomFieldValues(taskId: string) {
  return withPermission(async () => {
    const db = createServiceClient()
    const { data, error } = await db
      .from('task_custom_field_values')
      .select('*, custom_field_definitions(*)')
      .eq('task_id', taskId)

    if (error) throw new Error(error.message)
    return data ?? []
  })
}

/** Persiste (upsert) o valor de um campo personalizado numa tarefa */
export async function setCustomFieldValue(
  taskId: string,
  fieldId: string,
  value: {
    text?: string | null
    number?: number | null
    date?: string | null
    bool?: boolean | null
    json?: any
  },
) {
  return withPermission(async () => {
    const db = createServiceClient()

    const { error } = await db
      .from('task_custom_field_values')
      .upsert(
        {
          task_id: taskId,
          field_id: fieldId,
          value_text: value.text ?? null,
          value_number: value.number ?? null,
          value_date: value.date ?? null,
          value_bool: value.bool ?? null,
          value_json: value.json ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'task_id,field_id' },
      )

    if (error) throw new Error(error.message)
    return { success: true }
  })
}

/** Retorna todos os campos de uma lista junto com o valor da tarefa informada */
export async function getFieldsWithValues(listId: string, taskId: string) {
  return withPermission(async () => {
    const db = createServiceClient()

    const [{ data: fields }, { data: values }] = await Promise.all([
      db
        .from('custom_field_definitions')
        .select('*')
        .eq('list_id', listId)
        .order('position', { ascending: true }),
      db
        .from('task_custom_field_values')
        .select('*')
        .eq('task_id', taskId),
    ])

    const valueMap = new Map((values ?? []).map((v) => [v.field_id, v]))

    return (fields ?? []).map((f) => ({
      ...f,
      currentValue: valueMap.get(f.id) ?? null,
    }))
  })
}
