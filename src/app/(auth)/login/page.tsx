import type { Metadata } from 'next'
import { SignInButton } from '@/components/auth/sign-in-button'

export const metadata: Metadata = {
  title: 'Entrar',
}

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-white to-purple-50/30">
      {/* Barra gradiente no topo */}
      <div
        className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600 animate-gradient"
        style={{ backgroundSize: '200% 200%' }}
      />

      {/* Pattern sutil de fundo */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(circle, #7c3aed 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      <div className="relative z-10 w-full max-w-md space-y-8 px-6">
        {/* Logo */}
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-purple-700 shadow-lg shadow-purple-500/25">
            <span className="text-3xl font-bold text-white">T</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Sistema de Tarefas
          </h1>
          <p className="mt-3 text-base text-muted-foreground">
            Gerencie projetos e entregas com sua equipe
          </p>
        </div>

        {/* Card de Login */}
        <div className="rounded-xl border border-border/60 bg-white p-8 shadow-xl shadow-black/5">
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Você será redirecionado para o portal de autenticação seguro.
              </p>
            </div>

            <SignInButton
              className="flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-purple-500/20 hover:from-purple-700 hover:to-purple-800 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500 transition-all duration-200"
            />

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/60" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-3 text-xs text-muted-foreground">
                  acesso corporativo
                </span>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Problemas para acessar?{' '}
          <a
            href="mailto:ti@empresa.com"
            className="font-medium text-purple-600 underline underline-offset-4 hover:text-purple-700"
          >
            Contate o suporte de TI
          </a>
        </p>
      </div>
    </div>
  )
}
