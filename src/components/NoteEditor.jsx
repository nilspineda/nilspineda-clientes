import { useState, useEffect, useRef, useCallback } from 'react'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import { ListItemNode, ListNode } from '@lexical/list'
import { LinkNode, $createLinkNode } from '@lexical/link'
import { $getRoot, $getSelection, $isRangeSelection, $createParagraphNode, $createTextNode } from 'lexical'
import { Bold, Italic, Underline, Strikethrough, Code, List, ListOrdered, Heading1, Heading2, Quote, Link as LinkIcon, Save } from 'lucide-react'

const theme = {
  paragraph: 'mb-2 leading-relaxed',
  heading: {
    h1: 'text-2xl font-bold mb-4 mt-2',
    h2: 'text-xl font-bold mb-3 mt-2',
    h3: 'text-lg font-semibold mb-2 mt-1',
  },
  list: {
    ul: 'list-disc ml-6 mb-4',
    ol: 'list-decimal ml-6 mb-4',
    listitem: 'mb-1',
  },
  quote: 'border-l-4 border-primary pl-4 italic text-muted-foreground mb-4',
  link: 'text-primary underline hover:text-primary/80',
  text: {
    bold: 'font-bold',
    italic: 'italic',
    underline: 'underline',
    strikethrough: 'line-through',
    code: 'bg-muted px-1 py-0.5 rounded font-mono text-sm',
  },
}

function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext()
  const [active, setActive] = useState({})

  const updateToolbar = useCallback(() => {
    editor.getEditorState().read(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        setActive({
          bold: selection.hasFormat('bold'),
          italic: selection.hasFormat('italic'),
          underline: selection.hasFormat('underline'),
          strikethrough: selection.hasFormat('strikethrough'),
          code: selection.hasFormat('code'),
        })
      }
    })
  }, [editor])

  const toggleFormat = (format) => {
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        selection.formatText(format)
      }
    })
  }

  const toggleHeading = (tag) => {
    editor.update(() => {
      const selection = $getSelection()
      if (!$isRangeSelection(selection)) return
      const anchor = selection.anchor
      const node = anchor.getNode()
      let parent = node
      while (parent && parent.getType() !== 'root' && parent.getType() !== 'heading') {
        parent = parent.getParent()
      }
      if (parent && parent.getType() === 'heading') {
        parent.replace($createParagraphNode())
      } else {
        const heading = $createHeadingNode(tag)
        const text = $createTextNode(selection.getTextContent())
        heading.append(text)
        selection.insertNodes([heading])
      }
    })
  }

  const insertLink = () => {
    const url = prompt('URL:')
    if (!url) return
    editor.update(() => {
      const selection = $getSelection()
      if (!$isRangeSelection(selection)) return
      const text = selection.getTextContent() || url
      const linkNode = $createLinkNode(url)
      const textNode = $createTextNode(text)
      linkNode.append(textNode)
      selection.insertNodes([linkNode])
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-0.5 p-2 border-b border-border/50 bg-muted/30 rounded-t-xl">
      {[
        { icon: Bold, format: 'bold', title: 'Negrita' },
        { icon: Italic, format: 'italic', title: 'Cursiva' },
        { icon: Underline, format: 'underline', title: 'Subrayado' },
        { icon: Strikethrough, format: 'strikethrough', title: 'Tachado' },
        { icon: Code, format: 'code', title: 'Código' },
      ].map(({ icon: Icon, format, title }) => (
        <button
          key={format}
          type="button"
          onMouseDown={(e) => { e.preventDefault(); toggleFormat(format) }}
          className={`p-1.5 rounded transition-colors ${
            active[format]
              ? 'bg-primary/20 text-primary'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          }`}
          title={title}
        >
          <Icon className="w-4 h-4" />
        </button>
      ))}

      <span className="w-px h-5 mx-1 bg-border/50" />

      <button
        type="button"
        onMouseDown={(e) => { e.preventDefault(); editor.dispatchCommand('insertUnorderedList', undefined) }}
        className="p-1.5 rounded text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        title="Lista"
      >
        <List className="w-4 h-4" />
      </button>
      <button
        type="button"
        onMouseDown={(e) => { e.preventDefault(); editor.dispatchCommand('insertOrderedList', undefined) }}
        className="p-1.5 rounded text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        title="Lista numerada"
      >
        <ListOrdered className="w-4 h-4" />
      </button>
      <button
        type="button"
        onMouseDown={(e) => { e.preventDefault(); editor.dispatchCommand('formatBlock', '<blockquote>') }}
        className="p-1.5 rounded text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        title="Cita"
      >
        <Quote className="w-4 h-4" />
      </button>

      <span className="w-px h-5 mx-1 bg-border/50" />

      <button
        type="button"
        onMouseDown={(e) => { e.preventDefault(); insertLink() }}
        className="p-1.5 rounded text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        title="Enlace"
      >
        <LinkIcon className="w-4 h-4" />
      </button>
    </div>
  )
}

function LoadContent({ content }) {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    if (!content) return
    editor.update(() => {
      try {
        const parsed = typeof content === 'string' ? JSON.parse(content) : content
        if (parsed && parsed.root) {
          const newState = editor.parseEditorState(content)
          editor.setEditorState(newState)
        }
      } catch (e) {
        const root = $getRoot()
        root.clear()
        root.append($createParagraphNode())
      }
    })
  }, [editor])

  return null
}

