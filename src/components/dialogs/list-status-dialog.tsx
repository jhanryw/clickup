'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash2, Check, Pencil } from 'lucide-react'
import { addStatusToList, updateStatus, removeStatusFromList } from '@/app/actions/statuses'

interface Status {
  id: string
  name: string
  color: string
  is_closed?: boolean
}

interface ListStatusDialogProps {
  listId: string
  statuses: Status[]
  open: boolean
  onClose: () => void
}

const PRESET_COLORS = [
  '#6B7280', '#3B82F6', '#F59E0B', '#10B981',
  '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6',
]

function StatusRow({
  status, listId, onDone,
}: { status: Status; listId: string; onDone: () => void }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(status.name)
  const [color, setColor] = useState(status.color)
  const [isClosed, setIsClosed] = useState(status.is_closed ?? false)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    startTransition(async () => {
      await updateStatus(status.id, name, color, isClosed)
      setEditing(false)
      onDone()
    })
  }

  function handleRemove() {
    startTransition(async () => {
      const result = await removeStatusFromList(listId, status.id)
      if ('error' in result && result.error) {
        alert(result.error as string)
        return
      }
      onDone()
    })
  }

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-zinc-800/50 last:border-b-0">
      {editing ? (
        <div className="flex-1 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-zinc-950 border-zinc-700 text-zinc-200 h-8 text-sm flex-1"
              autoFocus
            />
            <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer">
              <input
                type="checkbox"
                checked={isClosed}
                onChange={(e) => setIsClosed(e.target.checked)}
                className="accent-indigo-500"
              />
              Concluído
            </label>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">Cor:</span>
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`h-5 w-5 rounded-full border-2 transition-all ${
                  color === c ? 'border-white scale-110' : 'border-transparent'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isPending || !name.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white h-7 text-xs"
            >
              <Check className="h-3 w-3 mr-1" /> Salvar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => { setEditing(false); setName(status.name); setColor(status.color) }}
              className="text-zinc-400 h-7 text-xs"
            >
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="h-4 w-4 rounded-full shrink-0" style={{ backgroundColor: status.color }} />
          <span className="flex-1 text-sm text-zinc-200">{status.name}</span>
          {status.is_closed && (
            <span className="text-[10px] text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded">Concluído</span>
          )}
          <button
            onClick={() => setEditing(true)}
            className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleRemove}
            disabled={isPending}
            className="p-1 rounded text-zinc-600 hover:text-red-400 hover:bg-red-950/30 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </>
      )}
    </div>
  )
}

export function ListStatusDialog({ listId, statuses: initialStatuses, open, onClose }: ListStatusDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#6B7280')
  const [newIsClosed, setNewIsClosed] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function refresh() {
    router.refresh()
  }

  function handleAdd() {
    if (!newName.trim()) { setError('Nome é obrigatório'); return }
    setError(null)
    startTransition(async () => {
      const result = await addStatusToList(listId, newName, newColor, newIsClosed)
      if ('error' in result && result.error) {
        setError(result.error as string)
        return
      }
      setNewName('')
      setNewColor('#6B7280')
      setNewIsClosed(false)
      setAdding(false)
      refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Gerenciar Status da Lista</DialogTitle>
        </DialogHeader>

        <div className="space-y-1 pt-2">
          {initialStatuses.map((s) => (
            <StatusRow key={s.id} status={s} listId={listId} onDone={refresh} />
          ))}

          {initialStatuses.length === 0 && (
            <p className="text-sm text-zinc-500 text-center py-4">Nenhum status encontrado.</p>
          )}
        </div>

        {adding ? (
          <div className="border border-zinc-700 rounded-lg p-3 space-y-3 mt-2">
            <Label className="text-xs text-zinc-400">Novo Status</Label>
            <div className="flex items-center gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nome do status..."
                className="bg-zinc-950 border-zinc-700 text-zinc-200 h-8 text-sm flex-1"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              />
              <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={newIsClosed}
                  onChange={(e) => setNewIsClosed(e.target.checked)}
                  className="accent-indigo-500"
                />
                Concluído
              </label>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500">Cor:</span>
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewColor(c)}
                  className={`h-5 w-5 rounded-full border-2 transition-all ${
                    newColor === c ? 'border-white scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <div className="h-5 w-5 rounded-full shrink-0 ml-1" style={{ backgroundColor: newColor }} />
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleAdd}
                disabled={isPending || !newName.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white h-7 text-xs"
              >
                {isPending ? 'Adicionando...' : 'Adicionar'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setAdding(false); setError(null) }}
                className="text-zinc-400 h-7 text-xs"
              >
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAdding(true)}
            className="w-full border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 mt-3 gap-2"
          >
            <Plus className="h-4 w-4" /> Novo Status
          </Button>
        )}

        <div className="flex justify-end pt-2">
          <Button variant="ghost" onClick={onClose} className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800">
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
