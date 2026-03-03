'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronRight, ChevronDown, Folder as FolderIcon, LayoutList,
  MoreHorizontal, Pencil, Trash2, Check, X, FileText, Star,
} from 'lucide-react'
import { CreateSpaceDialog } from '@/components/dialogs/create-space-dialog'
import { CreateFolderDialog } from '@/components/dialogs/create-folder-dialog'
import { CreateListDialog } from '@/components/dialogs/create-list-dialog'
import {
  renameSpace, deleteSpace,
  renameFolder, deleteFolder,
  renameList, deleteList,
} from '@/app/actions/hierarchy'
import { createDocument } from '@/app/actions/documents'
import { toggleFavorite } from '@/app/actions/favorites'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface ListNode { id: string; name: string; color: string | null }
interface FolderNode { id: string; name: string; color: string | null; is_private: boolean; lists: ListNode[] }
interface SpaceNode { id: string; name: string; color: string | null; icon: string | null; is_private: boolean; folders: FolderNode[]; direct_lists: ListNode[] }

interface HierarchySectionProps {
  hierarchy: SpaceNode[]
  orgSlug: string
  organizationId: string
  currentListId?: string | null
  /** IDs already favorited by the current user (entity_type → Set<entity_id>) */
  favorites?: { space: Set<string>; folder: Set<string>; list: Set<string> }
}

function RenameInput({ initial, onConfirm, onCancel }: {
  initial: string; onConfirm: (n: string) => void; onCancel: () => void
}) {
  const [value, setValue] = useState(initial)
  return (
    <div className="flex items-center gap-1 flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') onConfirm(value); if (e.key === 'Escape') onCancel() }}
        className="flex-1 min-w-0 rounded bg-zinc-800 border border-indigo-500/50 px-1.5 py-0.5 text-[13px] text-zinc-100 outline-none"
      />
      <button onClick={() => onConfirm(value)} className="text-green-400 hover:text-green-300">
        <Check className="h-3.5 w-3.5" />
      </button>
      <button onClick={onCancel} className="text-zinc-500 hover:text-zinc-300">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

function ConfirmDeletePopup({ label, onConfirm, onCancel }: {
  label: string; onConfirm: () => void; onCancel: () => void
}) {
  return (
    <div
      className="absolute z-50 right-0 top-full mt-1 w-56 rounded-lg border border-red-500/30 bg-zinc-900 p-3 shadow-xl"
      onClick={(e) => e.stopPropagation()}
    >
      <p className="text-xs text-zinc-300 mb-3">
        Excluir <span className="font-semibold text-white">&ldquo;{label}&rdquo;</span>? Ação irreversível.
      </p>
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-800">
          Cancelar
        </button>
        <button onClick={onConfirm} className="flex-1 rounded-md bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700">
          Excluir
        </button>
      </div>
    </div>
  )
}

/** Star button with optimistic toggle */
function StarButton({
  isFav,
  onToggle,
}: {
  isFav: boolean
  onToggle: () => void
}) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); e.preventDefault(); onToggle() }}
      className={`flex h-5 w-5 items-center justify-center rounded text-zinc-600 hover:text-amber-400 transition-colors ${isFav ? 'text-amber-400' : ''}`}
      title={isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
    >
      <Star className={`h-3 w-3 ${isFav ? 'fill-amber-400' : ''}`} />
    </button>
  )
}

