"use client"

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock } from 'lucide-react'
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

interface CalendarViewProps {
    tasks: any[]
    statuses: any[]
}

const DAYS_OF_WEEK = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export function CalendarView({ tasks, statuses }: CalendarViewProps) {
    const [currentDate, setCurrentDate] = useState(new Date())

    // Handlers para o calendário
    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
    const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
    const today = () => setCurrentDate(new Date())

    // Configuração da grade
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    const firstDayOfMonth = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const daysInPrevMonth = new Date(year, month, 0).getDate()

    const daysGrid = []

    // Preencher dias do mes anterior
    for (let i = 0; i < firstDayOfMonth; i++) {
        daysGrid.push({
            day: daysInPrevMonth - firstDayOfMonth + i + 1,
            isCurrentMonth: false,
            date: new Date(year, month - 1, daysInPrevMonth - firstDayOfMonth + i + 1)
        })
    }

    // Preencher dias do mes atual
    for (let i = 1; i <= daysInMonth; i++) {
        daysGrid.push({
            day: i,
            isCurrentMonth: true,
            date: new Date(year, month, i)
        })
    }

    // Preencher fim do calendário (Total 42 celulas: 6 semanas)
    const remainingDays = 42 - daysGrid.length
    for (let i = 1; i <= remainingDays; i++) {
        daysGrid.push({
            day: i,
            isCurrentMonth: false,
            date: new Date(year, month + 1, i)
        })
    }

    return (
        <div className="flex flex-col h-full rounded-xl border border-zinc-800 bg-zinc-950">

            {/* Header do Calendario */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/50">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold text-zinc-100 capitalize">
                        {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                    </h2>
                    <div className="flex items-center rounded-md border border-zinc-700 bg-zinc-900 bg-opacity-70 text-zinc-300">
                        <button onClick={prevMonth} className="px-2 py-1 hover:bg-zinc-800 border-r border-zinc-700">
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button onClick={today} className="px-3 py-1 text-sm font-medium hover:bg-zinc-800 border-r border-zinc-700">
                            Hoje
                        </button>
                        <button onClick={nextMonth} className="px-2 py-1 hover:bg-zinc-800">
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-7 border-b border-zinc-800 bg-zinc-900">
                {DAYS_OF_WEEK.map(day => (
                    <div key={day} className="py-2 text-center text-xs font-semibold text-zinc-500 uppercase tracking-widest border-r border-zinc-800 last:border-0">
                        {day}
                    </div>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-7 grid-rows-6 h-full min-h-[600px] bg-zinc-950">
                    {daysGrid.map((cell, index) => {
                        // Filtrar tarefas cujo due_date coincide com este dia
                        const cellTasks = tasks.filter(t => {
                            if (!t.due_date) return false
                            const taskDate = new Date(t.due_date)
                            return taskDate.getFullYear() === cell.date.getFullYear() &&
                                taskDate.getMonth() === cell.date.getMonth() &&
                                taskDate.getDate() === cell.date.getDate()
                        })

                        const isToday = new Date().toDateString() === cell.date.toDateString()

                        return (
                            <div
                                key={index}
                                className={`
                     relative border-r border-b border-zinc-800 p-1 flex flex-col gap-1
                     ${cell.isCurrentMonth ? 'bg-zinc-950' : 'bg-zinc-900/40 text-zinc-600'}
                     hover:bg-zinc-900/80 transition-colors
                   `}
                            >
                                <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ml-1 mt-1
                     ${isToday ? 'bg-indigo-600 text-white shadow shadow-indigo-500/50' : cell.isCurrentMonth ? 'text-zinc-300' : 'text-zinc-600'}
                   `}>
                                    {cell.day}
                                </span>

                                <div className="flex-1 flex flex-col gap-1 overflow-y-auto pt-1 no-scrollbar">
                                    {cellTasks.map(task => {
                                        const statusObj = statuses.find(s => s.id === task.status_id) || { color: '#9ca3af' }

                                        return (
                                            <Dialog key={task.id}>
                                                <DialogTrigger asChild>
                                                    <div
                                                        className="truncate rounded px-1.5 py-0.5 text-xs text-white shadow-sm cursor-pointer hover:opacity-80 transition-opacity bg-zinc-800 border-l-2"
                                                        style={{ borderLeftColor: statusObj.color }}
                                                    >
                                                        {task.title}
                                                    </div>
                                                </DialogTrigger>
                                                <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                                                    <DialogHeader>
                                                        <DialogTitle className="text-xl mb-4">{task.title}</DialogTitle>
                                                    </DialogHeader>
                                                    <div className="space-y-4">
                                                        <div className="flex items-center gap-4 text-sm">
                                                            <div className="flex items-center gap-2 text-zinc-400">
                                                                <CalendarIcon className="h-4 w-4" /> Vencimento
                                                            </div>
                                                            <Badge variant="outline" className="border-zinc-700 bg-zinc-800">
                                                                {new Date(task.due_date).toLocaleDateString('pt-BR')}
                                                            </Badge>
                                                        </div>
                                                        <div className="flex flex-col gap-2 text-sm mt-4">
                                                            <span className="text-zinc-400 font-medium pb-2 border-b border-zinc-800">Descrição</span>
                                                            <p className="text-zinc-300 whitespace-pre-wrap">
                                                                {task.description || 'Nenhuma descrição adicionada.'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </DialogContent>
                                            </Dialog>
                                        )
                                    })}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
