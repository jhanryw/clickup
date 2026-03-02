"use client"

import { CheckCircle2, ChevronRight, GripVertical, Calendar as CalendarIcon, User } from 'lucide-react'
import { Badge } from "@/components/ui/badge"

interface ListViewProps {
  tasks: any[]
  statuses: any[]
  onTaskClick?: (task: any) => void
}

const PRIORITY_COLOR: Record<string, string> = {
  urgent: 'text-red-400',
  high:   'text-orange-400',
  normal: 'text-blue-400',
  low:    'text-emerald-400',
}

export function ListView({ tasks, statuses, onTaskClick }: ListViewProps) {
  return (
    <div className="space-y-6">
      {statuses.map((status) => {
        const statusTasks = tasks.filter((t) => t.status_id === status.id)
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
              {statusTasks.map((task, index) => {
                const assignees: any[] = task.task_assignees ?? []
                return (
                  <div
                    key={task.id}
                    onClick={() => onTaskClick?.(task)}
                    className={`group flex items-center gap-4 p-3 hover:bg-zinc-800/80 transition-colors ${
                      onTaskClick ? 'cursor-pointer' : ''
                    } ${index < statusTasks.length - 1 ? 'border-b border-zinc-800' : ''}`}
                  >
                    <GripVertical className="h-4 w-4 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />

                    <div
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-zinc-700 hover:border-indigo-500 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <CheckCircle2 className="h-full w-full text-transparent hover:text-indigo-400 p-0.5" />
                    </div>

                    <span className="flex-1 text-sm text-zinc-200 font-medium truncate">
                      {task.title}
                    </span>

                    {/* Assignee avatars */}
                    {assignees.length > 0 && (
                      <div className="flex items-center -space-x-1">
                        {assignees.slice(0, 3).map((a: any) => (
                          <div
                            key={a.user_id}
                            className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-700 text-[9px] font-bold text-zinc-300 ring-1 ring-zinc-900"
                          >
                            <User className="h-3 w-3" />
                          </div>
                        ))}
                        {assignees.length > 3 && (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-700 text-[9px] font-bold text-zinc-400 ring-1 ring-zinc-900">
                            +{assignees.length - 3}
                          </div>
                        )}
                      </div>
                    )}

                    {task.due_date && (
                      <div className="flex items-center gap-1.5 text-xs text-zinc-500 bg-zinc-800/50 px-2 py-1 rounded shrink-0">
                        <CalendarIcon className="h-3 w-3" />
                        {new Date(task.due_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                      </div>
                    )}

                    {task.priority && (
                      <Badge
                        variant="outline"
                        className={`text-[10px] uppercase border-zinc-700 bg-zinc-800 px-1 py-0 h-5 shrink-0 ${PRIORITY_COLOR[task.priority] ?? ''}`}
                      >
                        {task.priority}
                      </Badge>
                    )}
                  </div>
                )
              })}
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
