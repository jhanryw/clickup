import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * Route Pública: Recebe Webhooks externos e cria Tarefas automaticamente.
 * É necessário enviar um token no Authorization Bearer com a "secret key" definida para o ambiente
 * OU associado à lista (podemos usar uma ENV global para simplificar no admin).
 */
export async function POST(req: Request) {
    try {
        const authHeader = req.headers.get('Authorization')
        const secret = process.env.INCOMING_WEBHOOK_SECRET

        // Valida autenticação (bearer token)
        if (!secret || authHeader !== `Bearer ${secret}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { list_id, title, description, priority, due_date } = body

        if (!list_id || !title) {
            return NextResponse.json({ error: 'list_id and title are required' }, { status: 400 })
        }

        const db = createServiceClient()

        // Como é uma rota public/system, não temos user em contexto direto
        // A service_role insere ignorando RLS porque é operada pelo servidor (bypassa policy member)
        const { data: list, error: listErr } = await db
            .from('lists')
            .select('id, default_status_id')
            .eq('id', list_id)
            .single()

        if (listErr || !list) {
            return NextResponse.json({ error: 'List not found' }, { status: 404 })
        }

        // Cria a Task
        const { data: task, error: taskErr } = await db
            .from('tasks')
            .insert({
                list_id: list.id,
                title,
                description: description || null,
                status_id: list.default_status_id,
                priority: priority || null,
                due_date: due_date || null
            })
            .select('id')
            .single()

        if (taskErr) {
            throw taskErr
        }

        return NextResponse.json({ success: true, task_id: task?.id }, { status: 201 })
    } catch (err: any) {
        console.error('[Incoming Webhook] Erro ao criar task', err)
        return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 })
    }
}

// Lidar com o OPTIONS preflight que o Next.js mapeou no next.config.js
export async function OPTIONS(_req: Request) {
    return new NextResponse(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
    })
}
