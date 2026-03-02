/**
 * Callback route do LogTo — GET /callback
 *
 * Após autenticação bem-sucedida no LogTo, o usuário é redirecionado aqui.
 * Este handler:
 *   1. Valida a resposta do LogTo
 *   2. Sincroniza o perfil no Supabase
 *   3. Redireciona para o dashboard (ou redirect pós-login, ex: aceitar convite)
 */

import { handleSignIn } from '@logto/next/server-actions'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'
import { logtoConfig } from '@/app/logto'
import { upsertUserProfile } from '@/lib/supabase/server'
import { getLogtoContext } from '@logto/next/server-actions'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams

  let success = false;
  try {
    // Valida a resposta do LogTo e cria a sessão
    await handleSignIn(logtoConfig, searchParams)

    // Após o sign-in, pega os dados do usuário
    const { claims } = await getLogtoContext(logtoConfig)

    if (claims) {
      // Sincroniza o perfil no Supabase
      await upsertUserProfile({
        id: claims.sub,
        email: claims.email as string,
        full_name: claims.name as string | undefined,
        avatar_url: claims.picture as string | undefined,
      })
    }
    success = true;
  } catch (error) {
    console.error('[LogTo Callback]', error)
  }

  if (success) {
    // Verifica se há um redirect pendente (ex: aceitar convite por token)
    const cookieStore = cookies()
    const postLoginRedirect = cookieStore.get('post_login_redirect')?.value
    if (postLoginRedirect) {
      cookieStore.delete('post_login_redirect')
      redirect(postLoginRedirect)
    }
    redirect('/')
  } else {
    redirect('/login')
  }
}
