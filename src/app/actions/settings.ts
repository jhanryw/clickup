'use server'

import { headers } from 'next/headers'
import { z } from 'zod'
import { CreateWebhookSchema, CreateFormSchema } from '@/lib/validators'
import { requireOrgRole, withPermission } from '@/lib/permissions'
import { createServiceClient } from '@/lib/supabase/server'

function getUserId(): string {
  const userId = headers().get('x-user-id')
  if (!userId) throw new Error('Não autenticado')
  return userId
}

// ─── WEBHOOKS ─────────────────────────────────────────────────────────

export async function createWebhook(input: z.infer<typeof CreateWebhookSchema>) {
  return withPermission(async () => {
    const userId = getUserId()
    const parsed = CreateWebhookSchema.parse(input)

    await requireOrgRole(userId, parsed.organization_id, 'admin')

    const db = createServiceClient()
    const { data, error } = await db
      .from('webhooks')
      .insert({
        organization_id: parsed.organization_id,
        name: parsed.name,
        url: parsed.url,
        secret: parsed.secret || null,
        events: parsed.events,
        is_active: true,
      })
      .select('id, name')
      .single()

    if (error) throw new Error(error.message)
    return data!
  })
}

export async function toggleWebhook(webhookId: string, orgId: string, isActive: boolean) {
  return withPermission(async () => {
    const userId = getUserId()
    await requireOrgRole(userId, orgId, 'admin')

    const db = createServiceClient()
    const { error } = await db
      .from('webhooks')
      .update({ is_active: isActive })
      .eq('id', webhookId)
      .eq('organization_id', orgId)

    if (error) throw new Error(error.message)
    return { success: true }
  })
}

export async function deleteWebhook(webhookId: string, orgId: string) {
  return withPermission(async () => {
    const userId = getUserId()
    await requireOrgRole(userId, orgId, 'admin')

    const db = createServiceClient()
    const { error } = await db
      .from('webhooks')
      .delete()
      .eq('id', webhookId)
      .eq('organization_id', orgId)

    if (error) throw new Error(error.message)
    return { success: true }
  })
}

// ─── FORMS ────────────────────────────────────────────────────────────

export async function createForm(input: z.infer<typeof CreateFormSchema> & { organization_id: string }) {
  return withPermission(async () => {
    const userId = getUserId()
    const { organization_id, ...formData } = input
    const parsed = CreateFormSchema.parse(formData)

    await requireOrgRole(userId, organization_id, 'admin')

    const db = createServiceClient()

    // Verifica slug único
    const { data: existing } = await db
      .from('forms')
      .select('id')
      .eq('slug', parsed.slug)
      .single()

    if (existing) throw new Error('Esse slug de formulário já está em uso.')

    const { data, error } = await db
      .from('forms')
      .insert({
        organization_id,
        list_id: parsed.list_id,
        name: parsed.name,
        description: parsed.description || null,
        slug: parsed.slug,
        fields: parsed.fields,
        is_active: true,
        created_by: userId,
      })
      .select('id, name, slug')
      .single()

    if (error) throw new Error(error.message)
    return data!
  })
}

export async function toggleForm(formId: string, orgId: string, isActive: boolean) {
  return withPermission(async () => {
    const userId = getUserId()
    await requireOrgRole(userId, orgId, 'admin')

    const db = createServiceClient()
    const { error } = await db
      .from('forms')
      .update({ is_active: isActive })
      .eq('id', formId)
      .eq('organization_id', orgId)

    if (error) throw new Error(error.message)
    return { success: true }
  })
}

export async function deleteForm(formId: string, orgId: string) {
  return withPermission(async () => {
    const userId = getUserId()
    await requireOrgRole(userId, orgId, 'admin')

    const db = createServiceClient()
    const { error } = await db
      .from('forms')
      .delete()
      .eq('id', formId)
      .eq('organization_id', orgId)

    if (error) throw new Error(error.message)
    return { success: true }
  })
}
