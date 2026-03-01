"use client"

import { useState, useMemo } from 'react'
import { DayPicker } from 'react-day-picker'
import { ptBR } from 'date-fns/locale'
import { format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns'
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Calendar as CalendarIcon, Clock } from 'lucide-react'

interface CalendarViewProps {
    tasks: any[]
    statuses: any[]
}

export function CalendarView({ tasks, statuses }: CalendarViewProps) {
    const [selectedMonth, setSelectedMonth] = useState(new Date())
    const [selectedDay, setSelectedDay] = useState<Date | undefined>(undefined)

    // Map tasks by date
    const tasksByDate = useMemo(() => {
        const map = new Map<string, any[]>()
        tasks.forEach(t => {
            if (!t.due_date) return
            const key = format(new Date(t.due_date), 'yyyy-MM-dd')
            if (!map.has(key)) map.set(key, [])
            map.get(key)!.push(t)
        })
        return map
    }, [tasks])

    // Days that have tasks (for dot indicators)
    const daysWithTasks = useMemo(() => {
        return Array.from(tasksByDate.keys()).map(d => new Date(d))
    }, [tasksByDate])

    // Tasks for selected day
    const selectedDayTasks = useMemo(() => {
        if (!selectedDay) return []
        const key = format(selectedDay, 'yyyy-MM-dd')
        return tasksByDate.get(key) || []
    }, [selectedDay, tasksByDate])

    return (
        <div className="flex h-full gap-6">
            {/* Calendar */}
            <div className="flex flex-col rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 shrink-0">
                <DayPicker
                    mode="single"
                    selected={selectedDay}
                    onSelect={setSelectedDay}
                    month={selectedMonth}
                    onMonthChange={setSelectedMonth}
                    locale={ptBR}
                    showOutsideDays
                    modifiers={{
                        hasTasks: daysWithTasks,
                    }}
                    modifiersClassNames={{
                        hasTasks: 'has-tasks-dot',
                    }}
                    classNames={{
                        months: 'flex flex-col',
                        month: 'space-y-3',
                        month_caption: 'flex justify-center pt-1 relative items-center mb-2',
                        caption_label: 'text-sm font-semibold text-zinc-200 capitalize',
                        nav: 'flex items-center gap-1',
                        button_previous: 'h-7 w-7 bg-transparent p-0 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-md inline-flex items-center justify-center absolute left-1',
                        button_next: 'h-7 w-7 bg-transparent p-0 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-md inline-flex items-center justify-center absolute right-1',
                        month_grid: 'w-full border-collapse',
                        weekdays: 'flex',
                        weekday: 'text-zinc-500 rounded-md w-9 font-medium text-[11px] uppercase',
                        week: 'flex w-full mt-1',
                        day: 'h-9 w-9 text-center text-[13px] p-0 relative rounded-md transition-colors',
                        day_button: 'h-9 w-9 p-0 font-normal rounded-md hover:bg-zinc-800 text-zinc-300 inline-flex items-center justify-center cursor-pointer',
                        selected: '!bg-indigo-600 !text-white hover:!bg-indigo-600 rounded-md',
                        today: 'bg-zinc-800 text-white font-bold',
                        outside: 'text-zinc-700 opacity-50',
                        disabled: 'text-zinc-700',
                    }}
                />

                {/* Legend */}
                <div className="mt-4 pt-3 border-t border-zinc-800 space-y-1.5">
                    <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Legenda</p>
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                        Dia com tarefas
                    </div>
                </div>
            </div>

            {/* Day Detail Panel */}
            <div className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900/30 overflow-hidden flex flex-col">
                <div className="px-5 py-4 border-b border-zinc-800 bg-zinc-900/50">
                    <h3 className="text-base font-semibold text-zinc-200">
                        {selectedDay
                            ? format(selectedDay, "d 'de' MMMM, yyyy", { locale: ptBR })
                            : 'Selecione um dia'
                        }
                    </h3>
                    {selectedDay && (
                        <p className="text-xs text-zinc-500 mt-0.5">
                            {selectedDayTasks.length} tarefa{selectedDayTasks.length !== 1 ? 's' : ''}
                        </p>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    {!selectedDay ? (
                        <div className="flex flex-col items-center justify-center h-full text-zinc-600">
                            <CalendarIcon className="h-10 w-10 mb-3 opacity-40" />
                            <p className="text-sm">Clique em um dia para ver as tarefas</p>
                        </div>
                    ) : selectedDayTasks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-zinc-600">
                            <p className="text-sm">Nenhuma tarefa neste dia</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {selectedDayTasks.map(task => {
                                const status = statuses.find((s: any) => s.id === task.status_id)
                                return (
                                    <div
                                        key={task.id}
                                        className="flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-950 p-3 hover:border-zinc-700 transition-colors"
                                    >
                                        <div
                                            className="mt-1 h-2.5 w-2.5 rounded-full shrink-0"
                                            style={{ backgroundColor: status?.color || '#6b7280' }}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-zinc-200 truncate">
                                                {task.title}
                                            </p>
                                            <div className="flex items-center gap-3 mt-1.5">
                                                {status && (
                                                    <Badge
                                                        variant="outline"
                                                        className="text-[10px] border-zinc-700 py-0 h-5"
                                                        style={{ color: status.color }}
                                                    >
                                                        {status.name}
                                                    </Badge>
                                                )}
                                                {task.priority && (
                                                    <span className={`text-[10px] font-semibold uppercase ${
                                                        task.priority === 'urgent' ? 'text-red-400' :
                                                        task.priority === 'high' ? 'text-orange-400' :
                                                        'text-zinc-500'
                                                    }`}>
                                                        {task.priority}
                                                    </span>
                                                )}
                                            </div>
                                            {task.description && (
                                                <p className="text-xs text-zinc-500 mt-2 line-clamp-2">
                                                    {task.description}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
