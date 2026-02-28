/**
 * Configuração do LogTo — Fonte única de verdade.
 *
 * Lido a partir de variáveis de ambiente para funcionar
 * tanto em desenvolvimento (localhost) quanto em produção (Easypanel).
 *
 * IMPORTANTE: Configure as Redirect URIs no Console do LogTo:
 *   - Redirect URI: {NEXTAUTH_URL}/app/callback
 *   - Post sign-out: {NEXTAUTH_URL}/login
 */

import type { LogtoNextConfig } from '@logto/next'

export const logtoConfig: LogtoNextConfig = {
  endpoint: process.env.NEXT_PUBLIC_LOGTO_ENDPOINT ?? 'https://clickup-logto.vodct5.easypanel.host/',
  appId: process.env.NEXT_PUBLIC_LOGTO_APP_ID ?? 'vh99mdgamkufoptzjrccj',
  appSecret: process.env.LOGTO_APP_SECRET ?? '',
  baseUrl: process.env.NEXTAUTH_URL ?? 'http://localhost:3000',
  cookieSecret: process.env.LOGTO_COOKIE_SECRET ?? '',
  cookieSecure: process.env.NODE_ENV === 'production',
}
