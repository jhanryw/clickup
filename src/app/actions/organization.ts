'use server'

import { headers } from 'next/headers'
import { z } from 'zod'
import { CreateOrganizationSchema } from '@/lib/validators'
import { createServiceClient } from '@/lib/supabase/server'
import { withPermission, requireOrgRole } from '@/lib/permissions'

function getUserId(): string {
  const userId = headers().get('x-user-id')
  if (!userId) throw new Error('Não autenticado')
  return userId
}

/**
 * Cria uma nova organização e define o usuário como owner.
 * Também garante que o perfil do usuário existe antes de criar a membership.
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

    // Garante que o perfil do usuário existe
    const { data: profile, error: profileErr } = await db
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single()

    if (!profile) {
      console.log('[createOrganization] Criando perfil para userId:', userId)
      const { error: upsertErr } = await db
        .from('profiles')
        .upsert(
          {
            id: userId,
            email: `user_${userId}@system.local`,
            full_name: 'New User',
          },
          { onConflict: 'id' }
        )

      if (upsertErr) {
        console.error('[createOrganization] Erro ao criar perfil:', upsertErr)
        return { error: 'Erro ao configurar seu perfil. Tente fazer login novamente.' }
      }
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
      console.error('[createOrganization] Erro ao criar org:', orgErr)
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
      return { error: memberErr.message || 'Erro ao configurar permissões. Tente novamente.' }
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

/** Renomeia a organização (admin ou owner) */
export async function renameOrganization(orgId: string, name: string) {
  return withPermission(async () => {
    const userId = getUserId()
    if (!name?.trim() || name.trim().length < 2) throw new Error('Nome deve ter ao menos 2 caracteres.')

    await requireOrgRole(userId, orgId, 'admin')

    const db = createServiceClient()
    const { error } = await db
      .from('organizations')
      .update({ name: name.trim() })
      .eq('id', orgId)

    if (error) throw new Error(error.message)
    return { success: true }
  })
}

/** Apaga a organização e todos os dados (owner only) */
export async function deleteOrganization(orgId: string) {
  return withPermission(async () => {
    const userId = getUserId()

    await requireOrgRole(userId, orgId, 'owner')

    const db = createServiceClient()
    const { error } = await db.from('organizations').delete().eq('id', orgId)
    if (error) throw new Error(error.message)
    return { success: true }
  })
}
