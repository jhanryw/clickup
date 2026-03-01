import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'

const CreateFormSchema = z.object({
    list_id: z.string().uuid(),
    title: z.string().min(1),
    description: z.string().optional(),
    email: z.string().email(),
})

export async function POST(req: Request) {
    try {
        const json = await req.json()
        const data = CreateFormSchema.parse(json)

        const db = createServiceClient()

        // Resgata o status default da lista
        const { data: list, error: listError } = await db
            .from('lists')
            .select('default_status_id')
            .eq('id', data.list_id)
            .single()

        if (listError || !list) {
            return NextResponse.json({ error: 'Lista inválida ou não encontrada' }, { status: 400 })
        }

        // Calcula nova ordem
        const { data: maxOrder } = await db
            .from('tasks')
            .select('order')
            .eq('list_id', data.list_id)
            .order('order', { ascending: false })
            .limit(1)
            .single()

        const newOrder = (maxOrder?.order || 0) + 1

        // Cria a tarefa usando a formatação com o email
        const { error: insertError } = await db.from('tasks').insert({
            list_id: data.list_id,
            title: data.title,
            description: `[Email do solicitante: ${data.email}]\n\n` + (data.description || ''),
            status_id: list.default_status_id,
            order: newOrder,
            priority: 'normal'
        })

        if (insertError) {
            console.error('[Forms Submit Error]', insertError)
            return NextResponse.json({ error: 'Erro ao criar solicitação internamente' }, { status: 500 })
        }

        return NextResponse.json({ success: true })

    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Campos inválidos' }, { status: 400 })
        }
        return NextResponse.json({ error: 'Erro de processamento' }, { status: 500 })
    }
}
