import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    template: '%s | Sistema Interno',
    default: 'Sistema Interno de Tarefas',
  },
  description: 'Plataforma interna de gestão de entregas e projetos.',
  robots: 'noindex, nofollow', // Sistema interno — não indexar
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
