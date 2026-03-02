'use client'

import { useState, useTransition, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Loader2, Check } from 'lucide-react'
import { TipTapEditor } from '@/components/editor/tiptap-editor'
import { updateDocument } from '@/app/actions/documents'

interface DocEditorProps {
  docId: string
  orgSlug: string
  initialTitle: string
  initialContent: any
  canEdit: boolean
  updatedAt: string
}

export function DocEditor({ docId, orgSlug, initialTitle, initialContent, canEdit, updatedAt }: DocEditorProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [title, setTitle] = useState(initialTitle)
  const [content, setContent] = useState(initialContent)
  const [saved, setSaved] = useState(false)
  const saveTimer = useRef<NodeJS.Timeout | null>(null)

  // Auto-save com debounce de 1.5s
  const triggerSave = useCallback((newTitle: string, newContent: any) => {
    if (!canEdit) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      startTransition(async () => {
        await updateDocument(docId, { title: newTitle, content: newContent })
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      })
    }, 1500)
  }, [docId, canEdit])

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setTitle(e.target.value)
    triggerSave(e.target.value, content)
  }

  function handleContentChange(newContent: any) {
    setContent(newContent)
    triggerSave(title, newContent)
  }

  function handleManualSave() {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    startTransition(async () => {
      await updateDocument(docId, { title, content })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      router.refresh()
    })
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-zinc-950">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href={`/org/${orgSlug}/docs`}
            className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Documentos
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {saved && (
            <span className="flex items-center gap-1.5 text-xs text-green-400">
              <Check className="h-3.5 w-3.5" /> Salvo
            </span>
          )}
          {isPending && (
            <span className="flex items-center gap-1.5 text-xs text-zinc-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Salvando...
            </span>
          )}
          {canEdit && (
            <button
              onClick={handleManualSave}
              disabled={isPending}
              className="flex items-center gap-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 text-xs text-white transition-colors disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              Salvar
            </button>
          )}
        </div>
      </div>

      {/* Document Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-8 py-10">
          {/* Title */}
          {canEdit ? (
            <input
              value={title}
              onChange={handleTitleChange}
              placeholder="Título do documento..."
              className="w-full bg-transparent text-3xl font-bold text-zinc-100 placeholder:text-zinc-700 outline-none mb-8 border-none"
            />
          ) : (
            <h1 className="text-3xl font-bold text-zinc-100 mb-8">{title}</h1>
          )}

          {/* Last saved */}
          <p className="text-xs text-zinc-600 mb-6">
            Última edição: {new Date(updatedAt).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </p>

          {/* Editor */}
          <TipTapEditor
            content={content}
            onChange={handleContentChange}
            editable={canEdit}
            placeholder="Comece a escrever o conteúdo do documento..."
          />
        </div>
      </div>
    </div>
  )
}
