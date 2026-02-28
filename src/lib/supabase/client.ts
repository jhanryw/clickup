/**
 * Cliente Supabase para uso CLIENT-SIDE.
 *
 * SEGURANÇA:
 *  - Usa apenas NEXT_PUBLIC_SUPABASE_ANON_KEY (pode ser exposta)
 *  - Usa NEXT_PUBLIC_SUPABASE_URL (URL pública HTTPS)
 *  - Com RLS habilitado, o anon key tem acesso muito limitado
 *  - Use para: Realtime subscriptions e leituras simples em Client Components
 *
 * IMPORTANTE: Todas as mutations DEVEM passar por Server Actions.
 * Este cliente é principalmente para Realtime (ex: live updates de tasks).
 */

'use client'

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY são obrigatórias. ' +
    'Configure no .env.local.'
  )
}

// Singleton para evitar múltiplas instâncias
let clientInstance: ReturnType<typeof createClient> | null = null

export function getSupabaseBrowserClient() {
  if (!clientInstance) {
    clientInstance = createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: false, // Autenticação gerenciada pelo LogTo, não pelo Supabase
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  }
  return clientInstance
}

/**
 * Hook de Realtime para tasks de uma lista.
 * Exemplo de uso:
 *
 * const channel = subscribeToListTasks(listId, (payload) => {
 *   // Atualiza o estado local com o payload
 * })
 * // Cleanup:
 * channel.unsubscribe()
 */
export function subscribeToListTasks(
  listId: string,
  onEvent: (payload: { eventType: 'INSERT' | 'UPDATE' | 'DELETE'; new: unknown; old: unknown }) => void
) {
  const supabase = getSupabaseBrowserClient()

  return supabase
    .channel(`list-tasks-${listId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'tasks',
        filter: `list_id=eq.${listId}`,
      },
      (payload) => onEvent(payload as Parameters<typeof onEvent>[0])
    )
    .subscribe()
}
