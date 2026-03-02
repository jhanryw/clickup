'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  MoreHorizontal, Pencil, Trash2, Plus, Check, X, AlertTriangle,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CreateOrganizationDialog } from '@/components/dialogs/create-organization-dialog'
import { renameOrganization, deleteOrganization } from '@/app/actions/organization'

interface OrgHeaderProps {
  orgId: string
  orgName: string
  orgSlug: string
  userRole: string
}

export function OrgHeader({ orgId, orgName, orgSlug, userRole }: OrgHeaderProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [renameOpen, setRenameOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [newName, setNewName] = useState(orgName)
  const [renameError, setRenameError] = useState<string | null>(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  const isOwner = userRole === 'owner'
  const isAdminOrOwner = userRole === 'owner' || userRole === 'admin'

  function handleRename() {
    if (!newName.trim() || newName.trim().length < 2) {
      setRenameError('Nome deve ter ao menos 2 caracteres.')
      return
    }
    setRenameError(null)
    startTransition(async () => {
      const result = await renameOrganization(orgId, newName)
      if (result.error) {
        setRenameError(result.error as string)
        return
      }
      setRenameOpen(false)
      router.refresh()
    })
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteOrganization(orgId)
      if (result.error) {
        alert(result.error as string)
        return
      }
      router.push('/')
    })
  }

  return (
    <>
      <div className="flex items-center gap-3 border-b border-zinc-800/60 px-4 py-3.5 hover:bg-zinc-800/30 transition-colors group">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-xs font-bold text-white shadow-lg shadow-indigo-500/20">
          {orgName.substring(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-zinc-100">{orgName}</p>
          <p className="text-[11px] text-zinc-500 capitalize">{userRole}</p>
        </div>

        {isAdminOrOwner && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="opacity-0 group-hover:opacity-100 flex h-6 w-6 items-center justify-center rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700 transition-all">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-zinc-900 border-zinc-800 text-zinc-200 min-w-[180px]" align="end">
              <DropdownMenuItem
                onClick={() => { setNewName(orgName); setRenameOpen(true) }}
                className="gap-2 cursor-pointer hover:bg-zinc-800 focus:bg-zinc-800"
              >
                <Pencil className="h-3.5 w-3.5" /> Renomear Organização
              </DropdownMenuItem>
              {isOwner && (
                <>
                  <DropdownMenuSeparator className="bg-zinc-800" />
                  <DropdownMenuItem
                    onClick={() => { setDeleteConfirmText(''); setDeleteOpen(true) }}
                    className="gap-2 cursor-pointer text-red-400 focus:text-red-400 hover:bg-red-950/50 focus:bg-red-950/50"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Apagar Organização
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Rename Dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Renomear Organização</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-zinc-300">Novo nome</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                className="bg-zinc-950 border-zinc-700 text-zinc-200"
                autoFocus
              />
              {renameError && (
                <p className="text-xs text-red-400">{renameError}</p>
              )}
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setRenameOpen(false)} className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800">
                Cancelar
              </Button>
              <Button onClick={handleRename} disabled={isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                {isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="h-5 w-5" /> Apagar Organização
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-zinc-300">
              Esta ação é <strong className="text-white">irreversível</strong>. Todos os espaços, listas, tarefas e membros serão apagados permanentemente.
            </p>
            <div className="space-y-2">
              <Label className="text-zinc-400 text-xs">
                Digite <strong className="text-white">{orgName}</strong> para confirmar:
              </Label>
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={orgName}
                className="bg-zinc-950 border-zinc-700 text-zinc-200"
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setDeleteOpen(false)} className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800">
                Cancelar
              </Button>
              <Button
                onClick={handleDelete}
                disabled={isPending || deleteConfirmText !== orgName}
                className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-40"
              >
                {isPending ? 'Apagando...' : 'Apagar Definitivamente'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
