import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * GET /api/forms/[slug] - Retorna os dados públicos de um formulário
 * POST /api/forms/[slug] - Recebe submissão do formulário e cria tarefa
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

    // Mapear campos para task fields
    const fields = form.fields as any[]
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

    if (!title) {
      title = `Submissão via formulário: ${params.slug}`
    }

    // Buscar default status para a lista
    const { data: list } = await db
      .from('lists')
      .select('default_status_id')
      .eq('id', form.list_id)
      .single()

    // Criar task
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
      console.error('[Forms API] Erro ao criar task:', taskErr)
      return NextResponse.json(
        { error: 'Erro ao criar tarefa' },
        { status: 500 }
      )
    }

    // Salvar submissão
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
