import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import { DocsClient } from './docs-client'

interface PageProps {
  params: { slug: string }
}

export default async function DocsPage({ params }: PageProps) {
  const headersList = headers()
  const userId = headersList.get('x-user-id')
  if (!userId) redirect('/login')

  const db = createServiceClient()

  const { data: org } = await db
    .from('organizations')
    .select('id, name')
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

  const { data: docs } = await db
    .from('documents')
    .select('id, title, folder_id, created_at, updated_at')
    .eq('organization_id', org.id)
    .order('updated_at', { ascending: false })

  // Busca nomes de folders para exibição
  const { data: folders } = await db
    .from('folders')
    .select('id, name')

  const folderMap = Object.fromEntries((folders || []).map(f => [f.id, f.name]))

  return (
    <div className="flex-1 overflow-y-auto pt-6 px-8 pb-12">
      <div className="max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">Documentos</h1>
            <p className="text-sm text-zinc-400 mt-1">
              {(docs || []).length} documento{(docs || []).length !== 1 ? 's' : ''} na organização
            </p>
          </div>
        </div>

        <DocsClient
          orgId={org.id}
          orgSlug={params.slug}
          docs={(docs || []).map(d => ({
            ...d,
            folderName: d.folder_id ? folderMap[d.folder_id] || 'Sem pasta' : null,
          }))}
          userRole={member.role}
        />
      </div>
    </div>
  )
}
