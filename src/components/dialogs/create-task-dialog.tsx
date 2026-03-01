'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createTask } from '@/app/actions/tasks'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus } from 'lucide-react'

interface CreateTaskDialogProps {
  listId: string
  statuses: { id: string; name: string; color: string }[]
}

export function CreateTaskDialog({ listId, statuses }: CreateTaskDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const form = new FormData(e.currentTarget)
    const title = form.get('title') as string
    const description = form.get('description') as string
    const priority = form.get('priority') as string
    const statusId = form.get('status_id') as string
    const dueDate = form.get('due_date') as string

    const result = await createTask({
      list_id: listId,
      title,
      description: description || null,
      priority: priority && priority !== 'none' ? priority as any : null,
      status_id: statusId || null,
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
      assignee_ids: [],
    })

    setLoading(false)

    if (result.error) {
      setError(result.error)
    } else {
      setOpen(false)
      router.refresh()
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
          <Plus className="h-4 w-4 mr-2" /> Nova Tarefa
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg">Nova Tarefa</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Título */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-zinc-300">Título *</Label>
            <Input
              id="title"
              name="title"
              required
              placeholder="Ex: Criar landing page"
              className="bg-zinc-950 border-zinc-700 text-zinc-200 placeholder:text-zinc-600"
            />
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-zinc-300">Descrição</Label>
            <textarea
              id="description"
              name="description"
              rows={3}
              placeholder="Detalhes da tarefa..."
              className="flex w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Status */}
            <div className="space-y-2">
              <Label className="text-zinc-300">Status</Label>
              <Select name="status_id" defaultValue={statuses[0]?.id}>
                <SelectTrigger className="bg-zinc-950 border-zinc-700 text-zinc-200">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  {statuses.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-zinc-200 focus:bg-zinc-800 focus:text-white">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                        {s.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Prioridade */}
            <div className="space-y-2">
              <Label className="text-zinc-300">Prioridade</Label>
              <Select name="priority" defaultValue="none">
                <SelectTrigger className="bg-zinc-950 border-zinc-700 text-zinc-200">
                  <SelectValue placeholder="Nenhuma" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  <SelectItem value="none" className="text-zinc-200 focus:bg-zinc-800">Nenhuma</SelectItem>
                  <SelectItem value="low" className="text-zinc-200 focus:bg-zinc-800">🟢 Baixa</SelectItem>
                  <SelectItem value="normal" className="text-zinc-200 focus:bg-zinc-800">🔵 Normal</SelectItem>
                  <SelectItem value="high" className="text-zinc-200 focus:bg-zinc-800">🟠 Alta</SelectItem>
                  <SelectItem value="urgent" className="text-zinc-200 focus:bg-zinc-800">🔴 Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Data de vencimento */}
          <div className="space-y-2">
            <Label htmlFor="due_date" className="text-zinc-300">Data de Vencimento</Label>
            <Input
              id="due_date"
              name="due_date"
              type="date"
              className="bg-zinc-950 border-zinc-700 text-zinc-200"
            />
          </div>

          {/* Erro */}
          {error && (
            <p className="text-sm text-red-400 bg-red-950/30 px-3 py-2 rounded">{error}</p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {loading ? 'Criando...' : 'Criar Tarefa'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
