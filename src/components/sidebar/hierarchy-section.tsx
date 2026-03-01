'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronRight, ChevronDown, Folder as FolderIcon, LayoutList, Plus, FolderPlus, ListPlus } from 'lucide-react'
import { CreateSpaceDialog } from '@/components/dialogs/create-space-dialog'
import { CreateFolderDialog } from '@/components/dialogs/create-folder-dialog'
import { CreateListDialog } from '@/components/dialogs/create-list-dialog'

interface ListNode {
  id: string
  name: string
  color: string | null
}

interface FolderNode {
  id: string
  name: string
  color: string | null
  is_private: boolean
  lists: ListNode[]
}

interface SpaceNode {
  id: string
  name: string
  color: string | null
  icon: string | null
  is_private: boolean
  folders: FolderNode[]
  direct_lists: ListNode[]
}

interface HierarchySectionProps {
  hierarchy: SpaceNode[]
  orgSlug: string
  organizationId: string
  currentListId?: string | null
}

export function HierarchySection({ hierarchy, orgSlug, organizationId, currentListId }: HierarchySectionProps) {
  const [expandedSpaces, setExpandedSpaces] = useState<Set<string>>(() => {
    // Auto-expand all spaces initially
    return new Set(hierarchy.map(s => s.id))
  })
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => {
    return new Set(hierarchy.flatMap(s => s.folders.map(f => f.id)))
  })

  function toggleSpace(id: string) {
    setExpandedSpaces(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleFolder(id: string) {
    setExpandedFolders(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="flex flex-col">
      {/* Espaços Header */}
      <div className="px-3 pt-4 pb-2 flex items-center justify-between">
        <p className="px-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Espaços ({hierarchy.length})
        </p>
        <CreateSpaceDialog organizationId={organizationId} />
      </div>

      {/* Hierarchy Tree */}
      {hierarchy.length === 0 ? (
        <p className="px-5 py-4 text-xs text-zinc-500 text-center">
          Nenhum espaço criado ainda.
          <br />
          Clique em <span className="text-zinc-400">+</span> para começar.
        </p>
      ) : (
        <div className="space-y-0.5 pb-4 px-2">
          {hierarchy.map(space => {
            const isExpanded = expandedSpaces.has(space.id)
            const hasChildren = space.folders.length > 0 || space.direct_lists.length > 0

            return (
              <div key={space.id}>
                {/* Space Item */}
                <div className="group flex items-center gap-1 rounded-md px-1 py-1.5 text-sm text-zinc-200 hover:bg-zinc-800 cursor-pointer">
                  <button
                    onClick={() => toggleSpace(space.id)}
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-zinc-500 hover:text-zinc-300"
                  >
                    {hasChildren ? (
                      isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />
                    ) : (
                      <span className="w-3.5" />
                    )}
                  </button>

                  <div
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-white text-[10px] font-bold"
                    style={{ backgroundColor: space.color || '#4f46e5' }}
                  >
                    {space.icon ? space.icon : space.name.charAt(0).toUpperCase()}
                  </div>

                  <span className="flex-1 truncate font-medium ml-1">{space.name}</span>

                  {/* Action buttons - visible on hover */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <CreateListDialog spaceId={space.id} />
                    <CreateFolderDialog spaceId={space.id} />
                  </div>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="ml-4 border-l border-zinc-800/60 pl-1 space-y-0.5 mt-0.5">
                    {/* Folders */}
                    {space.folders.map(folder => {
                      const isFolderExpanded = expandedFolders.has(folder.id)

                      return (
                        <div key={folder.id}>
                          <div className="group flex items-center gap-1 rounded-md px-1 py-1 text-sm text-zinc-300 hover:bg-zinc-800 cursor-pointer">
                            <button
                              onClick={() => toggleFolder(folder.id)}
                              className="flex h-4 w-4 shrink-0 items-center justify-center text-zinc-500 hover:text-zinc-300"
                            >
                              {folder.lists.length > 0 ? (
                                isFolderExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />
                              ) : (
                                <span className="w-3" />
                              )}
                            </button>

                            <FolderIcon className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                            <span className="truncate ml-1 text-[13px]">{folder.name}</span>

                            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
                              <CreateListDialog folderId={folder.id} />
                            </div>
                          </div>

                          {/* Lists in Folder */}
                          {isFolderExpanded && folder.lists.length > 0 && (
                            <div className="ml-5 pl-1 space-y-0.5 mt-0.5">
                              {folder.lists.map(list => (
                                <ListLink
                                  key={list.id}
                                  list={list}
                                  orgSlug={orgSlug}
                                  isActive={currentListId === list.id}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}

                    {/* Direct Lists (lists without folder) */}
                    {space.direct_lists.map(list => (
                      <ListLink
                        key={list.id}
                        list={list}
                        orgSlug={orgSlug}
                        isActive={currentListId === list.id}
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

function ListLink({ list, orgSlug, isActive }: { list: ListNode; orgSlug: string; isActive: boolean }) {
  return (
    <Link
      href={`/org/${orgSlug}?listId=${list.id}`}
      className={`flex items-center gap-2 rounded-md px-2 py-1 text-[13px] transition-colors ${
        isActive
          ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/20'
          : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
      }`}
    >
      <LayoutList className="h-3 w-3 shrink-0" style={{ color: list.color || (isActive ? '#818cf8' : 'inherit') }} />
      <span className="truncate">{list.name}</span>
    </Link>
  )
}
