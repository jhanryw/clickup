"use client"

import { CheckCircle2, ChevronRight, GripVertical, Calendar as CalendarIcon } from 'lucide-react'
import { Badge } from "@/components/ui/badge"

interface ListViewProps {
    tasks: any[]
    statuses: any[]
}

export function ListView({ tasks, statuses }: ListViewProps) {
    return (
        <div className="space-y-6">
            {statuses.map(status => {
                const statusTasks = tasks.filter(t => t.status_id === status.id)

                if (statusTasks.length === 0) return null

                return (
                    <div key={status.id} className="space-y-1">
                        <div className="flex items-center gap-2 py-2">
                            <ChevronRight className="h-4 w-4 text-zinc-500" />
                            <Badge
                                variant="outline"
                                className="rounded-sm font-semibold uppercase tracking-widest text-[10px] bg-zinc-900 border-zinc-800"
                                style={{ color: status.color || '#9ca3af' }}
                            >
                                {status.name} ({statusTasks.length})
                            </Badge>
                        </div>

                        <div className="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-900/50">
                            {statusTasks.map((task, index) => (
                                <div
                                    key={task.id}
                                    className={`group flex items-center gap-4 p-3 hover:bg-zinc-800/80 transition-colors cursor-pointer ${index < statusTasks.length - 1 ? 'border-b border-zinc-800' : ''
                                        }`}
                                >
                                    <GripVertical className="h-4 w-4 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />

                                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-zinc-700 hover:border-indigo-500 transition-colors">
                                        <CheckCircle2 className="h-full w-full text-transparent hover:text-indigo-400 p-0.5" />
                                    </div>

                                    <span className="flex-1 text-sm text-zinc-200 font-medium">
                                        {task.title}
                                    </span>

                                    {task.due_date && (
                                        <div className="flex items-center gap-1.5 text-xs text-zinc-500 bg-zinc-800/50 px-2 py-1 rounded">
                                            <CalendarIcon className="h-3 w-3" />
                                            {new Date(task.due_date).toLocaleDateString()}
                                        </div>
                                    )}

                                    {task.priority && (
                                        <Badge variant="outline" className="text-[10px] uppercase border-zinc-700 bg-zinc-800 px-1 py-0 h-5">
                                            {task.priority}
                                        </Badge>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )
            })}
            {tasks.length === 0 && (
                <div className="flex flex-col items-center justify-center h-64 border border-dashed border-zinc-800 rounded-xl">
                    <p className="text-zinc-500 text-sm">Sem tarefas nesta lista.</p>
                </div>
            )}
        </div>
    )
}
