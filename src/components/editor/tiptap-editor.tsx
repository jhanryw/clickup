'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { useEffect, useCallback, useRef } from 'react'
import {
  Bold, Italic, List, ListOrdered, Heading2, Heading3,
  Quote, Code, Undo, Redo, Minus,
} from 'lucide-react'

interface TipTapEditorProps {
  content: any
  onChange: (content: any) => void
  placeholder?: string
  editable?: boolean
}

export function TipTapEditor({
  content, onChange, placeholder = 'Comece a escrever...', editable = true,
}: TipTapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        bulletList: { keepMarks: true },
        orderedList: { keepMarks: true },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON())
    },
    editorProps: {
      attributes: {
        class: 'prose prose-invert prose-sm max-w-none focus:outline-none min-h-[300px] px-1 py-2',
      },
    },
  })

  useEffect(() => {
    if (editor && !editor.isFocused) {
      editor.commands.setContent(content || { type: 'doc', content: [] })
    }
  }, [content])

  if (!editor) return null

  return (
    <div className="flex flex-col gap-2">
      {editable && (
        <div className="flex flex-wrap gap-0.5 rounded-lg border border-zinc-800 bg-zinc-900 p-1.5">
          <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Negrito">
            <Bold className="h-3.5 w-3.5" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Itálico">
            <Italic className="h-3.5 w-3.5" />
          </ToolBtn>
          <div className="w-px bg-zinc-700 mx-1" />
          <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Título 2">
            <Heading2 className="h-3.5 w-3.5" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Título 3">
            <Heading3 className="h-3.5 w-3.5" />
          </ToolBtn>
          <div className="w-px bg-zinc-700 mx-1" />
          <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Lista">
            <List className="h-3.5 w-3.5" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Lista Numerada">
            <ListOrdered className="h-3.5 w-3.5" />
          </ToolBtn>
          <div className="w-px bg-zinc-700 mx-1" />
          <ToolBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Citação">
            <Quote className="h-3.5 w-3.5" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="Código inline">
            <Code className="h-3.5 w-3.5" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} active={false} title="Separador">
            <Minus className="h-3.5 w-3.5" />
          </ToolBtn>
          <div className="flex-1" />
          <ToolBtn onClick={() => editor.chain().focus().undo().run()} active={false} title="Desfazer">
            <Undo className="h-3.5 w-3.5" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().redo().run()} active={false} title="Refazer">
            <Redo className="h-3.5 w-3.5" />
          </ToolBtn>
        </div>
      )}

      <div className="rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-zinc-200">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

function ToolBtn({ onClick, active, title, children }: {
  onClick: () => void; active: boolean; title: string; children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`flex h-7 w-7 items-center justify-center rounded-md text-xs transition-colors ${
        active
          ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/30'
          : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
      }`}
    >
      {children}
    </button>
  )
}
