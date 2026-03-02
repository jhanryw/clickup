import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { CreateOrganizationDialog } from '@/components/dialogs/create-organization-dialog'
import { Building2 } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Dashboard — Qarvon',
}

export default async function DashboardPage() {
  const headersList = headers()
  const userId = headersList.get('x-user-id')
  const userEmail = headersList.get('x-user-email')

  if (!userId) redirect('/login')

  const db = createServiceClient()

  // Busca perfil e orgs do usuário
  const [{ data: profile }, { data: memberships }] = await Promise.all([
    db.from('profiles').select('full_name').eq('id', userId).single(),
    db
      .from('organization_members')
      .select('organization_id, role, organizations ( id, name, slug, logo_url )')
      .eq('user_id', userId)
      .order('created_at', { ascending: true }),
  ])

  // Se tem org, redireciona para a primeira
  if (memberships && memberships.length > 0) {
    const firstOrg = memberships[0].organizations as any
    if (firstOrg?.slug) {
      redirect(`/org/${firstOrg.slug}`)
    }
  }

  // Sem orgs — mostrar tela de criação
  const hour = new Date().getUTCHours()
  let greeting = 'Bom dia'
  if (hour >= 12 && hour < 18) greeting = 'Boa tarde'
  else if (hour >= 18 || hour < 5) greeting = 'Boa noite'

  const displayName = profile?.full_name ?? userEmail?.split('@')[0] ?? 'Usuário'

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="text-center mb-10">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 mx-auto mb-6 shadow-lg shadow-indigo-500/20">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-100">
            {greeting}, {displayName}! 👋
          </h1>
          <p className="mt-2 text-sm text-zinc-500 max-w-sm mx-auto">
            Crie sua primeira organização para começar a gerenciar projetos, tarefas e equipes.
          </p>
        </div>

        {/* Create Organization Card */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
          <h2 className="text-lg font-semibold text-zinc-200 mb-2">
            Comece agora
          </h2>
          <p className="text-sm text-zinc-500 mb-6">
            Uma organização é o container principal. Dentro dela você cria espaços, pastas, listas e tarefas.
          </p>

          <CreateOrganizationDialog />

          <p className="text-xs text-zinc-600 mt-4">
            Você será automaticamente adicionado como <span className="text-zinc-400 font-medium">Owner</span>
          </p>
        </div>
      </div>
    </div>
  )
}
