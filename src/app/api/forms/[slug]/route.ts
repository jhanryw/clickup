import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * GET /api/forms/[slug] - Retorna os dados públicos de um formulário
 * POST /api/forms/[slug] - Recebe submissão do formulário e cria tarefa
 *
 * maps_to suportados:
 *   'title' | 'description' | 'priority' | 'due_date'
 *   'assignee_email'   → busca profile por email e atribui a tarefa
 *   'status_name'      → busca status por nome e define o status da tarefa
 *
 * maps_to_custom_field_id (UUID) → salva como task_custom_field_values.value_text
 */

export async function GET(
  req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const db = createServiceClient()

    const { data: form, error } = await db
      .from('forms')
      .select('id, name, description, slug, fields, list_id, is_active')
      .eq('slug', params.slug)
      .eq('is_active', true)
      .single()

    if (error || !form) {
      return NextResponse.json(
        { error: 'Formulário não encontrado ou inativo' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      name: form.name,
      description: form.description,
      fields: form.fields,
      slug: form.slug,
    })
  } catch (err: any) {
    console.error('[Forms API] Error fetching form:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(
  req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const db = createServiceClient()

    // Busca o formulário
    const { data: form, error: formErr } = await db
      .from('forms')
      .select('id, list_id, fields, is_active')
      .eq('slug', params.slug)
      .eq('is_active', true)
      .single()

    if (formErr || !form) {
      return NextResponse.json(
        { error: 'Formulário não encontrado ou inativo' },
        { status: 404 }
      )
    }

    const body = await req.json()
    const { data: formData } = body

    if (!formData || typeof formData !== 'object') {
      return NextResponse.json(
        { error: 'Dados do formulário inválidos' },
        { status: 400 }
      )
    }

    // -----------------------------------------------------------------------
    // Mapear campos para task fields
    // -----------------------------------------------------------------------
    const fields = form.fields as any[]
    let title         = ''
    let description   = ''
    let priority: string | null = null
    let dueDate: string | null  = null
    let assigneeEmail: string | null = null
    let statusName: string | null    = null
    const customFieldPairs: Array<{ fieldId: string; value: string }> = []

    for (const field of fields) {
      const value = formData[field.id]

      // Required field check
      if ((value === undefined || value === null || value === '') && field.required) {
        return NextResponse.json(
          { error: `Campo obrigatório: ${field.label}` },
          { status: 400 }
        )
      }
      if (value === undefined || value === null || value === '') continue

      const strVal = String(value).trim()

      switch (field.maps_to) {
        case 'title':          title        = strVal; break
        case 'description':    description  = strVal; break
        case 'priority':       priority     = strVal; break
        case 'due_date':       dueDate      = strVal; break
        case 'assignee_email': assigneeEmail = strVal.toLowerCase(); break
        case 'status_name':    statusName   = strVal; break
      }

      // Campo customizado mapeado pelo id do campo
      if (field.maps_to_custom_field_id) {
        customFieldPairs.push({ fieldId: field.maps_to_custom_field_id, value: strVal })
      }
    }

    if (!title) {
      title = `Submissão via formulário: ${params.slug}`
    }

    // -----------------------------------------------------------------------
    // Resolver status_id
    // -----------------------------------------------------------------------
    const { data: list } = await db
      .from('lists')
      .select('default_status_id')
      .eq('id', form.list_id)
      .single()

    let statusId: string | null = list?.default_status_id ?? null

    if (statusName) {
      // Procura no list_statuses por nome (case-insensitive)
      const { data: listStatusRows } = await db
        .from('list_statuses')
        .select('status_id, custom_statuses(id, name)')
        .eq('list_id', form.list_id)

      const matched = (listStatusRows ?? []).find(
        (r: any) => r.custom_statuses?.name?.toLowerCase() === statusName!.toLowerCase()
      )
      if (matched) statusId = matched.status_id
    }

    // -----------------------------------------------------------------------
    // Resolver assignee_id por email
    // -----------------------------------------------------------------------
    let assigneeId: string | null = null
    if (assigneeEmail) {
      const { data: profile } = await db
        .from('profiles')
        .select('id')
        .ilike('email', assigneeEmail)
        .maybeSingle()

      assigneeId = profile?.id ?? null
    }

    // -----------------------------------------------------------------------
    // Criar task
    // -----------------------------------------------------------------------
    const { data: task, error: taskErr } = await db
      .from('tasks')
      .insert({
        list_id: form.list_id,
        title,
        description: description || null,
        status_id: statusId,
        priority: priority || null,
        due_date: dueDate || null,
      })
      .select('id')
      .single()

    if (taskErr) {
      console.error('[Forms API] Erro ao criar task:', taskErr)
      return NextResponse.json(
        { error: 'Erro ao criar tarefa' },
        { status: 500 }
      )
    }

    // -----------------------------------------------------------------------
    // Atribuir responsável
    // -----------------------------------------------------------------------
    if (assigneeId && task?.id) {
      await db.from('task_assignees').insert({
        task_id: task.id,
        user_id: assigneeId,
        assigned_by: assigneeId,
      }).catch(() => {/* silencia duplicatas */})
    }

    // -----------------------------------------------------------------------
    // Salvar valores de campos customizados
    // -----------------------------------------------------------------------
    if (task?.id && customFieldPairs.length > 0) {
      await db.from('task_custom_field_values').upsert(
        customFieldPairs.map(({ fieldId, value }) => ({
          task_id: task.id,
          field_id: fieldId,
          value_text: value,
          updated_at: new Date().toISOString(),
        })),
        { onConflict: 'task_id,field_id' }
      ).catch((err: any) => console.warn('[Forms] Custom fields warn:', err.message))
    }

    // -----------------------------------------------------------------------
    // Salvar submissão
    // -----------------------------------------------------------------------
    await db.from('form_submissions').insert({
      form_id: form.id,
      task_id: task?.id,
      data: formData,
    })

    return NextResponse.json(
      { success: true, task_id: task?.id },
      { status: 201 }
    )
  } catch (err: any) {
    console.error('[Forms API] Error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
