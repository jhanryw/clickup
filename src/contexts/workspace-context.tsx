'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

interface WorkspaceState {
  activeListId: string | null
  activeListName: string | null
  orgId: string
  orgSlug: string
  orgName: string
  userRole: string
}

interface WorkspaceContextType extends WorkspaceState {
  setActiveList: (id: string | null, name?: string | null) => void
}

const WorkspaceContext = createContext<WorkspaceContextType | null>(null)

export function WorkspaceProvider({
  children,
  initialState,
}: {
  children: ReactNode
  initialState: WorkspaceState
}) {
  const [state, setState] = useState<WorkspaceState>(initialState)

  const setActiveList = useCallback((id: string | null, name?: string | null) => {
    setState(prev => ({
      ...prev,
      activeListId: id,
      activeListName: name ?? null,
    }))
  }, [])

  return (
    <WorkspaceContext.Provider value={{ ...state, setActiveList }}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error('useWorkspace deve ser usado dentro de WorkspaceProvider')
  return ctx
}
