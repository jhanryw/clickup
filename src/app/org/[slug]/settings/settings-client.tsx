'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Webhook as WebhookIcon,
  FileText,
  ExternalLink,
  Copy,
  Check,
  Plus,
  Trash2,
  Power,
  PowerOff,
  Loader2,
} from 'lucide-react'
import {
  createWebhook,
  toggleWebhook,
  deleteWebhook,
  createForm,
  toggleForm,
  deleteForm,
} from '@/app/actions/settings'

// ─── Types ────────────────────────────────────────────────────────────

interface WebhookData {
  id: string
  name: string
  url: string
  events: string[]
  is_active: boolean
  created_at: string
}

interface FormData {
  id: string
  name: string
  slug: string
  is_active: boolean
  list_id: string
  created_at: string
}

interface ListOption {
  id: string
  name: string
}

interface SettingsClientProps {
  orgId: string
  orgSlug: string
  webhooks: WebhookData[]
  forms: FormData[]
  lists: ListOption[]
}

const WEBHOOK_EVENTS = [
  { value: 'task.created', label: 'Tarefa Criada' },
  { value: 'task.updated', label: 'Tarefa Atualizada' },
  { value: 'task.completed', label: 'Tarefa Concluída' },
  { value: 'task.deleted', label: 'Tarefa Removida' },
  { value: 'form.submitted', label: 'Formulário Enviado' },
]

// ─── Component ────────────────────────────────────────────────────────

