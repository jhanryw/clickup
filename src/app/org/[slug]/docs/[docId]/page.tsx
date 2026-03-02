import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { DocEditor } from './doc-editor'

interface PageProps {
  params: { slug: string; docId: string }
}

export default async function DocPage({ params }: PageProps) {
  const headersList = headers()
  const userId = headersList.get('x-user-id')
  if (!userId) redirect('/login')

  const db = createServiceClient()

  const { data: org } = await db
    .from('organizations')
    .select('id')
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

  const { data: doc } = await db
    .from('documents')
    .select('id, title, content, created_at, updated_at')
    .eq('id', params.docId)
    .eq('organization_id', org.id)
    .single()

  if (!doc) redirect(`/org/${params.slug}/docs`)

  const canEdit = ['owner', 'admin', 'member'].includes(member.role)

  return (
    <DocEditor
      docId={doc.id}
      orgSlug={params.slug}
      initialTitle={doc.title}
      initialContent={doc.content}
      canEdit={canEdit}
      updatedAt={doc.updated_at}
    />
  )
}
