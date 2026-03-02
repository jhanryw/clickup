'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { X, Trash2 } from 'lucide-react'
import { updateTask, setTaskAssignees, deleteTask } from '@/app/actions/tasks'

interface Member {
  userId: string
  displayName: string
  email: string
}

interface TaskDetailDialogProps {
  task: any
  statuses: any[]
  members: Member[]
  open: boolean
  onClose: () => void
}

const PRIORITY_OPTS = [
  { value: 'none',   label: 'Nenhuma',  dot: 'bg-zinc-600' },
  { value: 'low',    label: '🟢 Baixa',  dot: 'bg-emerald-500' },
  { value: 'normal', label: '🔵 Normal', dot: 'bg-blue-500' },
  { value: 'high',   label: '🟠 Alta',   dot: 'bg-orange-500' },
  { value: 'urgent', label: '🔴 Urgente',dot: 'bg-red-500' },
]

export function TaskDetailDialog({
  task, statuses, members, open, onClose,
}: TaskDetailDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const [title, setTitle] = useState(task.title ?? '')
  const [description, setDescription] = useState(task.description ?? '')
  const [statusId, setStatusId] = useState(task.status_id ?? statuses[0]?.id ?? '')
  const [priority, setPriority] = useState(task.priority ?? 'none')
  const [dueDate, setDueDate] = useState(
    task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : ''
  )
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>(
    (task.task_assignees ?? []).map((a: any) => a.user_id)
  )
  const [error, setError] = useState<string | null>(null)

  function toggleAssignee(userId: string) {
    setSelectedAssignees((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    )
  }

  function handleSave() {
    if (!title.trim()) { setError('Título é obrigatório'); return }
    setError(null)

    startTransition(async () => {
      const r1 = await updateTask(task.id, {
        title: title.trim(),
        description: description.trim() || null,
        status_id: statusId || null,
        priority: priority !== 'none' ? (priority as any) : null,
        due_date: dueDate ? new Date(dueDate + 'T12:00:00Z').toISOString() : null,
      })
      if (r1.error) { setError(r1.error as string); return }

      const r2 = await setTaskAssignees(task.id, selectedAssignees)
      if (r2.error) { setError(r2.error as string); return }

      router.refresh()
      onClose()
    })
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteTask(task.id)
      router.refresh()
      onClose()
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Detalhes da Tarefa</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          {/* Título */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Título</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nome da tarefa..."
              className="bg-zinc-950 border-zinc-700 text-zinc-100 text-base font-medium"
            />
          </div>

          {/* Descrição */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Descrição</Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Detalhes, contexto, links..."
              className="flex w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Status */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Status</Label>
              <Select value={statusId} onValueChange={setStatusId}>
                <SelectTrigger className="bg-zinc-950 border-zinc-700 text-zinc-200 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  {statuses.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-zinc-200 focus:bg-zinc-800">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                        {s.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Prioridade */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Prioridade</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="bg-zinc-950 border-zinc-700 text-zinc-200 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  {PRIORITY_OPTS.map((p) => (
                    <SelectItem key={p.value} value={p.value} className="text-zinc-200 focus:bg-zinc-800">
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Data de Vencimento */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Data de Vencimento</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="bg-zinc-950 border-zinc-700 text-zinc-200 h-9 w-48"
            />
          </div>

          {/* Responsáveis */}
          {members.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Responsáveis</Label>
              <div className="flex flex-wrap gap-2 p-3 rounded-md border border-zinc-700 bg-zinc-950 min-h-[52px]">
                {members.map((m) => {
                  const isSelected = selectedAssignees.includes(m.userId)
                  return (
                    <button
                      key={m.userId}
                      type="button"
                      onClick={() => toggleAssignee(m.userId)}
                      className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition-all ${
                        isSelected
                          ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                          : 'bg-zinc-800 text-zinc-400 border border-transparent hover:border-zinc-600 hover:text-zinc-200'
                      }`}
                    >
                      <div className="flex h-4 w-4 items-center justify-center rounded-full bg-zinc-700 text-[9px] font-bold uppercase">
                        {m.displayName.substring(0, 1)}
                      </div>
                      {m.displayName}
                      {isSelected && <X className="h-3 w-3 ml-0.5 opacity-60" />}
                    </button>
                  )
                })}
                {members.length === 0 && (
                  <span className="text-xs text-zinc-600 self-center">Nenhum membro disponível</span>
                )}
              </div>
            </div>
          )}

          {/* Assignees selecionados como preview */}
          {selectedAssignees.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selectedAssignees.map((uid) => {
                const m = members.find((x) => x.userId === uid)
                return m ? (
                  <Badge key={uid} variant="outline" className="text-[10px] border-indigo-500/30 text-indigo-300 bg-indigo-600/10">
                    {m.displayName}
                  </Badge>
                ) : null
              })}
            </div>
          )}

          {error && (
            <p className="text-sm text-red-400 bg-red-950/30 px-3 py-2 rounded">{error}</p>
          )}

          {/* Confirmar exclusão inline */}
          {confirmDelete && (
            <div className="flex items-center gap-3 bg-red-950/30 border border-red-900/40 rounded-md px-4 py-3">
              <p className="text-sm text-red-300 flex-1">Excluir esta tarefa permanentemente?</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmDelete(false)}
                className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 h-8"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleDelete}
                disabled={isPending}
                className="bg-red-600 hover:bg-red-700 text-white h-8"
              >
                {isPending ? 'Excluindo...' : 'Excluir'}
              </Button>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirmDelete(true)}
              disabled={isPending || confirmDelete}
              className="text-zinc-600 hover:text-red-400 hover:bg-red-950/30 gap-1.5"
            >
              <Trash2 className="h-4 w-4" />
              Excluir
            </Button>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={isPending || !title.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
