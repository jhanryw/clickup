/**
 * Página de Login — Server Component.
 * Usa o SignInButton (Client Component) para iniciar o fluxo de autenticação LogTo.
 *
 * Se o usuário já estiver autenticado, o middleware redireciona
 * antes de chegar aqui.
 */

import type { Metadata } from 'next'
import { SignInButton } from '@/components/auth/sign-in-button'

export const metadata: Metadata = {
  title: 'Entrar',
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-8 px-4">
        {/* Logo / Marca */}
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary">
            <span className="text-2xl font-bold text-white">T</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Sistema Interno de Tarefas
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Acesse com sua conta corporativa
          </p>
        </div>

        {/* Card de Login */}
        <div className="rounded-lg border border-border bg-card p-8 shadow-sm">
          <div className="space-y-4">
            <p className="text-center text-sm text-muted-foreground">
              Você será redirecionado para o portal de autenticação seguro.
            </p>

            {/* Botão de Login — Server Action */}
            <SignInButton />
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Problemas para acessar?{' '}
          <a
            href="mailto:ti@empresa.com"
            className="underline underline-offset-4 hover:text-primary"
          >
            Contate o suporte de TI
          </a>
        </p>
      </div>
    </div>
  )
}
