'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createList } from '@/app/actions/hierarchy'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ListPlus } from 'lucide-react'

interface CreateListDialogProps {
  folderId?: string | null
  spaceId?: string | null
}

export function CreateListDialog({ folderId, spaceId }: CreateListDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const form = new FormData(e.currentTarget)
    const name = form.get('name') as string

    try {
      const result = await createList({
        folder_id: folderId || null,
        space_id: folderId ? null : spaceId || null,
        name,
        is_private: false,
      })

      if ('error' in result && result.error) {
        setError(result.error as string)
      } else {
        setOpen(false)
        router.refresh()
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao criar lista')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="rounded p-0.5 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300 transition-colors opacity-0 group-hover:opacity-100"
          title="Nova Lista"
        >
          <ListPlus className="h-3.5 w-3.5" />
        </button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">Nova Lista</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="list-name" className="text-zinc-300">Nome *</Label>
            <Input
              id="list-name"
              name="name"
              required
              placeholder="Ex: Tarefas, Bugs, Ideias..."
              className="bg-zinc-950 border-zinc-700 text-zinc-200 placeholder:text-zinc-600"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-950/30 px-3 py-2 rounded">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {loading ? 'Criando...' : 'Criar Lista'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
