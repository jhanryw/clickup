'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Layers, Trash2, Plus, GripVertical, X } from 'lucide-react'
import {
  getCustomFields, createCustomField, deleteCustomField,
} from '@/app/actions/custom-fields'

interface ListFieldsDialogProps {
  listId: string
  open: boolean
  onClose: () => void
}

type FieldType =
  | 'text' | 'number' | 'date' | 'select' | 'multiselect'
  | 'checkbox' | 'url' | 'email' | 'phone'

const FIELD_TYPES: { value: FieldType; label: string; icon: string }[] = [
  { value: 'text',        label: 'Texto',         icon: 'T'  },
  { value: 'number',      label: 'Número',         icon: '#'  },
  { value: 'date',        label: 'Data',           icon: '📅' },
  { value: 'select',      label: 'Seleção única',  icon: '⊙'  },
  { value: 'multiselect', label: 'Multi-seleção',  icon: '☰'  },
  { value: 'checkbox',    label: 'Checkbox',       icon: '☑'  },
  { value: 'url',         label: 'URL',            icon: '🔗' },
  { value: 'email',       label: 'E-mail',         icon: '@'  },
  { value: 'phone',       label: 'Telefone',       icon: '☎'  },
]

const TYPE_LABELS: Record<FieldType, string> = Object.fromEntries(
  FIELD_TYPES.map((t) => [t.value, t.label])
) as Record<FieldType, string>

const PRESET_COLORS = [
  '#6366f1','#8b5cf6','#ec4899','#ef4444',
  '#f97316','#eab308','#22c55e','#14b8a6','#3b82f6',
]

