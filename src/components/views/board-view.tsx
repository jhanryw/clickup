"use client"

import { useState, useEffect, useRef } from 'react'
import { Badge } from "@/components/ui/badge"
import { Calendar as CalendarIcon, Plus, User } from 'lucide-react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { updateTaskStatus } from '@/app/actions/tasks'
import { CreateTaskDialog } from '@/components/dialogs/create-task-dialog'

interface BoardViewProps {
  tasks: any[]
  statuses: any[]
  listId?: string | null
  onTaskClick?: (task: any) => void
}

export function BoardView({ tasks: initialTasks, statuses, listId, onTaskClick }: BoardViewProps) {
  const [tasks, setTasks] = useState(initialTasks)
  const [isMounted, setIsMounted] = useState(false)
  const [addTaskToStatus, setAddTaskToStatus] = useState<string | null>(null)
  const isDraggingRef = useRef(false)

  useEffect(() => setIsMounted(true), [])
  useEffect(() => { setTasks(initialTasks) }, [initialTasks])

  const onDragStart = () => { isDraggingRef.current = true }

  const onDragEnd = async (result: DropResult) => {
    setTimeout(() => { isDraggingRef.current = false }, 100)

    const { destination, source, draggableId } = result
    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    const newStatusId = destination.droppableId

    setTasks((prev) =>
      prev.map((t) => t.id === draggableId ? { ...t, status_id: newStatusId } : t)
    )

    try {
      await updateTaskStatus(draggableId, newStatusId)
    } catch (error) {
      console.error('Failed to update task status', error)
      setTasks(initialTasks)
    }
  }

  function handleCardClick(task: any) {
    if (!isDraggingRef.current && onTaskClick) {
      onTaskClick(task)
    }
  }

  if (!isMounted) return null

  return (
    <>
      <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="flex h-full w-full gap-4 overflow-x-auto pb-4 items-start">
          {statuses.map((status) => {
            const columnTasks = tasks.filter((t) => t.status_id === status.id)

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
                    <span className="text-xs text-zinc-500 font-medium">{columnTasks.length}</span>
                  </div>
                  {listId && (
                    <button
                      onClick={() => setAddTaskToStatus(status.id)}
                      className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors"
                      title="Adicionar tarefa"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <Droppable droppableId={status.id}>
                  {(provided, snapshot) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className={`flex flex-col gap-2 overflow-y-auto max-h-[calc(100vh-16rem)] px-1 min-h-[100px] ${
                        snapshot.isDraggingOver ? 'bg-zinc-800/20 rounded-md' : ''
                      }`}
                    >
                      {columnTasks.map((task, index) => {
                        const assignees: any[] = task.task_assignees ?? []
                        return (
                          <Draggable key={task.id} draggableId={task.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                onClick={() => handleCardClick(task)}
                                className={`group relative flex flex-col gap-2 rounded-md border p-3 shadow-sm transition-colors cursor-pointer active:cursor-grabbing ${
                                  snapshot.isDragging
                                    ? 'border-indigo-500 bg-zinc-900 z-50 cursor-grabbing'
                                    : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700 hover:bg-zinc-900'
                                }`}
                              >
                                <p className="text-sm font-medium text-zinc-200 leading-snug break-words">
                                  {task.title}
                                </p>

                                <div className="flex items-center gap-2 pt-1 mt-auto flex-wrap">
                                  {assignees.length > 0 && (
                                    <div className="flex items-center -space-x-1 mr-auto">
                                      {assignees.slice(0, 3).map((a: any) => (
                                        <div
                                          key={a.user_id}
                                          className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-700 text-[9px] ring-1 ring-zinc-900"
                                        >
                                          <User className="h-3 w-3 text-zinc-400" />
                                        </div>
                                      ))}
                                      {assignees.length > 3 && (
                                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-700 text-[9px] text-zinc-400 ring-1 ring-zinc-900">
                                          +{assignees.length - 3}
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {task.due_date && (
                                    <div className="flex items-center gap-1 rounded bg-zinc-800/50 px-1.5 py-0.5 text-[10px] text-zinc-400">
                                      <CalendarIcon className="h-3 w-3" />
                                      {new Date(task.due_date).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' })}
                                    </div>
                                  )}

                                  {task.priority && (
                                    <div className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                                      task.priority === 'urgent' ? 'bg-red-500/10 text-red-400' :
                                      task.priority === 'high'   ? 'bg-orange-500/10 text-orange-400' :
                                      task.priority === 'normal' ? 'bg-blue-500/10 text-blue-400' :
                                      'bg-zinc-800 text-zinc-500'
                                    }`}>
                                      {task.priority}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </Draggable>
                        )
                      })}
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

      {/* Dialog controlado pelo + de cada coluna */}
      {listId && addTaskToStatus && (
        <CreateTaskDialog
          listId={listId}
          statuses={statuses}
          open={!!addTaskToStatus}
          onOpenChange={(v) => { if (!v) setAddTaskToStatus(null) }}
          initialStatusId={addTaskToStatus}
        />
      )}
    </>
  )
}
