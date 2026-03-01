import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServiceClient, withUserContext } from '@/lib/supabase/server'
import { TaskViews } from '@/components/views/task-views'

interface PageProps {
    params: { slug: string }
    searchParams: { listId?: string }
}

export default async function OrgPage({ params, searchParams }: PageProps) {
    const headersList = headers()
    const userId = headersList.get('x-user-id')

    if (!userId) redirect('/login')

    const db = createServiceClient()

    // Buscar org pelo slug
    const { data: org } = await db
        .from('organizations')
        .select('id, name')
        .eq('slug', params.slug)
        .single()

    if (!org) redirect('/')

    // Fetch das tasks:
    // Se houver listId, busca as tasks dessa lista
    // Se não houver, ou busca todas as tasks da org ou pede para selecionar uma lista.
    // Vamos buscar tasks usando withUserContext para testar o RLS natural caso houvesse
    let tasks = []
    let statuses = []
    let listName = 'Todas as Tarefas'

    if (searchParams.listId) {
        const listId = searchParams.listId

        const listData = await withUserContext(userId, async (ctxDb) => {
            const { data } = await ctxDb.from('lists').select('name').eq('id', listId).single()
            return data
        })

        if (listData) {
            listName = listData.name
        }

        const resTasks = await withUserContext(userId, async (ctxDb) => {
            const { data, error } = await ctxDb
                .from('tasks')
                .select(`
          *,
          custom_statuses ( id, name, color, is_closed, "order" )
        `)
                .eq('list_id', listId)
                .order('order', { ascending: true })

            return { data, error }
        })
        tasks = resTasks.data || []

        const resStatuses = await withUserContext(userId, async (ctxDb) => {
            // Buscar status customizados disponiveis pra essa lista na M2M
            // Como não tem tabela M2M com join fácil sem inner join literal, vou buscar todos globais
            // e os que a lista mapeia, mas no nosso banco M2M é list_statuses
            const { data, error } = await ctxDb
                .from('list_statuses')
                .select(`
           custom_statuses (id, name, color, is_closed, "order")
        `)
                .eq('list_id', listId)
                .order('order', { ascending: true })

            if (data && data.length > 0) {
                return data.map(r => r.custom_statuses).sort((a: any, b: any) => a.order - b.order)
            } else {
                // Fallback: Busca os defaults
                const { data: defs } = await ctxDb.from('custom_statuses').select('*').order('order')
                return defs || []
            }
        })
        statuses = resStatuses || []

    } else {
        // Busca algumas tasks recentes do org para o painel principal
        const resTasks = await withUserContext(userId, async (ctxDb) => {
            const { data } = await ctxDb
                .from('tasks')
                .select(`
          *,
          custom_statuses ( id, name, color, is_closed, "order" )
        `)
                .order('created_at', { ascending: false })
                .limit(50)
            return { data }
        })
        tasks = resTasks.data || []

        // Statuses fallback
        const { data: defs } = await db.from('custom_statuses').select('*').order('order')
        statuses = defs || []
    }

    return (
        <div className="flex-1 overflow-hidden flex flex-col pt-6 px-8">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-zinc-100">{listName}</h1>
            </div>

            {/* Task Views Component */}
            <TaskViews tasks={tasks} statuses={statuses} listId={searchParams.listId || null} />
        </div>
    )
}
