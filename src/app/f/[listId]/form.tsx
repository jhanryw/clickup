"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CheckCircle2, Loader2 } from 'lucide-react'

export function PublicTaskForm({ listId }: { listId: string }) {
    const [isLoading, setIsLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setIsLoading(true)
        setError(null)

        const formData = new FormData(e.currentTarget)
        const data = {
            title: formData.get('title') as string,
            description: formData.get('description') as string,
            email: formData.get('email') as string,
            list_id: listId
        }

        try {
            const res = await fetch('/api/forms/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            })

            const json = await res.json()

            if (!res.ok) throw new Error(json.error || 'Erro ao criar solicitação')
            setSuccess(true)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setIsLoading(false)
        }
    }

    if (success) {
        return (
            <div className="flex flex-col items-center justify-center py-10 text-center animate-in fade-in zoom-in duration-500">
                <div className="h-16 w-16 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle2 className="h-8 w-8" />
                </div>
                <h2 className="text-xl font-semibold text-zinc-100">Registrado com Sucesso!</h2>
                <p className="text-zinc-400 mt-2 text-sm">
                    Sua solicitação foi enviada e a tarefa criada na lista.
                </p>
                <Button
                    className="mt-6 bg-zinc-800 text-white hover:bg-zinc-700"
                    onClick={() => setSuccess(false)}
                >
                    Fazer nova solicitação
                </Button>
            </div>
        )
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="email" className="text-zinc-300">Seu E-mail</Label>
                <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    placeholder="email@empresa.com"
                    className="bg-zinc-950 border-zinc-700 focus-visible:ring-indigo-500 text-zinc-100"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="title" className="text-zinc-300">O que você precisa?</Label>
                <Input
                    id="title"
                    name="title"
                    required
                    placeholder="Título breve"
                    className="bg-zinc-950 border-zinc-700 focus-visible:ring-indigo-500 text-zinc-100"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="description" className="text-zinc-300">Detalhes adicionais</Label>
                <Textarea
                    id="description"
                    name="description"
                    required
                    placeholder="Descreva o máximo de detalhes possível..."
                    className="bg-zinc-950 border-zinc-700 focus-visible:ring-indigo-500 text-zinc-100 resize-none h-32"
                />
            </div>

            {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/50 rounded text-red-400 text-sm">
                    {error}
                </div>
            )}

            <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20"
            >
                {isLoading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enviando...
                    </>
                ) : 'Enviar Solicitação'}
            </Button>
        </form>
    )
}
