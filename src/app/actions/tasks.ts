'use server'

import { headers } from 'next/headers'
import { z } from 'zod'
import { CreateTaskSchema, UpdateTaskSchema } from '@/lib/validators'
import { withPermission, requireTaskAccess, requireOrgRole } from '@/lib/permissions'
import { createServiceClient } from '@/lib/supabase/server'
import { sendTransactionalEmail } from './listmonk'

function getUserId(): string {
  const userId = headers().get('x-user-id')
  if (!userId) throw new Error('Não autenticado')
  return userId
}

// Resolve o org_id a partir de um list_id
async function getOrgFromList(listId: string): Promise<string> {
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

  if (!spaceId) throw new Error('Space não encontrado para a lista')

  const { data: space } = await db
    .from('spaces')
    .select('organization_id')
    .eq('id', spaceId)
    .single()

  if (!space) throw new Error('Organização não encontrada')
  return space.organization_id
}

export async function createTask(input: z.infer<typeof CreateTaskSchema>) {
  return withPermission(async () => {
    const userId = getUserId()
    const parsed = CreateTaskSchema.parse(input)

    const orgId = await getOrgFromList(parsed.list_id)
    await requireOrgRole(userId, orgId, 'member')

    const db = createServiceClient()

    // Resolve status_id padrão se não fornecido
    let statusId = parsed.status_id
    if (!statusId) {
      const { data: list } = await db
        .from('lists')
        .select('default_status_id')
        .eq('id', parsed.list_id)
        .single()
      statusId = list?.default_status_id

      if (!statusId) {
        const { data: firstStatus } = await db
          .from('list_statuses')
          .select('status_id')
          .eq('list_id', parsed.list_id)
          .order('order', { ascending: true })
          .limit(1)
          .single()
        statusId = firstStatus?.status_id

        if (!statusId) {
          const { data: defaultStatus } = await db
            .from('custom_statuses')
            .select('id')
            .order('order', { ascending: true })
            .limit(1)
            .single()
          statusId = defaultStatus?.id
        }
      }
    }

    // Calcula order
    const { data: maxOrder } = await db
      .from('tasks')
      .select('order')
      .eq('list_id', parsed.list_id)
      .order('order', { ascending: false })
      .limit(1)
      .single()

    const newOrder = (maxOrder?.order ?? 0) + 1

    // Insere task
    const { data: task, error } = await db
      .from('tasks')
      .insert({
        list_id: parsed.list_id,
        parent_task_id: parsed.parent_task_id || null,
        title: parsed.title,
        description: parsed.description || null,
        status_id: statusId,
        priority: parsed.priority || null,
        due_date: parsed.due_date || null,
        start_date: parsed.start_date || null,
        estimated_hours: parsed.estimated_hours || null,
        order: newOrder,
        created_by: userId,
      })
      .select('id')
      .single()

    if (error) throw new Error(error.message)

    // Insere assignees se houver e envia email
    if (parsed.assignee_ids.length > 0 && task) {
      const assignees = parsed.assignee_ids.map((uid) => ({
        task_id: task.id,
        user_id: uid,
        assigned_by: userId,
      }))
      await db.from('task_assignees').insert(assignees)

      const processListmonk = parseInt(process.env.LISTMONK_ASSIGNMENT_TEMPLATE_ID || '0')
      if (processListmonk > 0) {
        for (const uid of parsed.assignee_ids) {
          const { data: assigneeProfile } = await db.from('profiles').select('email, full_name').eq('id', uid).single()
          if (assigneeProfile?.email) {
            await sendTransactionalEmail({
              subscriberEmail: assigneeProfile.email,
              subscriberName: assigneeProfile.full_name || undefined,
              templateId: processListmonk,
              data: {
                task_title: parsed.title,
                task_id: task.id,
              },
            })
          }
        }
      }
    }

    return { id: task!.id }
  })
}

export async function updateTask(taskId: string, input: z.infer<typeof UpdateTaskSchema>) {
  return withPermission(async () => {
    const userId = getUserId()
    z.string().uuid().parse(taskId)
    const parsed = UpdateTaskSchema.parse(input)

    await requireTaskAccess(userId, taskId, 'member')

    const db = createServiceClient()
    const { error } = await db
      .from('tasks')
      .update(parsed)
      .eq('id', taskId)

    if (error) throw new Error(error.message)
    return { success: true }
  })
}