function EditorRef({ setRef }) {
  const [editor] = useLexicalComposerContext()
  useEffect(() => {
    setRef(editor)
  }, [editor, setRef])
  return null
}

function $createHeadingNode(tag) {
  return { type: 'heading', tag, children: [] }
}

export default function NoteEditor({ note, onSave }) {
  const [title, setTitle] = useState('')
  const [editorRef, setEditorRef] = useState(null)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const debounceRef = useRef(null)
  const lastSaved = useRef({ title: '', content: '' })

  useEffect(() => {
    if (!note) return
    setTitle(note.title || '')
    lastSaved.current = { title: note.title || '', content: note.content || '' }
    setDirty(false)
    setSaving(false)
  }, [note?.id])

  const triggerSave = useCallback(() => {
    if (!editorRef || !note) return
    const currentTitle = title.trim() || 'Sin título'
    let currentContent = ''
    editorRef.getEditorState().read(() => {
      currentContent = JSON.stringify(editorRef.getEditorState().toJSON())
    })

    if (currentContent === lastSaved.current.content && currentTitle === lastSaved.current.title) {
      setDirty(false)
      return
    }

    setSaving(true)
    onSave({ title: currentTitle, content: currentContent })
    lastSaved.current = { title: currentTitle, content: currentContent }
    setDirty(false)
    setTimeout(() => setSaving(false), 600)
  }, [editorRef, title, note, onSave])

  const handleChange = useCallback(() => {
    setDirty(true)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(triggerSave, 2000)
  }, [triggerSave])

  const handleTitleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      e.target.blur()
    }
  }

  const initialConfig = {
    namespace: 'NoteEditor',
    theme,
    onError: (error) => console.error(error),
    nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, LinkNode],
    editorState: null,
  }

  if (!note) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p className="text-sm">Selecciona o crea una nota</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full border border-border/50 rounded-xl bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/50">
        <input
          type="text"
          value={title}
          onChange={(e) => { setTitle(e.target.value); setDirty(true); if (debounceRef.current) clearTimeout(debounceRef.current); debounceRef.current = setTimeout(triggerSave, 2000) }}
          onKeyDown={handleTitleKeyDown}
          placeholder="Título de la nota..."
          className="flex-1 text-base font-semibold bg-transparent border-none outline-none placeholder:text-muted-foreground/40"
        />
        {dirty && (
          <span className="text-[10px] text-muted-foreground/40 font-mono">sin guardar</span>
        )}
        {saving && (
          <span className="text-[10px] text-muted-foreground/40 font-mono">guardando...</span>
        )}
        {!dirty && !saving && (
          <Save className="w-3.5 h-3.5 text-muted-foreground/20" />
        )}
      </div>

      <LexicalComposer initialConfig={initialConfig}>
        <ToolbarPlugin />
        <div className="relative flex-1 overflow-y-auto">
          <RichTextPlugin
            contentEditable={
              <ContentEditable className="min-h-full p-4 text-sm focus:outline-none leading-relaxed" />
            }
            placeholder={
              <div className="absolute top-4 left-4 text-sm text-muted-foreground/40 pointer-events-none select-none">
                Escribe tu nota aquí...
              </div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
        </div>
        <HistoryPlugin />
        <OnChangePlugin onChange={handleChange} />
        <LoadContent content={note?.content} />
        <EditorRef setRef={setEditorRef} />
      </LexicalComposer>
    </div>
  )
}
