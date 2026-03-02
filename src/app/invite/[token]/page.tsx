import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Mail, XCircle } from 'lucide-react'
import { processInviteByToken } from '@/app/actions/hierarchy'
import { SignInButton } from '@/components/auth/sign-in-button'

interface InvitePageProps {
  params: { token: string }
}

export default async function InvitePage({ params }: InvitePageProps) {
  const headersList = headers()
  const userId = headersList.get('x-user-id')
  const userEmail = headersList.get('x-user-email')

  // Usuário está autenticado — processa o convite automaticamente
  if (userId && userEmail) {
    const result = await processInviteByToken(params.token, userId, userEmail)

    if (result?.success && result.orgSlug) {
      redirect(`/org/${result.orgSlug}`)
    }

    // Erro ao processar o convite — mostra mensagem de erro
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
        <div className="flex flex-col items-center gap-5 text-center max-w-sm">
          <div className="rounded-full bg-red-500/10 border border-red-500/20 p-4">
            <XCircle className="h-10 w-10 text-red-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-100">Convite inválido</h1>
            <p className="text-sm text-zinc-400 mt-2">
              {result?.error || 'Este convite é inválido ou já foi utilizado.'}
            </p>
          </div>
          <Link
            href="/"
            className="rounded-lg border border-zinc-700 px-5 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    )
  }

  // Usuário não está autenticado — pede para fazer login
  const redirectPath = `/invite/${params.token}`

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="flex flex-col items-center gap-6 text-center max-w-sm w-full">
        {/* Ícone */}
        <div className="rounded-2xl bg-indigo-600/10 border border-indigo-500/20 p-5">
          <Mail className="h-12 w-12 text-indigo-400" />
        </div>

        {/* Texto */}
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Você foi convidado!</h1>
          <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
            Faça login para aceitar o convite e entrar na organização.
            <br />
            Você será redirecionado automaticamente após o login.
          </p>
        </div>

        {/* Botão de login com redirect */}
        <SignInButton
          redirectPath={redirectPath}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 px-6 py-3 text-sm font-medium text-white transition-colors disabled:opacity-60"
        >
          Entrar com minha conta
        </SignInButton>

        <p className="text-xs text-zinc-500">
          Após o login, você será adicionado automaticamente à organização.
        </p>
      </div>
    </div>
  )
}
