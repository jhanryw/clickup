'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createOrganization } from '@/app/actions/organization'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Building2, Loader2 } from 'lucide-react'

interface CreateOrganizationDialogProps {
  trigger?: React.ReactNode
}

export function CreateOrganizationDialog({ trigger }: CreateOrganizationDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const router = useRouter()

  function generateSlug(text: string) {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50)
  }

  function handleNameChange(value: string) {
    setName(value)
    setSlug(generateSlug(value))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const result = await createOrganization({
        name: name.trim(),
        slug: slug.trim(),
      })

      if ('error' in result && result.error) {
        setError(result.error)
      } else if ('slug' in result && result.slug) {
        setOpen(false)
        router.push(`/org/${result.slug}`)
        router.refresh()
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao criar organização')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
            <Plus className="h-4 w-4" />
            Criar Organização
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5 text-indigo-400" />
            Nova Organização
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          <div className="space-y-2">
            <Label htmlFor="org-name" className="text-zinc-300">Nome da Organização *</Label>
            <Input
              id="org-name"
              value={name}
              onChange={e => handleNameChange(e.target.value)}
              required
              minLength={2}
              placeholder="Ex: Qarvon, Minha Empresa..."
              className="bg-zinc-950 border-zinc-700 text-zinc-200 placeholder:text-zinc-600 h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="org-slug" className="text-zinc-300">Slug (URL)</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-500 whitespace-nowrap">/org/</span>
              <Input
                id="org-slug"
                value={slug}
                onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                required
                minLength={2}
                pattern="^[a-z0-9-]+$"
                placeholder="minha-empresa"
                className="bg-zinc-950 border-zinc-700 text-zinc-200 placeholder:text-zinc-600"
              />
            </div>
            <p className="text-[11px] text-zinc-600">
              Apenas letras minúsculas, números e hífens
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-950/30 px-3 py-2 rounded-md">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || !name.trim() || !slug.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[140px]"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                'Criar Organização'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
