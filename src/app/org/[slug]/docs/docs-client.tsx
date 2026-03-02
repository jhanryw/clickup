'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FileText, Plus, Trash2, Clock, Folder as FolderIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { createDocument, deleteDocument } from '@/app/actions/documents'

interface DocItem {
  id: string
  title: string
  folder_id: string | null
  folderName: string | null
  created_at: string
  updated_at: string
}

interface DocsClientProps {
  orgId: string
  orgSlug: string
  docs: DocItem[]
  userRole: string
}

export function DocsClient({ orgId, orgSlug, docs, userRole }: DocsClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showCreate, setShowCreate] = useState(false)
  const [title, setTitle] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const canManage = userRole === 'owner' || userRole === 'admin' || userRole === 'member'

  async function handleCreate() {
    if (!title.trim()) { setError('Digite um título'); return }
    setError(null)
    startTransition(async () => {
      const result = await createDocument({ organization_id: orgId, title })
      if (result.error) {
        setError(result.error)
      } else if (result.data) {
        setShowCreate(false)
        setTitle('')
        router.push(`/org/${orgSlug}/docs/${result.data.id}`)
      }
    })
  }

  async function handleDelete(id: string) {
    startTransition(async () => {
      await deleteDocument(id)
      setDeletingId(null)
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <Button
          onClick={() => setShowCreate(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
        >
          <Plus className="h-4 w-4" /> Novo Documento
        </Button>
      )}

      {docs.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-16 text-center">
          <FileText className="h-10 w-10 text-zinc-700 mx-auto mb-4" />
          <p className="text-sm text-zinc-400">Nenhum documento criado ainda.</p>
          {canManage && (
            <p className="text-xs text-zinc-600 mt-2">Clique em &ldquo;Novo Documento&rdquo; para começar.</p>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 overflow-hidden">
          {docs.map((doc, i) => (
            <div
              key={doc.id}
              className={`flex items-center gap-4 px-5 py-3.5 hover:bg-zinc-800/40 transition-colors group ${
                i < docs.length - 1 ? 'border-b border-zinc-800/50' : ''
              }`}
            >
              <FileText className="h-4 w-4 text-zinc-500 shrink-0" />

              <div className="flex-1 min-w-0">
                <Link
                  href={`/org/${orgSlug}/docs/${doc.id}`}
                  className="text-sm font-medium text-zinc-200 hover:text-indigo-300 transition-colors truncate block"
                >
                  {doc.title || 'Sem título'}
                </Link>
                {doc.folderName && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <FolderIcon className="h-3 w-3 text-zinc-600" />
                    <span className="text-xs text-zinc-600">{doc.folderName}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-xs text-zinc-600">
                <Clock className="h-3 w-3" />
                {new Date(doc.updated_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
              </div>

              {canManage && (
                <button
                  onClick={() => setDeletingId(doc.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md text-zinc-600 hover:text-red-400 hover:bg-red-950/40 transition-all"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={(o) => { setShowCreate(o); setTitle(''); setError(null) }}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
          <DialogHeader>
            <DialogTitle>Novo Documento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {error && <p className="text-sm text-red-400 bg-red-950/30 px-3 py-2 rounded">{error}</p>}
            <div className="space-y-2">
              <Label className="text-zinc-300">Título</Label>
              <Input
                autoFocus
                placeholder="Nome do documento..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                className="bg-zinc-950 border-zinc-700 text-zinc-100"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreate(false)} className="text-zinc-400">Cancelar</Button>
            <Button onClick={handleCreate} disabled={isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {isPending ? 'Criando...' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-400">Excluir Documento</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-zinc-300">Esta ação é irreversível. O documento será excluído permanentemente.</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeletingId(null)} className="text-zinc-400">Cancelar</Button>
            <Button onClick={() => deletingId && handleDelete(deletingId)} disabled={isPending} className="bg-red-600 hover:bg-red-700 text-white">
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
