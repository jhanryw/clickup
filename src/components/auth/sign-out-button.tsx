/**
 * Botão de Sign Out — Client Component
 *
 * Chama uma Server Action que limpa a sessão e redireciona para login.
 */

'use client'

import { signOutAction } from '@/app/actions/auth'
import { useState } from 'react'

type Props = {
  className?: string
  variant?: 'button' | 'link'
}

export function SignOutButton({ className, variant = 'button' }: Props) {
  const [isLoading, setIsLoading] = useState(false)

  const handleSignOut = async () => {
    setIsLoading(true)
    try {
      await signOutAction()
    } catch (error) {
      console.error('[SignOut Error]', error)
      setIsLoading(false)
    }
  }

  if (variant === 'link') {
    return (
      <button
        onClick={handleSignOut}
        disabled={isLoading}
        className={
          className ??
          'text-sm text-muted-foreground hover:text-foreground underline underline-offset-4 disabled:opacity-50 transition-colors'
        }
      >
        {isLoading ? 'Saindo...' : 'Sair'}
      </button>
    )
  }

  return (
    <button
      onClick={handleSignOut}
      disabled={isLoading}
      className={
        className ??
        'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-50 transition-colors'
      }
    >
      {isLoading ? 'Saindo...' : 'Sair'}
    </button>
  )
}
