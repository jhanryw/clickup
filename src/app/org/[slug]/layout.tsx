import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServiceClient, withUserContext } from '@/lib/supabase/server'
import { SignOutButton } from '@/components/auth/sign-out-button'
import { LayoutDashboard, Settings, Users } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { HierarchySection } from '@/components/sidebar/hierarchy-section'

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

    // Buscar org pelo slug
    const { data: org } = await db
        .from('organizations')
        .select('id, name, logo_url')
        .eq('slug', params.slug)
        .single()

    if (!org) {
        redirect('/')
    }

    // Verifica acesso
    const { data: member } = await db
        .from('organization_members')
        .select('role')
        .eq('organization_id', org.id)
        .eq('user_id', userId)
        .single()

    if (!member) {
        redirect('/')
    }

    // Buscar a hierarquia usando o contexto de usuário e a função RPC
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
        <div className="flex h-screen overflow-hidden bg-zinc-950 text-zinc-100 dark">
            {/* Sidebar escura - Estilo Clickup */}
            <aside className="flex w-64 flex-col border-r border-zinc-800 bg-zinc-900">

                {/* Header Org */}
                <div className="flex items-center gap-3 border-b border-zinc-800 px-4 py-4 hover:bg-zinc-800/50 cursor-pointer transition-colors">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-gradient-to-br from-indigo-500 to-purple-600 text-xs font-bold text-white shadow-sm">
                        {org.name.substring(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-zinc-100">
                            {org.name}
                        </p>
                        <p className="text-xs text-zinc-400 capitalize">{member.role}</p>
                    </div>
                </div>

                {/* Links principais */}
                <div className="px-3 pt-4 pb-2 space-y-1 border-b border-zinc-800">
                    <Link href={`/org/${params.slug}`} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors">
                        <LayoutDashboard className="h-4 w-4 text-zinc-400" />
                        <span>Painel Principal</span>
                    </Link>
                    <Link href={`/org/${params.slug}/members`} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors">
                        <Users className="h-4 w-4 text-zinc-400" />
                        <span>Membros</span>
                    </Link>
                    {member.role === 'admin' || member.role === 'owner' ? (
                        <Link href={`/org/${params.slug}/settings`} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors">
                            <Settings className="h-4 w-4 text-zinc-400" />
                            <span>Configurações</span>
                        </Link>
                    ) : null}
                </div>

                {/* Hierarquia Interativa */}
                <ScrollArea className="flex-1">
                    <HierarchySection
                        hierarchy={hierarchy}
                        orgSlug={params.slug}
                        organizationId={org.id}
                    />
                </ScrollArea>

                {/* Footer do Usuário logado */}
                <div className="border-t border-zinc-800 p-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-xs font-medium text-white">
                            {initials}
                        </div>
                        <div className="flex-1 truncate">
                            <p className="text-sm font-medium text-zinc-200 truncate">{displayName}</p>
                        </div>
                    </div>

                    <div className="mt-4">
                        <SignOutButton
                            variant="button"
                            className="w-full justify-center border-zinc-700 hover:bg-zinc-800 text-zinc-300 transition-colors"
                        />
                    </div>
                </div>
            </aside>

            {/* Conteúdo Principal */}
            <main className="flex-1 flex flex-col min-w-0 bg-zinc-950">
                {children}
            </main>
        </div>
    )
}
