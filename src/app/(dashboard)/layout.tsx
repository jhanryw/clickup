/**
 * Layout do Dashboard — Server Component.
 *
 * Lê o usuário dos headers injetados pelo middleware (x-user-id, x-user-email).
 * Não faz chamada ao LogTo novamente — dados já foram validados no middleware.
 */

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { SignOutButton } from '@/components/auth/sign-out-button'
import type { Profile, Organization } from '@/types/database'

async function getUserData(userId: string): Promise<{
  profile: Profile | null
  organizations: Organization[]
}> {
  const db = createServiceClient()

  const [profileResult, orgsResult] = await Promise.all([
    db.from('profiles').select('*').eq('id', userId).single(),
    db
      .from('organizations')
      .select('organizations(*)')
      .eq('organization_members.user_id', userId)
      // Usa join via organization_members
      .then(() =>
        db
          .from('organization_members')
          .select('organizations(*)')
          .eq('user_id', userId)
      ),
  ])

  // Extrai orgs do resultado do join
  const orgs = orgsResult.data
    ?.map((row: Record<string, unknown>) => row.organizations as Organization)
    .filter(Boolean) ?? []

  return {
    profile: profileResult.data as Profile | null,
    organizations: orgs,
  }
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const headersList = headers()
  const userId = headersList.get('x-user-id')
  const userEmail = headersList.get('x-user-email')

  // Middleware já garante autenticação, mas defensivamente verificamos
  if (!userId) {
    redirect('/login')
  }

  const { profile, organizations } = await getUserData(userId)

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar — passamos dados como props para um Client Component futuramente */}
      <aside className="flex w-64 flex-col border-r border-border bg-card">
        {/* Header do usuário */}
        <div className="flex items-center gap-3 border-b border-border p-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
            {(profile?.full_name ?? userEmail ?? 'U').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {profile?.full_name ?? userEmail ?? 'Usuário'}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {userEmail}
            </p>
          </div>
        </div>

        {/* Navegação de Organizações */}
        <nav className="flex-1 overflow-y-auto p-3">
          {organizations.length === 0 ? (
            <p className="px-2 py-1 text-xs text-muted-foreground">
              Nenhuma organização encontrada.
            </p>
          ) : (
            <ul className="space-y-1">
              {organizations.map((org) => (
                <li key={org.id}>
                  <a
                    href={`/org/${org.slug}`}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    {org.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={org.logo_url} alt="" className="h-4 w-4 rounded" />
                    ) : (
                      <span className="flex h-4 w-4 items-center justify-center rounded bg-primary/10 text-[10px] font-bold text-primary">
                        {org.name.charAt(0)}
                      </span>
                    )}
                    <span className="truncate">{org.name}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </nav>

        {/* Footer da sidebar */}
        <div className="border-t border-border p-3">
          <SignOutButton variant="link" className="w-full text-left" />
        </div>
      </aside>

      {/* Conteúdo principal */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
