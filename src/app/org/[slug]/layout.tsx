import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServiceClient, withUserContext } from '@/lib/supabase/server'
import { SignOutButton } from '@/components/auth/sign-out-button'
import { LayoutDashboard, Settings, Users } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { HierarchySection } from '@/components/sidebar/hierarchy-section'
import { WorkspaceProvider } from '@/contexts/workspace-context'

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

    const hierarchy: SpaceHierarchyNode[] = await withUserContext(userId, async (ctxDb) => {
        const { data, error } = await ctxDb.rpc('get_space_hierarchy', {
            p_org_id: org.id,
            p_user_id: userId,
        })
        if (error) {
            console.error("Erro ao buscar hierarquia:", error)
            return []
        }
        return data as SpaceHierarchyNode[]
    })

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
                    <div className="flex items-center gap-3 border-b border-zinc-800/60 px-4 py-3.5 hover:bg-zinc-800/30 cursor-pointer transition-colors">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-xs font-bold text-white shadow-lg shadow-indigo-500/20">
                            {org.name.substring(0, 1).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-zinc-100">{org.name}</p>
                            <p className="text-[11px] text-zinc-500 capitalize">{member.role}</p>
                        </div>
                    </div>

                    {/* Nav Links */}
                    <div className="px-2 pt-3 pb-2 space-y-0.5 border-b border-zinc-800/60">
                        <Link href={`/org/${params.slug}`} className="flex items-center gap-3 rounded-md px-3 py-2 text-[13px] text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100 transition-colors">
                            <LayoutDashboard className="h-4 w-4" />
                            <span>Painel Principal</span>
                        </Link>
                        <Link href={`/org/${params.slug}/members`} className="flex items-center gap-3 rounded-md px-3 py-2 text-[13px] text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100 transition-colors">
                            <Users className="h-4 w-4" />
                            <span>Membros</span>
                        </Link>
                        {(member.role === 'admin' || member.role === 'owner') && (
                            <Link href={`/org/${params.slug}/settings`} className="flex items-center gap-3 rounded-md px-3 py-2 text-[13px] text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100 transition-colors">
                                <Settings className="h-4 w-4" />
                                <span>Configurações</span>
                            </Link>
                        )}
                    </div>

                    {/* Hierarchy */}
                    <ScrollArea className="flex-1">
                        <HierarchySection
                            hierarchy={hierarchy}
                            orgSlug={params.slug}
                            organizationId={org.id}
                        />
                    </ScrollArea>

                    {/* User Footer */}
                    <div className="border-t border-zinc-800/60 px-3 py-3">
                        <div className="flex items-center gap-2.5">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 text-[10px] font-bold text-zinc-300 ring-1 ring-zinc-700">
                                {initials}
                            </div>
                            <p className="text-[13px] font-medium text-zinc-300 truncate flex-1">{displayName}</p>
                        </div>
                        <div className="mt-2.5">
                            <SignOutButton
                                variant="button"
                                className="w-full justify-center text-xs h-8 border-zinc-800 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
                            />
                        </div>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 flex flex-col min-w-0 bg-zinc-950">
                    {children}
                </main>
            </div>
        </WorkspaceProvider>
    )
}
