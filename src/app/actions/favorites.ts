'use server'

import { headers } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'
import { withPermission } from '@/lib/permissions'

function getUserId(): string {
  const userId = headers().get('x-user-id')
  if (!userId) throw new Error('Não autenticado')
  return userId
}

/** Retorna todos os favoritos do usuário atual */
export async function getFavorites() {
  return withPermission(async () => {
    const userId = getUserId()
    const db = createServiceClient()

    const { data, error } = await db
      .from('user_favorites')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    return data ?? []
  })
}

/** Alterna o favorito de uma entidade (space | folder | list).
 *  Retorna { favorited: true } se foi adicionado, { favorited: false } se removido. */
export async function toggleFavorite(
  entityType: 'space' | 'folder' | 'list',
  entityId: string,
  entityName: string,
  entityColor?: string | null,
) {
  return withPermission(async () => {
    const userId = getUserId()
    const db = createServiceClient()

    const { data: existing } = await db
      .from('user_favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .maybeSingle()

    if (existing) {
      await db.from('user_favorites').delete().eq('id', existing.id)
      return { favorited: false }
    }

    await db.from('user_favorites').insert({
      user_id: userId,
      entity_type: entityType,
      entity_id: entityId,
      entity_name: entityName,
      entity_color: entityColor ?? null,
    })

    return { favorited: true }
  })
}

/** Remove um favorito diretamente pelo id (usado no painel de Favoritos) */
export async function removeFavorite(favoriteId: string) {
  return withPermission(async () => {
    const userId = getUserId()
    const db = createServiceClient()

    const { error } = await db
      .from('user_favorites')
      .delete()
      .eq('id', favoriteId)
      .eq('user_id', userId) // segurança: só o próprio usuário

    if (error) throw new Error(error.message)
    return { success: true }
  })
}
