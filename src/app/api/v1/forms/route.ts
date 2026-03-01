import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * POST /api/v1/forms
 *
 * Endpoint público para leads/clientes enviarem dados de formulário.
 * Cria uma tarefa automaticamente na lista configurada.
 *
 * Body:
 * {
 *   "form_slug": "contato-leads",
 *   "data": { "field_id_1": "valor", "field_id_2": "valor" }
 * }
 *
 * OU (modo direto sem form_slug):
 * {
 *   "list_id": "uuid",
 *   "title": "Nova solicitação",
 *   "description": "Detalhes...",
 *   "priority": "normal",
 *   "due_date": "2026-04-01",
 *   "source": "landing-page"
 * }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const db = createServiceClient()

    // Mode 1: Via form_slug (formulário cadastrado)
    if (body.form_slug) {
      const { data: form, error: formErr } = await db
        .from('forms')
        .select('id, list_id, fields, is_active')
        .eq('slug', body.form_slug)
        .eq('is_active', true)
        .single()

      if (formErr || !form) {
        return NextResponse.json(
          { error: 'Formulário não encontrado ou inativo' },
          { status: 404 }
        )
      }

      const formData = body.data || {}
      const fields = form.fields as any[]

      // Map fields to task properties
      let title = ''
      let description = ''
      let priority = null
      let dueDate = null

      for (const field of fields) {
        const value = formData[field.id]
        if (!value && field.required) {
          return NextResponse.json(
            { error: `Campo obrigatório: ${field.label}` },
            { status: 400 }
          )
        }
        if (field.maps_to === 'title' && value) title = String(value)
        if (field.maps_to === 'description' && value) description = String(value)
        if (field.maps_to === 'priority' && value) priority = String(value)
        if (field.maps_to === 'due_date' && value) dueDate = String(value)
      }

      if (!title) title = `Lead via formulário: ${body.form_slug}`

      const { data: list } = await db
        .from('lists')
        .select('default_status_id')
        .eq('id', form.list_id)
        .single()

      const { data: task, error: taskErr } = await db
        .from('tasks')
        .insert({
          list_id: form.list_id,
          title,
          description: description || JSON.stringify(formData, null, 2),
          status_id: list?.default_status_id || null,
          priority,
          due_date: dueDate,
        })
        .select('id')
        .single()

      if (taskErr) {
        console.error('[API v1/forms] Erro:', taskErr)
        return NextResponse.json({ error: 'Erro ao criar tarefa' }, { status: 500 })
      }

      // Save submission
      await db.from('form_submissions').insert({
        form_id: form.id,
        task_id: task?.id,
        data: formData,
      })

      return NextResponse.json({ success: true, task_id: task?.id }, { status: 201 })
    }

    // Mode 2: Direct (list_id + title)
    if (body.list_id && body.title) {
      const { data: list } = await db
        .from('lists')
        .select('id, default_status_id')
        .eq('id', body.list_id)
        .single()

      if (!list) {
        return NextResponse.json({ error: 'Lista não encontrada' }, { status: 404 })
      }

      const { data: task, error: taskErr } = await db
        .from('tasks')
        .insert({
          list_id: list.id,
          title: body.title,
          description: body.description || null,
          status_id: list.default_status_id,
          priority: body.priority || null,
          due_date: body.due_date || null,
        })
        .select('id')
        .single()

      if (taskErr) {
        console.error('[API v1/forms] Erro:', taskErr)
        return NextResponse.json({ error: 'Erro ao criar tarefa' }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        task_id: task?.id,
        source: body.source || 'api',
      }, { status: 201 })
    }

    return NextResponse.json(
      { error: 'Envie form_slug + data OU list_id + title' },
      { status: 400 }
    )
  } catch (err: any) {
    console.error('[API v1/forms] Error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
