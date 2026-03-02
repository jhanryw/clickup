/**
 * Botão de Sign In — Client Component
 *
 * Chama uma Server Action que redireciona para o LogTo.
 * Aceita `redirectPath` para redirecionar após login (ex: aceitar convite).
 */

'use client'

import { signInAction } from '@/app/actions/auth'
import { useState } from 'react'

type Props = {
  className?: string
  redirectPath?: string
  children?: React.ReactNode
}

export function SignInButton({ className, redirectPath, children }: Props) {
  const [isLoading, setIsLoading] = useState(false)

  const handleSignIn = async () => {
    setIsLoading(true)
    await signInAction(redirectPath)
    setIsLoading(false)
  }

  return (
    <button
      onClick={handleSignIn}
      disabled={isLoading}
      className={
        className ??
        'flex w-full items-center justify-center rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-colors'
      }
    >
      {children ?? (isLoading ? 'Carregando...' : 'Entrar com conta corporativa')}
    </button>
  )
}
