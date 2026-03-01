import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { SettingsClient } from './settings-client'

interface PageProps {
  params: { slug: string }
}

export default async function SettingsPage({ params }: PageProps) {
  const headersList = headers()
  const userId = headersList.get('x-user-id')

  if (!userId) redirect('/login')

  const db = createServiceClient()

  const { data: org } = await db
    .from('organizations')
    .select('id, name, slug, logo_url')
    .eq('slug', params.slug)
    .single()

  if (!org) redirect('/')

  const { data: member } = await db
    .from('organization_members')
    .select('role')
    .eq('organization_id', org.id)
    .eq('user_id', userId)
    .single()

  if (!member || (member.role !== 'admin' && member.role !== 'owner')) {
    redirect(`/org/${params.slug}`)
  }

  // Buscar webhooks
  const { data: webhooks } = await db
    .from('webhooks')
    .select('id, name, url, events, is_active, created_at')
    .eq('organization_id', org.id)
    .order('created_at', { ascending: false })

  // Buscar forms
  const { data: forms } = await db
    .from('forms')
    .select('id, name, slug, is_active, list_id, created_at')
    .eq('organization_id', org.id)
    .order('created_at', { ascending: false })

  return (
    <div className="flex-1 overflow-y-auto pt-6 px-8 pb-12">
      <div className="max-w-3xl">
        <h1 className="text-2xl font-bold text-zinc-100 mb-2">Configurações</h1>
        <p className="text-sm text-zinc-400 mb-8">
          Gerencie webhooks, formulários públicos e configurações da organização.
        </p>

        <SettingsClient
          orgId={org.id}
          orgSlug={params.slug}
          webhooks={webhooks || []}
          forms={forms || []}
        />
      </div>
    </div>
  )
}
