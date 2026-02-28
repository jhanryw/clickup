"use client"

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ListView } from "./list-view"
import { BoardView } from "./board-view"
import { CalendarView } from "./calendar-view"
import { LayoutList, KanbanSquare, CalendarDays, Plus } from 'lucide-react'
import { Button } from "@/components/ui/button"

interface TaskViewsProps {
    tasks: any[]
    statuses: any[]
}

export function TaskViews({ tasks, statuses }: TaskViewsProps) {
    const [activeTab, setActiveTab] = useState('list')

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

                    <div className="flex gap-3">
                        <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                            <Plus className="h-4 w-4 mr-2" /> Nova Tarefa
                        </Button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto pt-4 pb-12">
                    <TabsContent value="list" className="h-full m-0">
                        <ListView tasks={tasks} statuses={statuses} />
                    </TabsContent>

                    <TabsContent value="board" className="h-full m-0">
                        <BoardView tasks={tasks} statuses={statuses} />
                    </TabsContent>

                    <TabsContent value="calendar" className="h-full m-0">
                        <CalendarView tasks={tasks} statuses={statuses} />
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    )
}
