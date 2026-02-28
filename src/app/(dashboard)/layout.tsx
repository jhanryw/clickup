/**
 * Layout do Dashboard — Server Component.
 * Sidebar escura estilo ClickUp + área de conteúdo principal.
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
      .from('organization_members')
      .select('organizations(*)')
      .eq('user_id', userId),
  ])

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

  if (!userId) {
    redirect('/login')
  }

  const { profile, organizations } = await getUserData(userId)
  const displayName = profile?.full_name ?? userEmail ?? 'Usuário'
  const initials = displayName.charAt(0).toUpperCase()

  const orgColors = [
    'from-blue-400 to-blue-600',
    'from-emerald-400 to-emerald-600',
    'from-amber-400 to-amber-600',
    'from-rose-400 to-rose-600',
    'from-cyan-400 to-cyan-600',
  ]

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar escura */}
      <aside className="flex w-64 flex-col bg-[hsl(252,47%,14%)] text-slate-200">
        {/* Header do usuário */}
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-400 to-purple-600 text-sm font-bold text-white shadow-sm">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">
              {displayName}
            </p>
            <p className="truncate text-xs text-slate-400">
              {userEmail}
            </p>
          </div>
        </div>

        {/* Link Início */}
        <div className="px-3 pt-4 pb-2">
          <a
            href="/"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/[0.08] hover:text-white transition-colors"
          >
            <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z" />
            </svg>
            <span>Início</span>
          </a>
        </div>

        {/* Organizações */}
        <div className="px-3 pt-2">
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Organizações
          </p>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-3">
          {organizations.length === 0 ? (
            <p className="px-3 py-2 text-xs text-slate-500">
              Nenhuma organização encontrada.
            </p>
          ) : (
            <ul className="space-y-0.5">
              {organizations.map((org, index) => (
                <li key={org.id}>
                  <a
                    href={`/org/${org.slug}`}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/[0.08] hover:text-white transition-colors"
                  >
                    {org.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={org.logo_url} alt="" className="h-5 w-5 rounded" />
                    ) : (
                      <span className={`flex h-5 w-5 items-center justify-center rounded bg-gradient-to-br ${orgColors[index % orgColors.length]} text-[10px] font-bold text-white`}>
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

        {/* Footer */}
        <div className="border-t border-white/10 px-3 py-3">
          <SignOutButton
            variant="link"
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-white/[0.08] hover:text-white transition-colors"
          />
        </div>
      </aside>

      {/* Conteúdo */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
