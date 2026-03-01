"use client"

import { ReactNode, useState, useEffect } from 'react'
import { Badge } from "@/components/ui/badge"
import { Calendar as CalendarIcon, MoreHorizontal, Plus } from 'lucide-react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { updateTaskStatus } from '@/app/actions/tasks'

interface BoardViewProps {
    tasks: any[]
    statuses: any[]
}

export function BoardView({ tasks: initialTasks, statuses }: BoardViewProps) {
    const [tasks, setTasks] = useState(initialTasks)

    // Fix hydration issues with dnd
    const [isMounted, setIsMounted] = useState(false)
    useEffect(() => setIsMounted(true), [])

    // Update internal state if props change
    useEffect(() => {
        setTasks(initialTasks)
    }, [initialTasks])

    const onDragEnd = async (result: DropResult) => {
        const { destination, source, draggableId } = result

        if (!destination) return
        if (destination.droppableId === source.droppableId && destination.index === source.index) return

        const newStatusId = destination.droppableId

        // Optimistic update
        setTasks(prev => prev.map(t =>
            t.id === draggableId ? { ...t, status_id: newStatusId } : t
        ))

        try {
            await updateTaskStatus(draggableId, newStatusId)
        } catch (error) {
            console.error('Failed to update task status', error)
            // Revert on failure
            setTasks(initialTasks)
        }
    }

    if (!isMounted) return null

    return (
        <DragDropContext onDragEnd={onDragEnd}>
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

                            <Droppable droppableId={status.id}>
                                {(provided, snapshot) => (
                                    <div
                                        {...provided.droppableProps}
                                        ref={provided.innerRef}
                                        className={`flex flex-col gap-2 overflow-y-auto max-h-[calc(100vh-16rem)] px-1 min-h-[100px] ${snapshot.isDraggingOver ? 'bg-zinc-800/20 rounded-md' : ''}`}
                                    >
                                        {columnTasks.map((task, index) => (
                                            <Draggable key={task.id} draggableId={task.id} index={index}>
                                                {(provided, snapshot) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        {...provided.dragHandleProps}
                                                        className={`group relative flex flex-col gap-2 rounded-md border p-3 shadow-sm transition-colors cursor-grab active:cursor-grabbing ${snapshot.isDragging
                                                                ? 'border-indigo-500 bg-zinc-900 z-50'
                                                                : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700 hover:bg-zinc-900'
                                                            }`}
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
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                        {columnTasks.length === 0 && !snapshot.isDraggingOver && (
                                            <div className="flex items-center justify-center p-4 border border-dashed border-zinc-800 rounded-md pointer-events-none">
                                                <p className="text-xs text-zinc-600">Arraste tarefas aqui</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </Droppable>
                        </div>
                    )
                })}
            </div>
        </DragDropContext>
    )
}
