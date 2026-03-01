'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react'

interface FormField {
  id: string
  label: string
  type: 'text' | 'textarea' | 'email' | 'number' | 'select' | 'date' | 'checkbox'
  required: boolean
  placeholder?: string
  options?: string[]
  maps_to?: string
}

interface FormData {
  name: string
  description: string | null
  fields: FormField[]
  slug: string
}

export function FormClient({ slug }: { slug: string }) {
  const [form, setForm] = useState<FormData | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [values, setValues] = useState<Record<string, any>>({})

  useEffect(() => {
    fetch(`/api/forms/${slug}`)
      .then(res => {
        if (!res.ok) throw new Error('Formulário não encontrado')
        return res.json()
      })
      .then(data => {
        setForm(data)
        // Initialize values
        const init: Record<string, any> = {}
        for (const f of data.fields) {
          init[f.id] = f.type === 'checkbox' ? false : ''
        }
        setValues(init)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [slug])

  function updateValue(fieldId: string, value: any) {
    setValues(prev => ({ ...prev, [fieldId]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form) return
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch(`/api/forms/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: values }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erro ao enviar formulário')
      }

      setSubmitted(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-zinc-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Carregando formulário...</span>
      </div>
    )
  }

  if (error && !form) {
    return (
      <div className="text-center space-y-3">
        <AlertCircle className="h-12 w-12 text-red-400 mx-auto" />
        <p className="text-zinc-300 text-lg">{error}</p>
        <p className="text-zinc-500 text-sm">Verifique se o link está correto.</p>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="text-center space-y-4 max-w-md">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 mx-auto">
          <CheckCircle2 className="h-8 w-8 text-green-400" />
        </div>
        <h2 className="text-2xl font-bold text-zinc-100">Enviado com sucesso!</h2>
        <p className="text-zinc-400">
          Sua solicitação foi recebida e uma tarefa foi criada automaticamente.
        </p>
        <Button
          onClick={() => {
            setSubmitted(false)
            const init: Record<string, any> = {}
            for (const f of form!.fields) {
              init[f.id] = f.type === 'checkbox' ? false : ''
            }
            setValues(init)
          }}
          variant="outline"
          className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
        >
          Enviar outro
        </Button>
      </div>
    )
  }

  if (!form) return null

  return (
    <div className="w-full max-w-lg">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 shadow-xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-bold text-white mb-4">
            F
          </div>
          <h1 className="text-2xl font-bold text-zinc-100">{form.name}</h1>
          {form.description && (
            <p className="mt-2 text-sm text-zinc-400">{form.description}</p>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {form.fields.map((field) => (
            <div key={field.id} className="space-y-2">
              <Label className="text-zinc-300 text-sm">
                {field.label}
                {field.required && <span className="text-red-400 ml-1">*</span>}
              </Label>

              {field.type === 'textarea' ? (
                <Textarea
                  value={values[field.id] || ''}
                  onChange={e => updateValue(field.id, e.target.value)}
                  required={field.required}
                  placeholder={field.placeholder || ''}
                  className="bg-zinc-950 border-zinc-700 text-zinc-200 placeholder:text-zinc-600 min-h-[100px]"
                />
              ) : field.type === 'select' ? (
                <select
                  value={values[field.id] || ''}
                  onChange={e => updateValue(field.id, e.target.value)}
                  required={field.required}
                  className="flex h-10 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
                >
                  <option value="">Selecione...</option>
                  {field.options?.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : field.type === 'checkbox' ? (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!values[field.id]}
                    onChange={e => updateValue(field.id, e.target.checked)}
                    className="h-4 w-4 rounded border-zinc-600 bg-zinc-950 text-indigo-600"
                  />
                  <span className="text-sm text-zinc-400">{field.placeholder || ''}</span>
                </div>
              ) : (
                <Input
                  type={field.type}
                  value={values[field.id] || ''}
                  onChange={e => updateValue(field.id, e.target.value)}
                  required={field.required}
                  placeholder={field.placeholder || ''}
                  className="bg-zinc-950 border-zinc-700 text-zinc-200 placeholder:text-zinc-600"
                />
              )}
            </div>
          ))}

          {error && (
            <p className="text-sm text-red-400 bg-red-950/30 px-3 py-2 rounded">{error}</p>
          )}

          <Button
            type="submit"
            disabled={submitting}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-11 text-sm font-medium"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              'Enviar'
            )}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-zinc-600">
          Formulário seguro e gerenciado internamente.
        </p>
      </div>
    </div>
  )
}
