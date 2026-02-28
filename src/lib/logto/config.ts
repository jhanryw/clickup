/**
 * Configuração do LogTo.
 *
 * URLS IMPORTANTES (Docker / Easypanel):
 *
 * Server-side (LOGTO_ENDPOINT):
 *   → URL interna do Docker: http://logto:3001
 *   → Usada para validar JWTs sem sair da rede interna
 *
 * Client-side (NEXT_PUBLIC_LOGTO_ENDPOINT):
 *   → URL pública HTTPS: https://auth.seu-dominio.com
 *   → Usada no browser para redirecionar ao login
 *
 * Este arquivo é importado apenas em server code (middleware, server actions).
 * O LOGTO_APP_SECRET nunca é exposto ao cliente.
 */

import { type LogtoNextConfig } from '@logto/next'

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(
      `Variável de ambiente obrigatória "${name}" não encontrada. ` +
      'Configure no .env.local.'
    )
  }
  return value
}

export function getLogtoConfig(): LogtoNextConfig {
  return {
    // URL interna Docker para server-side (evita round-trip pela internet)
    endpoint: requireEnv('LOGTO_ENDPOINT'),

    // App ID é público (mesmo valor que NEXT_PUBLIC_LOGTO_APP_ID)
    appId: requireEnv('NEXT_PUBLIC_LOGTO_APP_ID'),

    // App Secret é SERVER-ONLY — nunca exposto ao cliente
    appSecret: requireEnv('LOGTO_APP_SECRET'),

    // URL base da aplicação Next.js (para callbacks)
    baseUrl: requireEnv('NEXTAUTH_URL'),

    // Secret para assinar cookies de sessão (mín. 32 caracteres)
    cookieSecret: requireEnv('LOGTO_COOKIE_SECRET'),

    cookieSecure: process.env.NODE_ENV === 'production',

    // Recursos de API registrados no LogTo para incluir no access token
    resources: [requireEnv('LOGTO_API_RESOURCE')],

    // Scopes necessários
    scopes: [
      'openid',
      'profile',
      'email',
      'offline_access', // para refresh token
      'roles',          // para receber roles do LogTo no token
    ],
  }
}

// Roles LogTo esperados no sistema
export const LOGTO_ROLES = {
  ORG_ADMIN: 'org:admin',
  ORG_MEMBER: 'org:member',
  SYSTEM_ADMIN: 'system:admin',
} as const

export type LogtoRole = (typeof LOGTO_ROLES)[keyof typeof LOGTO_ROLES]
