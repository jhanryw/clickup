/**
 * Configuração do LogTo.
 *
 * IMPORTANTE: Você precisa configurar as Redirect URIs no Console do LogTo:
 *
 * 1. No Console LogTo:
 *    - Vá em Applications > seu app > Redirect URIs
 *    - Adicione: http://localhost:3000/app/callback (desenvolvimento)
 *    - Adicione: https://seu-dominio.com/app/callback (produção)
 *
 * 2. Post Sign-out Redirect URI:
 *    - Vá em Applications > seu app > Post sign-out redirect URIs
 *    - Adicione: http://localhost:3000/login (desenvolvimento)
 *    - Adicione: https://seu-dominio.com/login (produção)
 *
 * 3. Clique em "Save changes"
 */

export const logtoConfig = {
  endpoint: 'https://clickup-logto.vodct5.easypanel.host/',
  appId: 'vh99mdgamkufoptzjrccj',
  appSecret: '91VIel4wR718XwE4bZwDaCnxCBhFktws',
  baseUrl: 'http://localhost:3000', // Mude para URL pública em produção
  cookieSecret: '7qnnCvzP47AskCTfnLs7cWoC6LuL5axl',
  cookieSecure: process.env.NODE_ENV === 'production',
} as const