export function SettingsClient({ orgId, orgSlug, webhooks, forms, lists }: SettingsClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Webhook dialog state
  const [showWebhookDialog, setShowWebhookDialog] = useState(false)
  const [webhookName, setWebhookName] = useState('')
  const [webhookUrl, setWebhookUrl] = useState('')
  const [webhookSecret, setWebhookSecret] = useState('')
  const [webhookEvents, setWebhookEvents] = useState<string[]>([])

  // Form dialog state
  const [showFormDialog, setShowFormDialog] = useState(false)
  const [formName, setFormName] = useState('')
  const [formSlug, setFormSlug] = useState('')
  const [formListId, setFormListId] = useState('')

  function copyFormUrl(slug: string) {
    const url = `${window.location.origin}/f/${slug}`
    navigator.clipboard.writeText(url)
    setCopiedSlug(slug)
    setTimeout(() => setCopiedSlug(null), 2000)
  }

  function generateSlug(name: string) {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  function toggleEvent(event: string) {
    setWebhookEvents(prev =>
      prev.includes(event) ? prev.filter(e => e !== event) : [...prev, event]
    )
  }

  // ── Webhook Actions ─────────────────────────

  async function handleCreateWebhook() {
    if (!webhookName || !webhookUrl || webhookEvents.length === 0) {
      setError('Preencha nome, URL e selecione ao menos um evento.')
      return
    }

    setError(null)
    startTransition(async () => {
      const result = await createWebhook({
        organization_id: orgId,
        name: webhookName,
        url: webhookUrl,
        secret: webhookSecret || undefined,
        events: webhookEvents as Array<'task.created' | 'task.updated' | 'task.completed' | 'task.deleted' | 'form.submitted'>,
      })

      if (result.error) {
        setError(result.error)
      } else {
        setShowWebhookDialog(false)
        resetWebhookForm()
        router.refresh()
      }
    })
  }

  function resetWebhookForm() {
    setWebhookName('')
    setWebhookUrl('')
    setWebhookSecret('')
    setWebhookEvents([])
    setError(null)
  }

  async function handleToggleWebhook(id: string, currentActive: boolean) {
    startTransition(async () => {
      await toggleWebhook(id, orgId, !currentActive)
      router.refresh()
    })
  }

  async function handleDeleteWebhook(id: string) {
    startTransition(async () => {
      await deleteWebhook(id, orgId)
      router.refresh()
    })
  }

  // ── Form Actions ────────────────────────────

  async function handleCreateForm() {
    if (!formName || !formSlug || !formListId) {
      setError('Preencha nome, slug e selecione uma lista.')
      return
    }

    setError(null)
    startTransition(async () => {
      const result = await createForm({
        organization_id: orgId,
        list_id: formListId,
        name: formName,
        slug: formSlug,
        fields: [
          {
            id: crypto.randomUUID(),
            label: 'Título',
            type: 'text',
            required: true,
            maps_to: 'title',
          },
          {
            id: crypto.randomUUID(),
            label: 'Descrição',
            type: 'textarea',
            required: false,
            maps_to: 'description',
          },
        ],
      })

      if (result.error) {
        setError(result.error)
      } else {
        setShowFormDialog(false)
        resetFormForm()
        router.refresh()
      }
    })
  }

  function resetFormForm() {
    setFormName('')
    setFormSlug('')
    setFormListId('')
    setError(null)
  }

  async function handleToggleForm(id: string, currentActive: boolean) {
    startTransition(async () => {
      await toggleForm(id, orgId, !currentActive)
      router.refresh()
    })
  }

  async function handleDeleteForm(id: string) {
    startTransition(async () => {
      await deleteForm(id, orgId)
      router.refresh()
    })
  }

  return (
    <div className="space-y-10">
      {/* ═══════════════ WEBHOOKS ═══════════════ */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <WebhookIcon className="h-5 w-5 text-indigo-400" />
            <h2 className="text-lg font-semibold text-zinc-100">Webhooks de Saída</h2>
          </div>
          <Button
            size="sm"
            onClick={() => { resetWebhookForm(); setShowWebhookDialog(true) }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Novo Webhook
          </Button>
        </div>

        {webhooks.length === 0 ? (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6 text-center">
            <WebhookIcon className="h-8 w-8 text-zinc-600 mx-auto mb-3" />
            <p className="text-sm text-zinc-400">Nenhum webhook configurado.</p>
            <p className="text-xs text-zinc-600 mt-1">
              Clique em &ldquo;Novo Webhook&rdquo; para disparar notificações quando tarefas forem atualizadas.
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
                  <button
                    onClick={() => handleToggleWebhook(wh.id, wh.is_active)}
                    disabled={isPending}
                    className="p-1.5 rounded-md hover:bg-zinc-800 transition-colors disabled:opacity-50"
                    title={wh.is_active ? 'Desativar' : 'Ativar'}
                  >
                    {wh.is_active ? (
                      <Power className="h-4 w-4 text-green-400" />
                    ) : (
                      <PowerOff className="h-4 w-4 text-zinc-600" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDeleteWebhook(wh.id)}
                    disabled={isPending}
                    className="p-1.5 rounded-md hover:bg-red-950/50 transition-colors disabled:opacity-50"
                    title="Excluir webhook"
                  >
                    <Trash2 className="h-4 w-4 text-zinc-500 hover:text-red-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ═══════════════ FORMS ═══════════════ */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-zinc-100">Formulários Públicos</h2>
          </div>
          <Button
            size="sm"
            onClick={() => { resetFormForm(); setShowFormDialog(true) }}
            className="bg-purple-600 hover:bg-purple-700 text-white gap-1.5"
            disabled={lists.length === 0}
            title={lists.length === 0 ? 'Crie uma lista primeiro' : ''}
          >
            <Plus className="h-4 w-4" />
            Novo Formulário
          </Button>
        </div>

        {lists.length === 0 && forms.length === 0 && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6 text-center">
            <FileText className="h-8 w-8 text-zinc-600 mx-auto mb-3" />
            <p className="text-sm text-zinc-400">Crie ao menos uma Lista para poder criar formulários.</p>
            <p className="text-xs text-zinc-600 mt-1">
              Formulários enviam dados diretamente para uma lista como novas tarefas.
            </p>
          </div>
        )}

        {lists.length > 0 && forms.length === 0 && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6 text-center">
            <FileText className="h-8 w-8 text-zinc-600 mx-auto mb-3" />
            <p className="text-sm text-zinc-400">Nenhum formulário criado.</p>
            <p className="text-xs text-zinc-600 mt-1">
              Clique em &ldquo;Novo Formulário&rdquo; para criar um formulário público que gera tarefas automaticamente.
            </p>
          </div>
        )}

        {forms.length > 0 && (
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
                  <button
                    onClick={() => handleToggleForm(form.id, form.is_active)}
                    disabled={isPending}
                    className="p-1.5 rounded-md hover:bg-zinc-800 transition-colors disabled:opacity-50"
                    title={form.is_active ? 'Desativar' : 'Ativar'}
                  >
                    {form.is_active ? (
                      <Power className="h-4 w-4 text-green-400" />
                    ) : (
                      <PowerOff className="h-4 w-4 text-zinc-600" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDeleteForm(form.id)}
                    disabled={isPending}
                    className="p-1.5 rounded-md hover:bg-red-950/50 transition-colors disabled:opacity-50"
                    title="Excluir formulário"
                  >
                    <Trash2 className="h-4 w-4 text-zinc-500 hover:text-red-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ═══════════════ INCOMING WEBHOOK ═══════════════ */}
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

      {/* ═══════════════ CREATE WEBHOOK DIALOG ═══════════════ */}
      <Dialog open={showWebhookDialog} onOpenChange={(open) => { setShowWebhookDialog(open); if (!open) resetWebhookForm() }}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">Novo Webhook de Saída</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Configure uma URL para receber notificações de eventos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {error && (
              <div className="rounded-md bg-red-950/50 border border-red-500/30 px-3 py-2 text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-zinc-300">Nome</Label>
              <Input
                placeholder="Ex: Notificações Slack"
                value={webhookName}
                onChange={e => setWebhookName(e.target.value)}
                className="bg-zinc-950 border-zinc-700 text-zinc-100 placeholder:text-zinc-600"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-300">URL de destino</Label>
              <Input
                placeholder="https://exemplo.com/webhook"
                value={webhookUrl}
                onChange={e => setWebhookUrl(e.target.value)}
                className="bg-zinc-950 border-zinc-700 text-zinc-100 placeholder:text-zinc-600"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-300">Secret (opcional)</Label>
              <Input
                placeholder="Um token secreto para validar requests"
                value={webhookSecret}
                onChange={e => setWebhookSecret(e.target.value)}
                className="bg-zinc-950 border-zinc-700 text-zinc-100 placeholder:text-zinc-600"
              />
              <p className="text-xs text-zinc-600">Enviado no header X-Webhook-Secret.</p>
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-300">Eventos</Label>
              <div className="flex flex-wrap gap-2">
                {WEBHOOK_EVENTS.map(evt => (
                  <button
                    key={evt.value}
                    onClick={() => toggleEvent(evt.value)}
                    className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                      webhookEvents.includes(evt.value)
                        ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300'
                        : 'border-zinc-700 bg-zinc-950 text-zinc-400 hover:border-zinc-600'
                    }`}
                  >
                    {evt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setShowWebhookDialog(false)}
              className="text-zinc-400 hover:text-zinc-200"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateWebhook}
              disabled={isPending}
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Criar Webhook
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════ CREATE FORM DIALOG ═══════════════ */}
      <Dialog open={showFormDialog} onOpenChange={(open) => { setShowFormDialog(open); if (!open) resetFormForm() }}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">Novo Formulário Público</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Crie um formulário que gera tarefas automaticamente em uma lista.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {error && (
              <div className="rounded-md bg-red-950/50 border border-red-500/30 px-3 py-2 text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-zinc-300">Nome do Formulário</Label>
              <Input
                placeholder="Ex: Formulário de Leads"
                value={formName}
                onChange={e => {
                  setFormName(e.target.value)
                  setFormSlug(generateSlug(e.target.value))
                }}
                className="bg-zinc-950 border-zinc-700 text-zinc-100 placeholder:text-zinc-600"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-300">Slug (URL pública)</Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">/f/</span>
                <Input
                  placeholder="formulario-leads"
                  value={formSlug}
                  onChange={e => setFormSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  className="bg-zinc-950 border-zinc-700 text-zinc-100 placeholder:text-zinc-600"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-300">Lista de destino</Label>
              <select
                value={formListId}
                onChange={e => setFormListId(e.target.value)}
                className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                <option value="" className="text-zinc-500">Selecione uma lista...</option>
                {lists.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
              <p className="text-xs text-zinc-600">
                Tarefas criadas pelo formulário irão para esta lista.
              </p>
            </div>

            <div className="rounded-md bg-zinc-950/50 border border-zinc-800 p-3">
              <p className="text-xs text-zinc-500">
                O formulário será criado com campos padrão (Título e Descrição).
                Campos adicionais podem ser configurados depois.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setShowFormDialog(false)}
              className="text-zinc-400 hover:text-zinc-200"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateForm}
              disabled={isPending}
              className="bg-purple-600 hover:bg-purple-700 text-white gap-1.5"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Criar Formulário
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
