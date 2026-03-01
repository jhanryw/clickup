import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServiceClient, withUserContext } from '@/lib/supabase/server'
import { TaskViews } from '@/components/views/task-views'
import { LayoutList, CheckCircle2, Clock, AlertTriangle } from 'lucide-react'

interface PageProps {
    params: { slug: string }
    searchParams: { listId?: string }
}

export default async function OrgPage({ params, searchParams }: PageProps) {
    const headersList = headers()
    const userId = headersList.get('x-user-id')
    const userEmail = headersList.get('x-user-email')

    if (!userId) redirect('/login')

    const db = createServiceClient()

    const { data: org } = await db
        .from('organizations')
        .select('id, name')
        .eq('slug', params.slug)
        .single()

    if (!org) redirect('/')

    let tasks: any[] = []
    let statuses: any[] = []
    let listName = ''

    if (searchParams.listId) {
        const listId = searchParams.listId

        const listData = await withUserContext(userId, async (ctxDb) => {
            const { data } = await ctxDb.from('lists').select('name').eq('id', listId).single()
            return data
        })

        if (listData) listName = listData.name

        const resTasks = await withUserContext(userId, async (ctxDb) => {
            const { data } = await ctxDb
                .from('tasks')
                .select(`*, custom_statuses ( id, name, color, is_closed, "order" )`)
                .eq('list_id', listId)
                .order('order', { ascending: true })
            return { data }
        })
        tasks = resTasks.data || []

        const resStatuses = await withUserContext(userId, async (ctxDb) => {
            const { data } = await ctxDb
                .from('list_statuses')
                .select(`custom_statuses (id, name, color, is_closed, "order")`)
                .eq('list_id', listId)
                .order('order', { ascending: true })

            if (data && data.length > 0) {
                return data.map(r => r.custom_statuses).sort((a: any, b: any) => a.order - b.order)
            } else {
                const { data: defs } = await ctxDb.from('custom_statuses').select('*').order('order')
                return defs || []
            }
        })
        statuses = resStatuses || []

    } else {
        // Dashboard overview — fetch recent tasks + stats
        const resTasks = await withUserContext(userId, async (ctxDb) => {
            const { data } = await ctxDb
                .from('tasks')
                .select(`*, custom_statuses ( id, name, color, is_closed, "order" )`)
                .order('created_at', { ascending: false })
                .limit(50)
            return { data }
        })
        tasks = resTasks.data || []

        const { data: defs } = await db.from('custom_statuses').select('*').order('order')
        statuses = defs || []
    }

    // Se nenhuma lista selecionada, mostrar dashboard overview
    if (!searchParams.listId) {
        const displayName = userEmail?.split('@')[0] || 'User'
        const totalTasks = tasks.length
        const doneTasks = tasks.filter(t => t.custom_statuses?.is_closed).length
        const urgentTasks = tasks.filter(t => t.priority === 'urgent' || t.priority === 'high').length
        const overdueTasks = tasks.filter(t => {
            if (!t.due_date || t.custom_statuses?.is_closed) return false
            return new Date(t.due_date) < new Date()
        }).length

        return (
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-5xl mx-auto px-8 py-8">
                    {/* Greeting */}
                    <div className="mb-8">
                        <h1 className="text-2xl font-bold text-zinc-100">
                            Olá, {displayName} 👋
                        </h1>
                        <p className="text-sm text-zinc-500 mt-1">
                            Aqui está o resumo do seu workspace.
                        </p>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-4 gap-4 mb-8">
                        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 hover:border-zinc-700 transition-colors">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10">
                                    <LayoutList className="h-4.5 w-4.5 text-indigo-400" />
                                </div>
                            </div>
                            <p className="text-2xl font-bold text-zinc-100">{totalTasks}</p>
                            <p className="text-xs text-zinc-500 mt-0.5">Tarefas totais</p>
                        </div>

                        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 hover:border-zinc-700 transition-colors">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
                                    <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400" />
                                </div>
                            </div>
                            <p className="text-2xl font-bold text-zinc-100">{doneTasks}</p>
                            <p className="text-xs text-zinc-500 mt-0.5">Concluídas</p>
                        </div>

                        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 hover:border-zinc-700 transition-colors">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500/10">
                                    <AlertTriangle className="h-4.5 w-4.5 text-orange-400" />
                                </div>
                            </div>
                            <p className="text-2xl font-bold text-zinc-100">{urgentTasks}</p>
                            <p className="text-xs text-zinc-500 mt-0.5">Urgentes / Altas</p>
                        </div>

                        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 hover:border-zinc-700 transition-colors">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/10">
                                    <Clock className="h-4.5 w-4.5 text-red-400" />
                                </div>
                            </div>
                            <p className="text-2xl font-bold text-zinc-100">{overdueTasks}</p>
                            <p className="text-xs text-zinc-500 mt-0.5">Atrasadas</p>
                        </div>
                    </div>

                    {/* Recent Tasks */}
                    {tasks.length > 0 && (
                        <div>
                            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">
                                Tarefas Recentes
                            </h2>
                            <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
                                {tasks.slice(0, 15).map((task, i) => {
                                    const status = task.custom_statuses
                                    return (
                                        <div
                                            key={task.id}
                                            className={`flex items-center gap-4 px-5 py-3 hover:bg-zinc-800/40 transition-colors ${i < Math.min(tasks.length, 15) - 1 ? 'border-b border-zinc-800/50' : ''}`}
                                        >
                                            <div
                                                className="h-2 w-2 rounded-full shrink-0"
                                                style={{ backgroundColor: status?.color || '#6b7280' }}
                                            />
                                            <span className="text-sm text-zinc-200 flex-1 truncate font-medium">{task.title}</span>
                                            {status && (
                                                <span className="text-[10px] font-medium text-zinc-500 uppercase">{status.name}</span>
                                            )}
                                            {task.priority && (
                                                <span className={`text-[10px] font-bold uppercase ${
                                                    task.priority === 'urgent' ? 'text-red-400' :
                                                    task.priority === 'high' ? 'text-orange-400' :
                                                    'text-zinc-600'
                                                }`}>
                                                    {task.priority}
                                                </span>
                                            )}
                                            {task.due_date && (
                                                <span className="text-[11px] text-zinc-600">
                                                    {new Date(task.due_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                                                </span>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {tasks.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
                            <LayoutList className="h-12 w-12 mb-4 opacity-30" />
                            <p className="text-sm">Selecione uma lista na sidebar para começar</p>
                        </div>
                    )}
                </div>
            </div>
        )
    }

    // List view with tasks
    return (
        <div className="flex-1 overflow-hidden flex flex-col pt-6 px-8">
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-500/10">
                        <LayoutList className="h-4 w-4 text-indigo-400" />
                    </div>
                    <h1 className="text-xl font-bold text-zinc-100">{listName}</h1>
                    <span className="text-xs text-zinc-600 bg-zinc-800/50 px-2 py-0.5 rounded-full">
                        {tasks.length} tarefa{tasks.length !== 1 ? 's' : ''}
                    </span>
                </div>
            </div>

            <TaskViews tasks={tasks} statuses={statuses} listId={searchParams.listId || null} />
        </div>
    )
}
