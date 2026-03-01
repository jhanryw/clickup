'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Webhook as WebhookIcon, FileText, ExternalLink, Copy, Check } from 'lucide-react'

interface WebhookData {
  id: string
  name: string
  url: string
  events: string[]
  is_active: boolean
  created_at: string
}

interface Form {
  id: string
  name: string
  slug: string
  is_active: boolean
  list_id: string
  created_at: string
}

interface SettingsClientProps {
  orgId: string
  orgSlug: string
  webhooks: WebhookData[]
  forms: Form[]
}

export function SettingsClient({ orgId, orgSlug, webhooks, forms }: SettingsClientProps) {
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null)

  function copyFormUrl(slug: string) {
    const url = `${window.location.origin}/f/${slug}`
    navigator.clipboard.writeText(url)
    setCopiedSlug(slug)
    setTimeout(() => setCopiedSlug(null), 2000)
  }

  return (
    <div className="space-y-10">
      {/* Webhooks Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <WebhookIcon className="h-5 w-5 text-indigo-400" />
            <h2 className="text-lg font-semibold text-zinc-100">Webhooks de Saída</h2>
          </div>
          <p className="text-xs text-zinc-500">
            Disparados automaticamente quando tarefas são atualizadas
          </p>
        </div>

        {webhooks.length === 0 ? (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6 text-center">
            <WebhookIcon className="h-8 w-8 text-zinc-600 mx-auto mb-3" />
            <p className="text-sm text-zinc-400">Nenhum webhook configurado.</p>
            <p className="text-xs text-zinc-600 mt-1">
              Webhooks são disparados via trigger no banco (trg_task_webhook).
              Cadastre webhooks diretamente no Supabase.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {webhooks.map(wh => (
              <div
                key={wh.id}
                className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-zinc-200">{wh.name}</p>
                  <p className="text-xs text-zinc-500 truncate">{wh.url}</p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <div className="flex flex-wrap gap-1">
                    {wh.events.map(ev => (
                      <Badge key={ev} variant="outline" className="text-[10px] border-zinc-700 text-zinc-400">
                        {ev}
                      </Badge>
                    ))}
                  </div>
                  <Badge
                    variant="outline"
                    className={wh.is_active
                      ? 'border-green-500/30 text-green-400'
                      : 'border-zinc-700 text-zinc-500'
                    }
                  >
                    {wh.is_active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Forms Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-zinc-100">Formulários Públicos</h2>
          </div>
          <p className="text-xs text-zinc-500">
            Leads/clientes criam tarefas automaticamente
          </p>
        </div>

        {forms.length === 0 ? (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6 text-center">
            <FileText className="h-8 w-8 text-zinc-600 mx-auto mb-3" />
            <p className="text-sm text-zinc-400">Nenhum formulário criado.</p>
            <p className="text-xs text-zinc-600 mt-1">
              Cadastre formulários no Supabase (tabela forms) com campos e mapeamentos.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {forms.map(form => (
              <div
                key={form.id}
                className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-zinc-200">{form.name}</p>
                  <p className="text-xs text-zinc-500">/f/{form.slug}</p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Badge
                    variant="outline"
                    className={form.is_active
                      ? 'border-green-500/30 text-green-400'
                      : 'border-zinc-700 text-zinc-500'
                    }
                  >
                    {form.is_active ? 'Ativo' : 'Inativo'}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyFormUrl(form.slug)}
                    className="text-zinc-400 hover:text-zinc-200"
                  >
                    {copiedSlug === form.slug ? (
                      <Check className="h-4 w-4 text-green-400" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <a
                    href={`/f/${form.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button size="sm" variant="ghost" className="text-zinc-400 hover:text-zinc-200">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Incoming Webhook Info */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <WebhookIcon className="h-5 w-5 text-emerald-400" />
          <h2 className="text-lg font-semibold text-zinc-100">Webhook de Entrada</h2>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5 space-y-3">
          <p className="text-sm text-zinc-300">
            Receba tarefas automaticamente via API externa.
          </p>
          <div className="rounded-md bg-zinc-950 border border-zinc-700 p-3">
            <code className="text-xs text-emerald-400 break-all">
              POST {typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/incoming
            </code>
          </div>
          <div className="text-xs text-zinc-500 space-y-1">
            <p>Header: <code className="text-zinc-400">Authorization: Bearer {'<INCOMING_WEBHOOK_SECRET>'}</code></p>
            <p>Body: <code className="text-zinc-400">{'{ "list_id": "uuid", "title": "...", "description": "...", "priority": "normal" }'}</code></p>
          </div>
        </div>
      </section>
    </div>
  )
}
