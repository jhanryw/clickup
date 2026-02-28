/**
 * Next.js Middleware — Proteção de rotas via LogTo.
 *
 * Fluxo:
 *  1. Request chega
 *  2. Middleware verifica autenticação usando LogTo
 *  3. Não autenticado → redireciona para /login
 *  4. Autenticado → adiciona headers com user context para Server Components
 *
 * Rotas públicas (não protegidas):
 *  - /login
 *  - /app/callback (callback do LogTo)
 *  - /f/* (formulários públicos)
 *  - /api/forms/* (API de submissão de formulários)
 *  - /api/webhooks/incoming/* (endpoint de webhook de entrada)
 */

import { type NextRequest, NextResponse } from 'next/server'
import { getLogtoContext } from '@logto/next/server-actions'
import { logtoConfig } from '@/app/logto'

// Rotas que não precisam de autenticação
const PUBLIC_ROUTES = [
  '/login',
  '/app/callback',     // Callback do LogTo
  '/f/',               // Formulários públicos
  '/api/forms',        // API pública de submissão
  '/api/webhooks/incoming', // Webhook de entrada
]

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname.startsWith(route))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rotas públicas passam direto
  if (isPublicRoute(pathname)) {
    return NextResponse.next()
  }

  try {
    const { isAuthenticated, claims } = await getLogtoContext(logtoConfig)

    if (!isAuthenticated) {
      // Redireciona para login
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Adiciona headers com dados do usuário para Server Components
    const response = NextResponse.next()

    if (claims) {
      response.headers.set('x-user-id', claims.sub)
      response.headers.set('x-user-email', (claims.email as string) ?? '')
    }

    return response
  } catch (error) {
    // Em caso de erro na validação (token expirado, etc.), redireciona para login
    console.error('[Middleware] Erro ao verificar autenticação:', error)
    return NextResponse.redirect(new URL('/login', request.url))
  }
}

export const config = {
  matcher: [
    /*
     * Aplica o middleware em todas as rotas EXCETO:
     * - _next/static (assets estáticos)
     * - _next/image (otimização de imagem)
     * - favicon.ico
     * - Arquivos com extensões (imagens, fontes, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
}
