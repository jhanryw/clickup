/**
 * Helpers server-side para LogTo.
 *
 * Todas as funções aqui são SERVER-ONLY:
 *  - Validação de JWT
 *  - Extração de claims
 *  - Sincronização de perfil no Supabase
 *
 * Importe este arquivo APENAS em Server Components, Server Actions e middleware.
 */

import { getLogtoContext } from '@logto/next/server-actions'
import { getLogtoConfig } from './config'
import { upsertUserProfile } from '@/lib/supabase/server'
import type { UserContext } from '@/types/database'

/**
 * Pega o contexto do usuário autenticado.
 * Retorna null se não autenticado.
 *
 * USO em Server Components, Server Actions e API Routes.
 */
export async function getAuthUser(): Promise<UserContext | null> {
  try {
    const config = getLogtoConfig()
    const { isAuthenticated, claims } = await getLogtoContext(config)

    if (!isAuthenticated || !claims) return null

    // O LogTo retorna roles no campo 'roles' dos custom data ou no JWT
    const logtoRoles: string[] = (claims as Record<string, unknown>)['roles'] as string[] ?? []

    return {
      id: claims.sub,
      email: (claims.email as string) ?? '',
      name: (claims.name as string | undefined) ?? null,
      avatar: (claims.picture as string | undefined) ?? null,
      logto_roles: logtoRoles,
      org_role: null, // Preenchido ao buscar o contexto da organização
    }
  } catch (error) {
    console.error('[getAuthUser Error]', error)
    return null
  }
}

/**
 * Após o callback de login do LogTo, sincroniza o perfil no Supabase
 * e retorna o UserContext completo.
 */
export async function handlePostLogin(): Promise<UserContext | null> {
  const user = await getAuthUser()
  if (!user) return null

  // Sincroniza perfil no Supabase (upsert)
  await upsertUserProfile({
    id: user.id,
    email: user.email,
    full_name: user.name,
    avatar_url: user.avatar,
    logto_roles: user.logto_roles,
  })

  return user
}

/**
 * Verifica se o usuário tem um role específico do LogTo.
 *
 * @example
 * const isAdmin = hasLogtoRole(user, 'system:admin')
 */
export function hasLogtoRole(
  user: UserContext,
  role: string
): boolean {
  return user.logto_roles.includes(role)
}

/**
 * Gera a URL de sign-in do LogTo.
 * Usa NEXT_PUBLIC_LOGTO_ENDPOINT para redirecionar o browser à UI de login.
 */
export function getSignInUrl(redirectUri?: string): string {
  const baseUrl = process.env.NEXTAUTH_URL ?? ''
  const callbackUrl = redirectUri ?? `${baseUrl}/api/logto/sign-in-callback`
  return `${baseUrl}/api/logto/sign-in?redirectUri=${encodeURIComponent(callbackUrl)}`
}

/**
 * Gera a URL de sign-out do LogTo.
 */
export function getSignOutUrl(): string {
  const baseUrl = process.env.NEXTAUTH_URL ?? ''
  return `${baseUrl}/api/logto/sign-out`
}
