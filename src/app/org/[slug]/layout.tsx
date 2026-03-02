import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServiceClient, withUserContext } from '@/lib/supabase/server'
import { LayoutDashboard, Settings, Users, FileText } from 'lucide-react'
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
                    <OrgHeader
                        orgId={org.id}
                        orgName={org.name}
                        orgSlug={params.slug}
                        userRole={member.role}
                    />

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
                        <Link href={`/org/${params.slug}/docs`} className="flex items-center gap-3 rounded-md px-3 py-2 text-[13px] text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100 transition-colors">
                            <FileText className="h-4 w-4" />
                            <span>Documentos</span>
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
