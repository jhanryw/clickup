import { createServiceClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { PublicTaskForm } from './form'

interface PageProps {
    params: {
        listId: string
    }
}

export default async function PublicFormPage({ params }: PageProps) {
    const listId = params.listId

    // Validate valid list
    const db = createServiceClient()
    const { data: list, error } = await db
        .from('lists')
        .select('name, description, default_status_id')
        .eq('id', listId)
        .single()

    if (error || !list) {
        return notFound()
    }

    return (
        <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 text-zinc-100">
            <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-xl">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                        Nova Solicitação
                    </h1>
                    <p className="text-zinc-400 mt-2 text-sm">
                        Criando uma nova tarefa na lista <span className="font-medium text-zinc-300">"{list.name}"</span>
                    </p>
                </div>

                <PublicTaskForm listId={listId} />
            </div>
        </div>
    )
}
