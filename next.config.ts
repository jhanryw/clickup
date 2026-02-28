import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Garante que variáveis SERVER-ONLY não vão para o bundle do cliente
  // (Next.js já protege isso, mas tornamos explícito)
  experimental: {
    // Turbopack otimizações (habilitado via --turbo no script dev)
    typedRoutes: true,
  },

  images: {
    remotePatterns: [
      {
        // Supabase Storage (URL pública para imagens/avatares)
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        // LogTo avatares
        protocol: 'https',
        hostname: 'gravatar.com',
      },
    ],
  },

  // Headers de segurança
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
      {
        // API Routes públicas de webhook de entrada
        source: '/api/webhooks/incoming/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'POST, OPTIONS' },
        ],
      },
      {
        // Formulários públicos (API de submissão)
        source: '/api/forms/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'POST, OPTIONS' },
        ],
      },
    ]
  },
}

export default nextConfig
