"use client"

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createTask } from '@/app/actions/tasks'
import { useRouter } from 'next/navigation'

interface CreateTaskModalProps {
    listId: string
}

export function CreateTaskModal({ listId }: CreateTaskModalProps) {
    const [open, setOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()

    async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setIsLoading(true)

        const formData = new FormData(e.currentTarget)
        const priority = formData.get('priority') as "low" | "normal" | "high" | "urgent" | "none"

        try {
            await createTask({
                list_id: listId,
                title: formData.get('title') as string,
                description: formData.get('description') as string,
                priority: priority !== 'none' ? priority : undefined,
                due_date: formData.get('due_date') as string || undefined,
                assignee_ids: [],
                start_date: undefined,
                estimated_hours: undefined,
            })
            setOpen(false)
            router.refresh()
        } catch (error) {
            console.error(error)
            alert('Falha ao criar tarefa')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
                    <Plus className="h-4 w-4" />
                    Nova Tarefa
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-zinc-950 border-zinc-800 text-zinc-100">
                <DialogHeader>
                    <DialogTitle>Nova Tarefa</DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        Adicione os detalhes da nova tarefa à lista atual.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={onSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="title" className="text-zinc-300">Título</Label>
                            <Input
                                id="title"
                                name="title"
                                placeholder="Ex: Preparar relatório mensal"
                                required
                                className="bg-zinc-900 border-zinc-700 text-zinc-100 focus-visible:ring-indigo-500"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="description" className="text-zinc-300">Descrição</Label>
                            <Textarea
                                id="description"
                                name="description"
                                placeholder="Mais detalhes sobre a tarefa"
                                className="bg-zinc-900 border-zinc-700 text-zinc-100 focus-visible:ring-indigo-500"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="priority" className="text-zinc-300">Prioridade</Label>
                                <Select name="priority" defaultValue="none">
                                    <SelectTrigger className="bg-zinc-900 border-zinc-700 text-zinc-100">
                                        <SelectValue placeholder="Selecione" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-zinc-900 border-zinc-700 text-zinc-100">
                                        <SelectItem value="none">Sem prioridade</SelectItem>
                                        <SelectItem value="low">Baixa</SelectItem>
                                        <SelectItem value="normal">Normal</SelectItem>
                                        <SelectItem value="high">Alta</SelectItem>
                                        <SelectItem value="urgent">Urgente</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="due_date" className="text-zinc-300">Data Final</Label>
                                <Input
                                    id="due_date"
                                    name="due_date"
                                    type="date"
                                    className="bg-zinc-900 border-zinc-700 text-zinc-100 focus-visible:ring-indigo-500 block"
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)} className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white">
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                            {isLoading ? 'Salvando...' : 'Salvar'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