/** Linha de opção de select */
function SelectOptionRow({
  opt, onChange, onRemove,
}: {
  opt: { value: string; label: string; color: string }
  onChange: (o: typeof opt) => void
  onRemove: () => void
}) {
  return (
    <div className="flex items-center gap-2">
      <GripVertical className="h-3.5 w-3.5 text-zinc-600 shrink-0" />
      {/* cor */}
      <div className="relative shrink-0">
        <div
          className="h-5 w-5 rounded-full cursor-pointer border border-zinc-700"
          style={{ backgroundColor: opt.color }}
          onClick={() => {
            const idx = PRESET_COLORS.indexOf(opt.color)
            onChange({ ...opt, color: PRESET_COLORS[(idx + 1) % PRESET_COLORS.length] })
          }}
          title="Clique para mudar a cor"
        />
      </div>
      <input
        value={opt.label}
        onChange={(e) => onChange({ ...opt, label: e.target.value, value: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
        placeholder="Nome da opção"
        className="flex-1 h-7 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200 placeholder:text-zinc-600"
      />
      <button onClick={onRemove} className="text-zinc-600 hover:text-red-400 shrink-0">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

export function ListFieldsDialog({ listId, open, onClose }: ListFieldsDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Campos existentes
  const [fields, setFields] = useState<any[]>([])
  const [loadingFields, setLoadingFields] = useState(false)

  // Form de criação
  const [newName, setNewName]   = useState('')
  const [newType, setNewType]   = useState<FieldType>('text')
  const [isRequired, setIsRequired] = useState(false)
  const [selectOpts, setSelectOpts] = useState<{ value: string; label: string; color: string }[]>([])
  const [formError, setFormError]   = useState<string | null>(null)

  // Carregar campos ao abrir
  useEffect(() => {
    if (!open) return
    setLoadingFields(true)
    getCustomFields(listId)
      .then((r) => { if (r.data) setFields(r.data as any[]) })
      .catch(() => {})
      .finally(() => setLoadingFields(false))
  }, [open, listId])

  function handleAddOpt() {
    setSelectOpts((p) => [
      ...p,
      { value: `opcao_${p.length + 1}`, label: `Opção ${p.length + 1}`, color: PRESET_COLORS[p.length % PRESET_COLORS.length] },
    ])
  }

  function handleCreate() {
    if (!newName.trim()) { setFormError('Nome é obrigatório'); return }
    if ((newType === 'select' || newType === 'multiselect') && selectOpts.length === 0) {
      setFormError('Adicione ao menos uma opção'); return
    }
    setFormError(null)

    startTransition(async () => {
      const r = await createCustomField({
        listId,
        name: newName.trim(),
        type: newType,
        options: (newType === 'select' || newType === 'multiselect') ? selectOpts : [],
        isRequired,
      })

      if (r.error) { setFormError(r.error as string); return }

      // Refresh list
      const r2 = await getCustomFields(listId)
      if (r2.data) setFields(r2.data as any[])

      setNewName('')
      setNewType('text')
      setIsRequired(false)
      setSelectOpts([])
      router.refresh()
    })
  }

  function handleDelete(fieldId: string) {
    startTransition(async () => {
      await deleteCustomField(fieldId)
      setFields((p) => p.filter((f) => f.id !== fieldId))
      router.refresh()
    })
  }

  const needsOptions = newType === 'select' || newType === 'multiselect'

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <Layers className="h-4 w-4 text-indigo-400" />
            Campos Personalizados
          </DialogTitle>
          <DialogDescription className="text-zinc-500 text-xs">
            Campos extras vinculados a todas as tarefas desta lista.
          </DialogDescription>
        </DialogHeader>

        {/* Campos existentes */}
        <div className="space-y-2">
          {loadingFields ? (
            <p className="text-xs text-zinc-600 py-4 text-center">Carregando...</p>
          ) : fields.length === 0 ? (
            <p className="text-xs text-zinc-600 py-4 text-center">Nenhum campo ainda.</p>
          ) : (
            fields.map((f) => (
              <div
                key={f.id}
                className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5"
              >
                <span className="text-[10px] font-bold text-zinc-500 w-5 text-center uppercase shrink-0">
                  {FIELD_TYPES.find((t) => t.value === f.type)?.icon ?? 'T'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-200 font-medium truncate">{f.name}</p>
                  <p className="text-[10px] text-zinc-500">
                    {TYPE_LABELS[f.type as FieldType] ?? f.type}
                    {f.is_required && ' · Obrigatório'}
                    {(f.options?.length ?? 0) > 0 && ` · ${f.options.length} opções`}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(f.id)}
                  disabled={isPending}
                  className="text-zinc-600 hover:text-red-400 transition-colors shrink-0"
                  title="Excluir campo"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Separador */}
        <div className="border-t border-zinc-800 pt-4">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">
            Novo Campo
          </p>

          <div className="space-y-3">
            {/* Nome + Tipo */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-400">Nome</Label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="ex: Telefone, Empresa..."
                  className="bg-zinc-950 border-zinc-700 text-zinc-200 text-sm h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-400">Tipo</Label>
                <Select value={newType} onValueChange={(v) => { setNewType(v as FieldType); setSelectOpts([]) }}>
                  <SelectTrigger className="bg-zinc-950 border-zinc-700 text-zinc-200 h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
                    {FIELD_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value} className="text-zinc-200 focus:bg-zinc-800 text-sm">
                        <span className="flex items-center gap-2">
                          <span className="text-zinc-500 w-4 text-center text-[11px]">{t.icon}</span>
                          {t.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Obrigatório */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isRequired}
                onChange={(e) => setIsRequired(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-600 bg-zinc-950 text-indigo-600"
              />
              <span className="text-xs text-zinc-400">Campo obrigatório</span>
            </label>

            {/* Opções para select/multiselect */}
            {needsOptions && (
              <div className="space-y-2">
                <Label className="text-xs text-zinc-400">Opções</Label>
                {selectOpts.map((opt, i) => (
                  <SelectOptionRow
                    key={i}
                    opt={opt}
                    onChange={(o) => setSelectOpts((p) => p.map((x, idx) => idx === i ? o : x))}
                    onRemove={() => setSelectOpts((p) => p.filter((_, idx) => idx !== i))}
                  />
                ))}
                <button
                  type="button"
                  onClick={handleAddOpt}
                  className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 mt-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Adicionar opção
                </button>
              </div>
            )}

            {formError && (
              <p className="text-xs text-red-400 bg-red-950/30 px-3 py-2 rounded">{formError}</p>
            )}

            <Button
              onClick={handleCreate}
              disabled={isPending || !newName.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-9"
            >
              {isPending ? 'Criando...' : 'Criar Campo'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
