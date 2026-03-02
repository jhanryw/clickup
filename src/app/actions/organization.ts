'use server'

import { headers } from 'next/headers'
import { z } from 'zod'
import { CreateOrganizationSchema } from '@/lib/validators'
import { createServiceClient } from '@/lib/supabase/server'

function getUserId(): string {
  const userId = headers().get('x-user-id')
  if (!userId) throw new Error('Não autenticado')
  return userId
}

/**
 * Cria uma nova organização e define o usuário como owner.
 * Também cria os custom_statuses padrão e vincula ao banco.
 */
export async function createOrganization(input: z.infer<typeof CreateOrganizationSchema>) {
  try {
    const userId = getUserId()
    const parsed = CreateOrganizationSchema.parse(input)
    const db = createServiceClient()

    // Verifica se slug já existe
    const { data: existing } = await db
      .from('organizations')
      .select('id')
      .eq('slug', parsed.slug)
      .single()

    if (existing) {
      return { error: 'Esse slug já está em uso. Escolha outro.' }
    }

    // Cria a organização
    const { data: org, error: orgErr } = await db
      .from('organizations')
      .insert({
        name: parsed.name,
        slug: parsed.slug,
        logo_url: parsed.logo_url || null,
      })
      .select('id, slug')
      .single()

    if (orgErr || !org) {
      console.error('[createOrganization] Erro:', orgErr)
      return { error: orgErr?.message || 'Erro ao criar organização' }
    }

    // Adiciona o criador como owner
    const { error: memberErr } = await db
      .from('organization_members')
      .insert({
        organization_id: org.id,
        user_id: userId,
        role: 'owner',
      })

    if (memberErr) {
      console.error('[createOrganization] Erro ao adicionar membro:', memberErr)
      // Cleanup: remove org se membership falhar
      await db.from('organizations').delete().eq('id', org.id)
      return { error: 'Erro ao configurar permissões. Tente novamente.' }
    }

    return { id: org.id, slug: org.slug }
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return { error: err.errors[0].message }
    }
    console.error('[createOrganization] Exceção:', err)
    return { error: err.message || 'Erro interno' }
  }
}
