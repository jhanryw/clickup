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
  const userEmail = headersList.get('x-user-email')

  if (!userId) redirect('/login')

  const db = createServiceClient()

  // Busca perfil e orgs
  const [{ data: profile }, { data }] = await Promise.all([
    db.from('profiles').select('full_name').eq('id', userId).single(),
    db
      .from('organization_members')
      .select('organizations(slug)')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(1)
      .single(),
  ])

  const organizations = data?.organizations as unknown as { slug: string } | { slug: string }[] | null
  const orgSlug = Array.isArray(organizations) ? organizations[0]?.slug : organizations?.slug

  if (orgSlug) {
    redirect(`/org/${orgSlug}`)
  }

  // Saudação dinâmica
  const hour = new Date().getUTCHours()
  let greeting = 'Bom dia'
  if (hour >= 12 && hour < 18) greeting = 'Boa tarde'
  else if (hour >= 18 || hour < 5) greeting = 'Boa noite'

  const displayName = profile?.full_name ?? userEmail ?? 'Usuário'
  const firstName = displayName.split(' ')[0]

  const stats = [
    { label: 'Tarefas totais', value: '0', color: 'text-blue-500', bg: 'bg-blue-50', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
    { label: 'Em progresso', value: '0', color: 'text-purple-500', bg: 'bg-purple-50', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    { label: 'Concluídas', value: '0', color: 'text-emerald-500', bg: 'bg-emerald-50', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
    { label: 'Atrasadas', value: '0', color: 'text-amber-500', bg: 'bg-amber-50', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
  ]

  return (
    <div className="min-h-full p-8">
      {/* Saudação */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">
          {greeting}, {firstName}! 👋
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Aqui está o resumo das suas atividades
        </p>
      </div>

      {/* Stats Cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-border/60 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="mt-1 text-2xl font-bold text-foreground">
                  {stat.value}
                </p>
              </div>
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.bg}`}>
                <svg className={`h-5 w-5 ${stat.color}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d={stat.icon} />
                </svg>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Card sem organização */}
      <div className="rounded-xl border border-border/60 bg-white p-8 shadow-sm">
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-purple-50">
            <svg className="h-7 w-7 text-purple-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-foreground">
            Nenhuma organização encontrada
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Você ainda não pertence a nenhuma organização.
            Aguarde um administrador te convidar para começar a gerenciar tarefas.
          </p>
        </div>
      </div>
    </div>
  )
}