export async function updateTaskStatus(taskId: string, statusId: string) {
  return withPermission(async () => {
    const userId = getUserId()
    z.string().uuid().parse(taskId)
    z.string().uuid().parse(statusId)

    await requireTaskAccess(userId, taskId, 'member')

    const db = createServiceClient()

    // Busca detalhes do novo status
    const { data: statusInfo } = await db.from('custom_statuses').select('name, is_closed').eq('id', statusId).single()
    if (!statusInfo) throw new Error('Status inválido')

    const { error, data: taskUpdate } = await db
      .from('tasks')
      .update({ status_id: statusId })
      .eq('id', taskId)
      .select('id, title, list_id')
      .single()

    if (error) throw new Error(error.message)

    // Se concluiu a tarefa, dispara:
    // 1. Webhook de saída
    // 2. Email Listmonk de "Entrega Concluída"
    if (statusInfo.is_closed && taskUpdate) {
      // Webhook
      const url = process.env.OUTGOING_WEBHOOK_URL
      if (url) {
        try {
          await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.OUTGOING_WEBHOOK_SECRET || ''}` },
            body: JSON.stringify({
              event: 'task_completed',
              task_id: taskUpdate.id,
              title: taskUpdate.title,
              completed_by: userId,
              timestamp: new Date().toISOString()
            })
          })
        } catch (err) {
          console.error('[Webhook] Falha ao enviar task_completed', err)
        }
      }

      // Listmonk: Email de "Entrega Concluída" para os assignees da task
      const completionTemplateId = parseInt(process.env.LISTMONK_COMPLETION_TEMPLATE_ID || '0')
      if (completionTemplateId > 0) {
        try {
          const { data: assignees } = await db
            .from('task_assignees')
            .select('user_id, profiles ( email, full_name )')
            .eq('task_id', taskId)

          if (assignees && assignees.length > 0) {
            for (const a of assignees) {
              const profile = (a as any).profiles
              if (profile?.email) {
                await sendTransactionalEmail({
                  subscriberEmail: profile.email,
                  subscriberName: profile.full_name || undefined,
                  templateId: completionTemplateId,
                  data: {
                    task_title: taskUpdate.title,
                    task_id: taskUpdate.id,
                    completed_by: userId,
                    status_name: statusInfo.name,
                  },
                })
              }
            }
          }
        } catch (emailErr) {
          console.error('[Listmonk] Falha ao enviar email de conclusão', emailErr)
        }
      }
    }

    return { success: true }
  })
}

export async function deleteTask(taskId: string) {
  return withPermission(async () => {
    const userId = getUserId()
    z.string().uuid().parse(taskId)

    await requireTaskAccess(userId, taskId, 'member')

    const db = createServiceClient()
    const { error } = await db.from('tasks').delete().eq('id', taskId)

    if (error) throw new Error(error.message)
    return { success: true }
  })
}

const LISTMONK_ASSIGNMENT_TEMPLATE_ID = parseInt(
  process.env.LISTMONK_ASSIGNMENT_TEMPLATE_ID || '0'
)

export async function assignTask(taskId: string, assigneeUserId: string) {
  return withPermission(async () => {
    const userId = getUserId()
    z.string().uuid().parse(taskId)

    await requireTaskAccess(userId, taskId, 'member')

    const db = createServiceClient()

    // Insere assignee
    const { error } = await db
      .from('task_assignees')
      .insert({
        task_id: taskId,
        user_id: assigneeUserId,
        assigned_by: userId,
      })

    if (error) throw new Error(error.message)

    // Envia email via Listmonk se configurado
    if (LISTMONK_ASSIGNMENT_TEMPLATE_ID > 0) {
      const [{ data: assigneeProfile }, { data: taskData }] = await Promise.all([
        db.from('profiles').select('email, full_name').eq('id', assigneeUserId).single(),
        db.from('tasks').select('title, list_id').eq('id', taskId).single(),
      ])

      if (assigneeProfile?.email && taskData) {
        await sendTransactionalEmail({
          subscriberEmail: assigneeProfile.email,
          subscriberName: assigneeProfile.full_name || undefined,
          templateId: LISTMONK_ASSIGNMENT_TEMPLATE_ID,
          data: {
            task_title: taskData.title,
            task_id: taskId,
          },
        })
      }
    }

    return { success: true }
  })
}
