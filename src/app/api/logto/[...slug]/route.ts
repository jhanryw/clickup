/**
 * Catch-all Route Handler para o LogTo SDK.
 *
 * O SDK do LogTo captura as seguintes rotas:
 *   GET /api/logto/sign-in          → Inicia o fluxo de login
 *   GET /api/logto/sign-out         → Inicia o fluxo de logout
 *   GET /api/logto/sign-in-callback → Callback após autenticação no LogTo
 *
 * NOTA: Este arquivo usa LOGTO_ENDPOINT (URL interna Docker) para
 * comunicação server-to-server com o LogTo. O browser é redirecionado
 * para NEXT_PUBLIC_LOGTO_ENDPOINT (URL pública) pelo próprio SDK.
 */

import { type NextRequest } from 'next/server'
import { getLogtoClient } from '@/lib/logto/server'
import { handlePostLogin } from '@/lib/logto/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string[] } }
) {
  const client = getLogtoClient()
  const slug = params.slug.join('/')

  // O SDK do LogTo lida com o roteamento internamente
  const response = await client.handleAuthRoutes(request)

  // Após o callback de login, sincronizamos o perfil no Supabase
  if (slug === 'sign-in-callback') {
    try {
      await handlePostLogin(request)
    } catch (error) {
      console.error('[LogTo] Falha ao sincronizar perfil pós-login:', error)
      // Não bloqueia o login, apenas loga o erro
    }
  }

  return response
}
