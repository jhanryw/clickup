/**
 * Callback route do LogTo — GET /callback
 *
 * Após autenticação bem-sucedida no LogTo, o usuário é redirecionado aqui.
 * Este handler:
 *   1. Valida a resposta do LogTo e cria a sessão
 *   2. Sincroniza o perfil completo no Supabase (id, email, nome, avatar)
 *   3. Redireciona para o dashboard ou para um redirect pós-login (ex: aceitar convite)
 *
 * Extração de e-mail (em ordem de prioridade):
 *   1. claims.email           — escopo OIDC padrão (requer escopo "email")
 *   2. userInfo.email         — retornado pelo /oidc/me quando fetchUserInfo=true
 *   3. claims.username        — se tiver formato de e-mail real (sem @system.local)
 *   4. claims.preferred_username — outro fallback padrão OIDC
 *
 * Emails @system.local são gerados internamente pelo LogTo quando nenhum
 * email real está disponível — são ignorados explicitamente.
 */

import { handleSignIn, getLogtoContext } from '@logto/next/server-actions'
import { redirect }  from 'next/navigation'
import { cookies }   from 'next/headers'
import type { NextRequest } from 'next/server'
import { logtoConfig }       from '@/app/logto'
import { upsertUserProfile } from '@/lib/supabase/server'

/** Domínios gerados internamente pelo LogTo — nunca são emails reais. */
const SYSTEM_EMAIL_DOMAINS = ['@system.local', '@local', '@logto.local']

function isSystemEmail(value: unknown): boolean {
  if (typeof value !== 'string') return false
  const lower = value.toLowerCase()
  return SYSTEM_EMAIL_DOMAINS.some(d => lower.endsWith(d))
}

/**
 * Extrai o e-mail real do usuário a partir das claims OIDC.
 * Rejeita endereços gerados pelo sistema (ex: @system.local).
 */
function extractEmail(
  claims: Record<string, unknown>,
  userInfo?: Record<string, unknown> | null,
): string | undefined {
  const candidates = [
    claims.email,
    userInfo?.email,
    claims.username,
    claims.preferred_username,
  ]
  for (const c of candidates) {
    if (typeof c === 'string' && c.includes('@') && !isSystemEmail(c)) {
      return c.toLowerCase()
    }
  }
  return undefined
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams

  let success = false

  try {
    // 1. Valida a resposta do LogTo e cria/renova a sessão
    await handleSignIn(logtoConfig, searchParams)

    // 2. Lê claims do ID token + dados do /oidc/me (fetchUserInfo: true)
    const context = await getLogtoContext(logtoConfig, { fetchUserInfo: true })
    const { claims, userInfo } = context

    if (claims) {
      const email = extractEmail(
        claims as Record<string, unknown>,
        userInfo as Record<string, unknown> | null | undefined,
      )

      if (!email) {
        console.warn(
          '[Callback] Usuário sem e-mail real disponível (sub=%s). ' +
          'Verifique se o escopo "email" está habilitado no LogTo.',
          claims.sub,
        )
      }

      // 3. Sincroniza/cria o perfil no Supabase
      //    Se o perfil já existia com @system.local, o upsert por `id`
      //    vai atualizar o email para o valor real agora que temos o escopo.
      await upsertUserProfile({
        id:         claims.sub,
        email:      email ?? `${claims.sub}@pending.qarvon.com`,
        full_name:  (claims.name    as string | undefined) ?? null,
        avatar_url: (claims.picture as string | undefined) ?? null,
      })

      // 4. Auto-aceita qualquer convite pendente para este e-mail
      if (email) {
        try {
          const { processInvitations } = await import('@/app/actions/hierarchy')
          await processInvitations(email, claims.sub)
        } catch (inviteErr) {
          // Não-crítico — não bloqueia o login
          console.warn('[Callback] processInvitations falhou:', inviteErr)
        }
      }
    }

    success = true
  } catch (error) {
    console.error('[Callback] Erro ao processar autenticação:', error)
  }

  if (success) {
    // Redireciona para destino salvo em cookie (ex: /accept-invite?token=...)
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
