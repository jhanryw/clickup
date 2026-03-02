'use client'

import { Plus } from 'lucide-react'
import { SignOutButton } from '@/components/auth/sign-out-button'
import { CreateOrganizationDialog } from '@/components/dialogs/create-organization-dialog'

interface UserFooterProps {
  displayName: string
  initials: string
}

export function UserFooter({ displayName, initials }: UserFooterProps) {
  return (
    <div className="border-t border-zinc-800/60 px-3 py-3 space-y-2">
      <div className="flex items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 text-[10px] font-bold text-zinc-300 ring-1 ring-zinc-700">
          {initials}
        </div>
        <p className="text-[13px] font-medium text-zinc-300 truncate flex-1">{displayName}</p>
      </div>

      <CreateOrganizationDialog
        trigger={
          <button className="w-full flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors">
            <Plus className="h-3.5 w-3.5" />
            Nova Organização
          </button>
        }
      />

      <SignOutButton
        variant="button"
        className="w-full justify-center text-xs h-8 border-zinc-800 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
      />
    </div>
  )
}
