import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { MembersClient } from './members-client'

interface PageProps {
  params: { slug: string }
}

export default async function MembersPage({ params }: PageProps) {
  const headersList = headers()
  const userId = headersList.get('x-user-id')

  if (!userId) redirect('/login')

  const db = createServiceClient()

  // Buscar org pelo slug
  const { data: org } = await db
    .from('organizations')
    .select('id, name')
    .eq('slug', params.slug)
    .single()

  if (!org) redirect('/')

  // Verificar acesso e role do usuário
  const { data: currentMember } = await db
    .from('organization_members')
    .select('role')
    .eq('organization_id', org.id)
    .eq('user_id', userId)
    .single()

  if (!currentMember) redirect('/')

  // Buscar todos os membros da org
  const { data: members } = await db
    .from('organization_members')
    .select(`
      user_id,
      role,
      created_at,
      profiles ( id, full_name, email, avatar_url )
    `)
    .eq('organization_id', org.id)
    .order('created_at', { ascending: true })

  const formattedMembers = (members || []).map((m: any) => ({
    userId: m.user_id,
    role: m.role,
    joinedAt: m.created_at,
    displayName: m.profiles?.full_name || m.profiles?.email?.split('@')[0] || 'Sem nome',
    email: m.profiles?.email || '',
    avatarUrl: m.profiles?.avatar_url || null,
  }))

  // Buscar convites pendentes
  const { data: pendingInvites } = await db
    .from('invitations')
    .select('id, email, role, created_at, token')
    .eq('organization_id', org.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  return (
    <div className="flex-1 overflow-hidden flex flex-col pt-6 px-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Membros</h1>
          <p className="text-sm text-zinc-400 mt-1">
            {formattedMembers.length} membro{formattedMembers.length !== 1 ? 's' : ''} · {(pendingInvites || []).length} convite{(pendingInvites || []).length !== 1 ? 's' : ''} pendente{(pendingInvites || []).length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <MembersClient
        members={formattedMembers}
        orgId={org.id}
        currentUserRole={currentMember.role}
        pendingInvites={(pendingInvites || []).map(i => ({
          id: i.id,
          email: i.email,
          role: i.role,
          createdAt: i.created_at,
          token: i.token,
        }))}
      />
    </div>
  )
}
