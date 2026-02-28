"use client"

import { ReactNode } from 'react'
import { Badge } from "@/components/ui/badge"
import { Calendar as CalendarIcon, MoreHorizontal, Plus } from 'lucide-react'

interface BoardViewProps {
    tasks: any[]
    statuses: any[]
}

export function BoardView({ tasks, statuses }: BoardViewProps) {
    return (
        <div className="flex h-full w-full gap-4 overflow-x-auto pb-4 items-start">
            {statuses.map(status => {
                const columnTasks = tasks.filter(t => t.status_id === status.id)

                return (
                    <div
                        key={status.id}
                        className="flex w-72 shrink-0 flex-col gap-3 rounded-lg bg-zinc-900 border border-zinc-800 p-2"
                    >
                        <div className="flex items-center justify-between px-1 shrink-0">
                            <div className="flex items-center gap-2">
                                <Badge
                                    className="text-[10px] uppercase font-bold px-1.5 rounded-sm"
                                    style={{ backgroundColor: status.color || '#4b5563', color: '#fff' }}
                                >
                                    {status.name}
                                </Badge>
                                <span className="text-xs text-zinc-500 font-medium">
                                    {columnTasks.length}
                                </span>
                            </div>

                            <div className="flex items-center gap-1">
                                <button className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300">
                                    <Plus className="h-4 w-4" />
                                </button>
                                <button className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300">
                                    <MoreHorizontal className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        {/* Task Cards Container */}
                        <div className="flex flex-col gap-2 overflow-y-auto max-h-[calc(100vh-16rem)] px-1">
                            {columnTasks.map(task => (
                                <div
                                    key={task.id}
                                    className="group relative flex flex-col gap-2 rounded-md border border-zinc-800 bg-zinc-950 p-3 shadow-sm hover:border-zinc-700 hover:bg-zinc-900 transition-colors cursor-pointer"
                                >
                                    <p className="text-sm font-medium text-zinc-200 leading-snug break-words">
                                        {task.title}
                                    </p>

                                    <div className="flex items-center gap-2 pt-2 mt-auto">
                                        {task.due_date && (
                                            <div className="flex items-center gap-1 rounded bg-zinc-800/50 px-1.5 py-0.5 text-[10px] text-zinc-400">
                                                <CalendarIcon className="h-3 w-3" />
                                                {new Date(task.due_date).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' })}
                                            </div>
                                        )}

                                        {task.priority && (
                                            <div className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${task.priority === 'urgent' ? 'bg-red-500/10 text-red-400' :
                                                    task.priority === 'high' ? 'bg-orange-500/10 text-orange-400' :
                                                        'bg-zinc-800 text-zinc-400'
                                                }`}>
                                                {task.priority}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {columnTasks.length === 0 && (
                                <div className="flex items-center justify-center p-4 border border-dashed border-zinc-800 rounded-md">
                                    <p className="text-xs text-zinc-600">Arraste tarefas aqui</p>
                                </div>
                            )}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