export function HierarchySection({
  hierarchy, orgSlug, organizationId, currentListId,
  favorites = { space: new Set(), folder: new Set(), list: new Set() },
}: HierarchySectionProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [expandedSpaces, setExpandedSpaces] = useState<Set<string>>(() => new Set(hierarchy.map(s => s.id)))
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => new Set(hierarchy.flatMap(s => s.folders.map(f => f.id))))
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Optimistic favorites state
  const [localFavSpaces, setLocalFavSpaces]   = useState<Set<string>>(favorites.space)
  const [localFavFolders, setLocalFavFolders] = useState<Set<string>>(favorites.folder)
  const [localFavLists, setLocalFavLists]     = useState<Set<string>>(favorites.list)

  function toggle(setter: React.Dispatch<React.SetStateAction<Set<string>>>, id: string) {
    setter(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  function handleToggleFav(
    type: 'space' | 'folder' | 'list',
    id: string,
    name: string,
    color?: string | null,
  ) {
    // Optimistic update
    const setter = type === 'space' ? setLocalFavSpaces : type === 'folder' ? setLocalFavFolders : setLocalFavLists
    setter((prev) => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })

    startTransition(async () => {
      await toggleFavorite(type, id, name, color)
      router.refresh()
    })
  }

  function handleRename(type: 'space' | 'folder' | 'list', id: string, name: string) {
    startTransition(async () => {
      const fn = type === 'space' ? renameSpace : type === 'folder' ? renameFolder : renameList
      await fn(id, name)
      setRenamingId(null)
      router.refresh()
    })
  }

  function handleDelete(type: 'space' | 'folder' | 'list', id: string) {
    startTransition(async () => {
      const fn = type === 'space' ? deleteSpace : type === 'folder' ? deleteFolder : deleteList
      await fn(id)
      setDeletingId(null)
      router.refresh()
    })
  }

  function handleCreateDoc(folderId: string) {
    startTransition(async () => {
      const result = await createDocument({
        organization_id: organizationId,
        folder_id: folderId,
        title: 'Sem título',
      })
      if (result.data) {
        router.push(`/org/${orgSlug}/docs/${result.data.id}`)
      }
    })
  }

  return (
    <div className="flex flex-col">
      <div className="px-3 pt-4 pb-2 flex items-center justify-between">
        <p className="px-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Espaços ({hierarchy.length})
        </p>
        <CreateSpaceDialog organizationId={organizationId} />
      </div>

      {hierarchy.length === 0 ? (
        <p className="px-5 py-4 text-xs text-zinc-500 text-center">
          Nenhum espaço criado.<br />Clique em <span className="text-zinc-400">+</span> para começar.
        </p>
      ) : (
        <div className="space-y-0.5 pb-4 px-2">
          {hierarchy.map(space => {
            const isExpanded = expandedSpaces.has(space.id)
            const hasChildren = space.folders.length > 0 || space.direct_lists.length > 0
            const isFav = localFavSpaces.has(space.id)

            return (
              <div key={space.id} className="relative">
                <div className="group flex items-center gap-1 rounded-md px-1 py-1.5 text-sm text-zinc-200 hover:bg-zinc-800 cursor-pointer">
                  <button onClick={() => toggle(setExpandedSpaces, space.id)} className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-zinc-500 hover:text-zinc-300">
                    {hasChildren ? (isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />) : <span className="w-3.5" />}
                  </button>
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-white text-[10px] font-bold" style={{ backgroundColor: space.color || '#4f46e5' }}>
                    {space.icon || space.name.charAt(0).toUpperCase()}
                  </div>

                  {renamingId === space.id ? (
                    <RenameInput initial={space.name} onConfirm={(n) => handleRename('space', space.id, n)} onCancel={() => setRenamingId(null)} />
                  ) : (
                    <span className="flex-1 truncate font-medium ml-1">{space.name}</span>
                  )}

                  {renamingId !== space.id && (
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <StarButton isFav={isFav} onToggle={() => handleToggleFav('space', space.id, space.name, space.color)} />
                      <CreateListDialog spaceId={space.id} />
                      <CreateFolderDialog spaceId={space.id} />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="flex h-5 w-5 items-center justify-center rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700">
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-zinc-900 border-zinc-800 text-zinc-200 min-w-[140px]" align="end">
                          <DropdownMenuItem onClick={() => setRenamingId(space.id)} className="gap-2 cursor-pointer hover:bg-zinc-800 focus:bg-zinc-800">
                            <Pencil className="h-3.5 w-3.5" /> Renomear
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-zinc-800" />
                          <DropdownMenuItem onClick={() => setDeletingId(space.id)} className="gap-2 cursor-pointer text-red-400 focus:text-red-400 hover:bg-red-950/50 focus:bg-red-950/50">
                            <Trash2 className="h-3.5 w-3.5" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>

                {deletingId === space.id && (
                  <ConfirmDeletePopup label={space.name} onConfirm={() => handleDelete('space', space.id)} onCancel={() => setDeletingId(null)} />
                )}

                {isExpanded && (
                  <div className="ml-4 border-l border-zinc-800/60 pl-1 space-y-0.5 mt-0.5">
                    {space.folders.map(folder => {
                      const isFolderExpanded = expandedFolders.has(folder.id)
                      const isFolderFav = localFavFolders.has(folder.id)
                      return (
                        <div key={folder.id} className="relative">
                          <div className="group flex items-center gap-1 rounded-md px-1 py-1 text-sm text-zinc-300 hover:bg-zinc-800 cursor-pointer">
                            <button onClick={() => toggle(setExpandedFolders, folder.id)} className="flex h-4 w-4 shrink-0 items-center justify-center text-zinc-500 hover:text-zinc-300">
                              {folder.lists.length > 0 ? (isFolderExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />) : <span className="w-3" />}
                            </button>
                            <FolderIcon className="h-3.5 w-3.5 shrink-0 text-zinc-400" />

                            {renamingId === folder.id ? (
                              <RenameInput initial={folder.name} onConfirm={(n) => handleRename('folder', folder.id, n)} onCancel={() => setRenamingId(null)} />
                            ) : (
                              <span className="truncate ml-1 text-[13px] flex-1">{folder.name}</span>
                            )}

                            {renamingId !== folder.id && (
                              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <StarButton isFav={isFolderFav} onToggle={() => handleToggleFav('folder', folder.id, folder.name, folder.color)} />
                                <CreateListDialog folderId={folder.id} />
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button className="flex h-5 w-5 items-center justify-center rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700">
                                      <MoreHorizontal className="h-3.5 w-3.5" />
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent className="bg-zinc-900 border-zinc-800 text-zinc-200 min-w-[160px]" align="end">
                                    <DropdownMenuItem onClick={() => handleCreateDoc(folder.id)} className="gap-2 cursor-pointer hover:bg-zinc-800 focus:bg-zinc-800">
                                      <FileText className="h-3.5 w-3.5" /> Novo Documento
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator className="bg-zinc-800" />
                                    <DropdownMenuItem onClick={() => setRenamingId(folder.id)} className="gap-2 cursor-pointer hover:bg-zinc-800 focus:bg-zinc-800">
                                      <Pencil className="h-3.5 w-3.5" /> Renomear
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator className="bg-zinc-800" />
                                    <DropdownMenuItem onClick={() => setDeletingId(folder.id)} className="gap-2 cursor-pointer text-red-400 focus:text-red-400 hover:bg-red-950/50 focus:bg-red-950/50">
                                      <Trash2 className="h-3.5 w-3.5" /> Excluir
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            )}
                          </div>

                          {deletingId === folder.id && (
                            <ConfirmDeletePopup label={folder.name} onConfirm={() => handleDelete('folder', folder.id)} onCancel={() => setDeletingId(null)} />
                          )}

                          {isFolderExpanded && folder.lists.length > 0 && (
                            <div className="ml-5 pl-1 space-y-0.5 mt-0.5">
                              {folder.lists.map(list => (
                                <ListItem
                                  key={list.id}
                                  list={list}
                                  orgSlug={orgSlug}
                                  isActive={currentListId === list.id}
                                  isFav={localFavLists.has(list.id)}
                                  isRenaming={renamingId === list.id}
                                  isDeleting={deletingId === list.id}
                                  onRenameStart={() => setRenamingId(list.id)}
                                  onDeleteStart={() => setDeletingId(list.id)}
                                  onRenameConfirm={(n) => handleRename('list', list.id, n)}
                                  onRenameCancel={() => setRenamingId(null)}
                                  onDeleteConfirm={() => handleDelete('list', list.id)}
                                  onDeleteCancel={() => setDeletingId(null)}
                                  onToggleFav={() => handleToggleFav('list', list.id, list.name, list.color)}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}

                    {space.direct_lists.map(list => (
                      <ListItem
                        key={list.id}
                        list={list}
                        orgSlug={orgSlug}
                        isActive={currentListId === list.id}
                        isFav={localFavLists.has(list.id)}
                        isRenaming={renamingId === list.id}
                        isDeleting={deletingId === list.id}
                        onRenameStart={() => setRenamingId(list.id)}
                        onDeleteStart={() => setDeletingId(list.id)}
                        onRenameConfirm={(n) => handleRename('list', list.id, n)}
                        onRenameCancel={() => setRenamingId(null)}
                        onDeleteConfirm={() => handleDelete('list', list.id)}
                        onDeleteCancel={() => setDeletingId(null)}
                        onToggleFav={() => handleToggleFav('list', list.id, list.name, list.color)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ListItem({ list, orgSlug, isActive, isFav, isRenaming, isDeleting, onRenameStart, onDeleteStart, onRenameConfirm, onRenameCancel, onDeleteConfirm, onDeleteCancel, onToggleFav }: {
  list: ListNode; orgSlug: string; isActive: boolean; isFav: boolean; isRenaming: boolean; isDeleting: boolean
  onRenameStart: () => void; onDeleteStart: () => void
  onRenameConfirm: (n: string) => void; onRenameCancel: () => void
  onDeleteConfirm: () => void; onDeleteCancel: () => void
  onToggleFav: () => void
}) {
  return (
    <div className="relative group">
      <div className={`flex items-center gap-2 rounded-md px-2 py-1 text-[13px] transition-colors ${
        isActive ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/20' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
      }`}>
        <LayoutList className="h-3 w-3 shrink-0" style={{ color: list.color || (isActive ? '#818cf8' : 'inherit') }} />

        {isRenaming ? (
          <RenameInput initial={list.name} onConfirm={onRenameConfirm} onCancel={onRenameCancel} />
        ) : (
          <>
            <Link href={`/org/${orgSlug}?listId=${list.id}`} className="flex-1 truncate">{list.name}</Link>
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <StarButton isFav={isFav} onToggle={onToggleFav} />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex h-4 w-4 items-center justify-center rounded text-zinc-500 hover:text-zinc-300">
                    <MoreHorizontal className="h-3 w-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-zinc-900 border-zinc-800 text-zinc-200 min-w-[140px]" align="end">
                  <DropdownMenuItem onClick={onRenameStart} className="gap-2 cursor-pointer hover:bg-zinc-800 focus:bg-zinc-800">
                    <Pencil className="h-3.5 w-3.5" /> Renomear
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-zinc-800" />
                  <DropdownMenuItem onClick={onDeleteStart} className="gap-2 cursor-pointer text-red-400 focus:text-red-400 hover:bg-red-950/50 focus:bg-red-950/50">
                    <Trash2 className="h-3.5 w-3.5" /> Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </>
        )}
      </div>

      {isDeleting && (
        <ConfirmDeletePopup label={list.name} onConfirm={onDeleteConfirm} onCancel={onDeleteCancel} />
      )}
    </div>
  )
}
