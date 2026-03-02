"use client"

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ListView } from "./list-view"
import { BoardView } from "./board-view"
import { CalendarView } from "./calendar-view"
import { CreateTaskDialog } from "@/components/dialogs/create-task-dialog"
import { TaskDetailDialog } from "@/components/dialogs/task-detail-dialog"
import { ListStatusDialog } from "@/components/dialogs/list-status-dialog"
import { LayoutList, KanbanSquare, CalendarDays, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Member {
  userId: string
  displayName: string
  email: string
}

interface TaskViewsProps {
  tasks: any[]
  statuses: any[]
  listId?: string | null
  members?: Member[]
}

export function TaskViews({ tasks, statuses, listId, members = [] }: TaskViewsProps) {
  const [activeTab, setActiveTab] = useState('list')
  const [selectedTask, setSelectedTask] = useState<any | null>(null)
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <TabsList className="bg-zinc-900 border border-zinc-800">
            <TabsTrigger value="list" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white">
              <LayoutList className="h-4 w-4 mr-2" />
              Lista
            </TabsTrigger>
            <TabsTrigger value="board" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white">
              <KanbanSquare className="h-4 w-4 mr-2" />
              Quadro
            </TabsTrigger>
            <TabsTrigger value="calendar" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white">
              <CalendarDays className="h-4 w-4 mr-2" />
              Calendário
            </TabsTrigger>
          </TabsList>

          <div className="flex gap-2">
            {listId && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStatusDialogOpen(true)}
                  className="border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 gap-1.5"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  Status
                </Button>
                <CreateTaskDialog listId={listId} statuses={statuses} />
              </>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pt-4 pb-12">
          <TabsContent value="list" className="h-full m-0">
            <ListView tasks={tasks} statuses={statuses} onTaskClick={setSelectedTask} />
          </TabsContent>

          <TabsContent value="board" className="h-full m-0">
            <BoardView tasks={tasks} statuses={statuses} listId={listId} onTaskClick={setSelectedTask} />
          </TabsContent>

          <TabsContent value="calendar" className="h-full m-0">
            <CalendarView tasks={tasks} statuses={statuses} />
          </TabsContent>
        </div>
      </Tabs>

      {/* Task Detail Dialog */}
      {selectedTask && (
        <TaskDetailDialog
          task={selectedTask}
          statuses={statuses}
          members={members}
          open={!!selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}

      {/* Status Management Dialog */}
      {listId && (
        <ListStatusDialog
          listId={listId}
          statuses={statuses}
          open={statusDialogOpen}
          onClose={() => setStatusDialogOpen(false)}
        />
      )}
    </div>
  )
}
