/**
 * Página raiz do dashboard.
 * Redireciona para a primeira organização do usuário
 * ou mostra tela de boas-vindas se não houver nenhuma.
 */

import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Dashboard',
}

export default async function DashboardPage() {
  const headersList = headers()
  const userId = headersList.get('x-user-id')

  if (!userId) redirect('/login')

  const db = createServiceClient()

  // Busca a primeira org do usuário para redirecionar
  const { data } = await db
    .from('organization_members')
    .select('organizations(slug)')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  const orgSlug = (data?.organizations as { slug: string } | null)?.slug

  if (orgSlug) {
    redirect(`/org/${orgSlug}`)
  }

  // Se não tem org, mostra tela de criação
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 p-8">
      <div className="text-center">
        <h2 className="text-xl font-semibold">Bem-vindo ao Sistema de Tarefas</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Você ainda não pertence a nenhuma organização.
          Aguarde um administrador te convidar.
        </p>
      </div>
    </div>
  )
}
