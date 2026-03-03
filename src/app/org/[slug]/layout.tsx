import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServiceClient, withUserContext } from '@/lib/supabase/server'
import { LayoutDashboard, Settings, Users, FileText, BarChart2, Star, LayoutList } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { HierarchySection } from '@/components/sidebar/hierarchy-section'
import { WorkspaceProvider } from '@/contexts/workspace-context'
import { processInvitations } from '@/app/actions/hierarchy'
import { OrgHeader } from '@/components/sidebar/org-header'
import { UserFooter } from '@/components/sidebar/user-footer'

interface SpaceHierarchyNode {
    id: string
    name: string
    color: string | null
    icon: string | null
    is_private: boolean
    folders: {
        id: string
        name: string
        color: string | null
        is_private: boolean
        lists: {
            id: string
            name: string
            color: string | null
        }[]
    }[]
    direct_lists: {
        id: string
        name: string
        color: string | null
    }[]
}

export default async function OrgLayout({
    children,
    params,
}: {
    children: React.ReactNode
    params: { slug: string }
}) {
    const headersList = headers()
    const userId = headersList.get('x-user-id')
    const userEmail = headersList.get('x-user-email')

    if (!userId) redirect('/login')

    const db = createServiceClient()

    const { data: org } = await db
        .from('organizations')
        .select('id, name, logo_url')
        .eq('slug', params.slug)
        .single()

    if (!org) redirect('/')

    const { data: member } = await db
        .from('organization_members')
        .select('role')
        .eq('organization_id', org.id)
        .eq('user_id', userId)
        .single()

    if (!member) redirect('/')

    // Processa convites pendentes para o email deste usuário
    if (userEmail) {
        await processInvitations(userEmail, userId).catch(() => {/* silencia erros de invite */})
    }

    // Fetch hierarchy, favorites e pending count em paralelo
    const [hierarchy, favoritesData, pendingCount] = await Promise.all([
        withUserContext(userId, async (ctxDb) => {
            const { data, error } = await ctxDb.rpc('get_space_hierarchy', {
                p_org_id: org.id,
                p_user_id: userId,
            })
            if (error) {
                console.error("Erro ao buscar hierarquia:", error)
                return []
            }
            return data as SpaceHierarchyNode[]
        }),

        // Favoritos do usuário (só tenta se a tabela existir)
        db
            .from('user_favorites')
            .select('entity_type, entity_id, entity_name, entity_color')
            .eq('user_id', userId)
            .then(({ data }) => data ?? [])
            .catch(() => [] as any[]),

        // Convites pendentes (para o badge)
        db
            .from('invitations')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', org.id)
            .eq('status', 'pending')
            .then(({ count }) => count ?? 0)
            .catch(() => 0),
    ])

    // Organizar favoritos em sets por tipo
    const favSets = {
        space:  new Set(favoritesData.filter((f: any) => f.entity_type === 'space').map((f: any) => f.entity_id as string)),
        folder: new Set(favoritesData.filter((f: any) => f.entity_type === 'folder').map((f: any) => f.entity_id as string)),
        list:   new Set(favoritesData.filter((f: any) => f.entity_type === 'list').map((f: any) => f.entity_id as string)),
    }

    // Favoritos do tipo lista com dados para linkagem
    const favLists = favoritesData
        .filter((f: any) => f.entity_type === 'list')
        .map((f: any) => ({ id: f.entity_id as string, name: f.entity_name as string, color: f.entity_color as string | null }))

    const displayName = userEmail?.split('@')[0] || 'User'
    const initials = displayName.substring(0, 2).toUpperCase()

    return (
        <WorkspaceProvider
            initialState={{
                activeListId: null,
                activeListName: null,
                orgId: org.id,
                orgSlug: params.slug,
                orgName: org.name,
                userRole: member.role,
            }}
        >
            <div className="flex h-screen overflow-hidden bg-zinc-950 text-zinc-100 dark">
                {/* Sidebar */}
                <aside className="flex w-[260px] flex-col border-r border-zinc-800/80 bg-[#1a1a22]">

                    {/* Org Header */}
                    <OrgHeader
                        orgId={org.id}
                        orgName={org.name}
                        orgSlug={params.slug}
                        orgLogoUrl={org.logo_url}
                        userRole={member.role}
                    />

                    {/* Nav Links */}
                    <div className="px-2 pt-3 pb-2 space-y-0.5 border-b border-zinc-800/60">
                        <Link href={`/org/${params.slug}`} className="flex items-center gap-3 rounded-md px-3 py-2 text-[13px] text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100 transition-colors">
                            <LayoutDashboard className="h-4 w-4" />
                            <span>Painel Principal</span>
                        </Link>

                        {/* Membros com badge de pendentes */}
                        <Link href={`/org/${params.slug}/members`} className="flex items-center gap-3 rounded-md px-3 py-2 text-[13px] text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100 transition-colors">
                            <Users className="h-4 w-4" />
                            <span className="flex-1">Membros</span>
                            {pendingCount > 0 && (
                                <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-500/20 px-1 text-[10px] font-bold text-amber-400">
                                    {pendingCount}
                                </span>
                            )}
                        </Link>

                        <Link href={`/org/${params.slug}/docs`} className="flex items-center gap-3 rounded-md px-3 py-2 text-[13px] text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100 transition-colors">
                            <FileText className="h-4 w-4" />
                            <span>Documentos</span>
                        </Link>

                        <Link href={`/org/${params.slug}/dashboards`} className="flex items-center gap-3 rounded-md px-3 py-2 text-[13px] text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100 transition-colors">
                            <BarChart2 className="h-4 w-4" />
                            <span>Painéis</span>
                        </Link>

                        {(member.role === 'admin' || member.role === 'owner') && (
                            <Link href={`/org/${params.slug}/settings`} className="flex items-center gap-3 rounded-md px-3 py-2 text-[13px] text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100 transition-colors">
                                <Settings className="h-4 w-4" />
                                <span>Configurações</span>
                            </Link>
                        )}
                    </div>

                    {/* Hierarchy + Favoritos */}
                    <ScrollArea className="flex-1">
                        {/* Favoritos — só exibe se existir ao menos um */}
                        {favLists.length > 0 && (
                            <div className="px-3 pt-4 pb-2">
                                <p className="px-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5 mb-2">
                                    <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                                    Favoritos
                                </p>
                                <div className="space-y-0.5 px-2">
                                    {favLists.map((fav) => (
                                        <Link
                                            key={fav.id}
                                            href={`/org/${params.slug}?listId=${fav.id}`}
                                            className="flex items-center gap-2 rounded-md px-2 py-1 text-[13px] text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
                                        >
                                            <LayoutList
                                                className="h-3 w-3 shrink-0"
                                                style={{ color: fav.color || '#6366f1' }}
                                            />
                                            <span className="truncate">{fav.name}</span>
                                        </Link>
                                    ))}
                                </div>
                                <div className="mt-3 border-t border-zinc-800/60" />
                            </div>
                        )}

                        <HierarchySection
                            hierarchy={hierarchy}
                            orgSlug={params.slug}
                            organizationId={org.id}
                            favorites={favSets}
                        />
                    </ScrollArea>

                    {/* User Footer */}
                    <UserFooter displayName={displayName} initials={initials} />
                </aside>

                {/* Main Content */}
                <main className="flex-1 flex flex-col min-w-0 bg-zinc-950">
                    {children}
                </main>
            </div>
        </WorkspaceProvider>
    )
}
