import { useState, useCallback, useEffect } from 'react'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import { ListItemNode, ListNode } from '@lexical/list'
import { LinkNode } from '@lexical/link'
import { $getRoot, $createParagraphNode, $createTextNode, $getSelection } from 'lexical'

const theme = {
  paragraph: 'mb-2',
  heading: {
    h1: 'text-2xl font-bold mb-4',
    h2: 'text-xl font-bold mb-3',
    h3: 'text-lg font-semibold mb-2',
  },
  list: {
    ul: 'list-disc ml-6 mb-4',
    ol: 'list-decimal ml-6 mb-4',
    listitem: 'mb-1',
  },
  quote: 'border-l-4 border-primary pl-4 italic text-muted-foreground mb-4',
  link: 'text-primary underline',
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
  const [activeFormats, setActiveFormats] = useState({})

  const updateToolbar = useCallback(() => {
    editor.getEditorState().read(() => {
      const selection = $getSelection()
      if (selection) {
        setActiveFormats({
          bold: selection.hasFormat('bold'),
          italic: selection.hasFormat('italic'),
          underline: selection.hasFormat('underline'),
          strikethrough: selection.hasFormat('strikethrough'),
          code: selection.hasFormat('code'),
        })
      }
    })
  }, [editor])

  const formatText = (format) => {
    editor.update(() => {
      const selection = $getSelection()
      if (selection) {
        selection.formatText(format)
      }
    })
  }

  const insertLink = () => {
    const url = prompt('Ingresa la URL:')
    if (url) {
      editor.update(() => {
        const selection = $getSelection()
        if (selection) {
          const linkNode = LinkNode.create(url)
          selection.insertNodes([linkNode])
        }
      })
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 border-b border-border bg-muted/50 rounded-t-lg">
      <button
        type="button"
        onClick={() => formatText('bold')}
        className={`p-2 rounded hover:bg-muted transition-colors ${activeFormats.bold ? 'bg-primary/20 text-primary' : 'text-muted-foreground'}`}
        title="Negrita"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => formatText('italic')}
        className={`p-2 rounded hover:bg-muted transition-colors ${activeFormats.italic ? 'bg-primary/20 text-primary' : 'text-muted-foreground'}`}
        title="Cursiva"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 4h4m-2 0v16m-4 0h8" transform="skewX(-10)" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => formatText('underline')}
        className={`p-2 rounded hover:bg-muted transition-colors ${activeFormats.underline ? 'bg-primary/20 text-primary' : 'text-muted-foreground'}`}
        title="Subrayado"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v7a5 5 0 0010 0V4M5 20h14" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => formatText('strikethrough')}
        className={`p-2 rounded hover:bg-muted transition-colors ${activeFormats.strikethrough ? 'bg-primary/20 text-primary' : 'text-muted-foreground'}`}
        title="Tachado"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12h16M9 6h6m-3 12h6" />
        </svg>
      </button>
      <button
        type="button"
        onClick={insertLink}
        className="p-2 rounded hover:bg-muted transition-colors text-muted-foreground"
        title="Insertar Link"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      </button>
    </div>
  )
}

function InitialContentPlugin({ content }) {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    if (content && editor) {
      editor.update(() => {
        const root = $getRoot()
        root.clear()
        if (content.trim()) {
          const paragraph = $createParagraphNode()
          const lines = content.split('\n')
          lines.forEach((line, index) => {
            const textNode = $createTextNode(line)
            paragraph.append(textNode)
            if (index < lines.length - 1) {
              paragraph.append($createTextNode('\n'))
            }
          })
          root.append(paragraph)
        } else {
          root.append($createParagraphNode())
        }
      })
    }
  }, [content, editor])

  return null
}

function EditorRefPlugin({ setEditorRef }) {
  const [editor] = useLexicalComposerContext()
  useEffect(() => {
    setEditorRef(editor)
  }, [editor, setEditorRef])
  return null
}

export default function LexicalEditor({ value, onChange }) {
  const [isEditing, setIsEditing] = useState(false)
  const [localValue, setLocalValue] = useState(value || '')
  const [editorRef, setEditorRef] = useState(null)

  const handleSave = useCallback(() => {
    if (editorRef) {
      editorRef.getEditorState().read(() => {
        const root = $getRoot()
        const children = root.getChildren()
        const text = children.map(child => {
          if (child.getTextContent) {
            return child.getTextContent()
          }
          return ''
        }).join('\n')
        onChange(text)
      })
    } else {
      onChange(localValue)
    }
    setIsEditing(false)
  }, [editorRef, localValue, onChange])

  const handleChange = useCallback((editorState) => {
    editorState.read(() => {
      const root = $getRoot()
      const children = root.getChildren()
      const text = children.map(child => child.getTextContent()).join('\n')
      setLocalValue(text)
    })
  }, [])

  const initialConfig = {
    namespace: 'LexicalEditor',
    theme,
    onError: (error) => console.error(error),
    nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, LinkNode],
    editorState: null,
  }

  if (!isEditing) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground">Accesos y Links</h3>
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-primary/20 hover:bg-primary text-primary hover:text-primary-foreground rounded-lg font-medium text-sm transition-all"
          >
            Editar
          </button>
        </div>
        
        {value ? (
          <div 
            className="prose prose-invert max-w-none p-4 bg-muted/30 rounded-lg min-h-[100px]"
            dangerouslySetInnerHTML={{ __html: value.replace(/\n/g, '<br/>') }}
          />
        ) : (
          <div className="text-center py-8 bg-muted/30 rounded-lg">
            <svg className="w-10 h-10 mx-auto mb-3 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <p className="text-muted-foreground font-medium">No hay accesos registrados</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-foreground">Accesos y Links</h3>
      </div>

      <LexicalComposer initialConfig={initialConfig}>
        <ToolbarPlugin />
        <RichTextPlugin
          contentEditable={<ContentEditable className="min-h-[150px] p-4 bg-muted/30 rounded-b-lg text-foreground focus:outline-none" />}
          placeholder={<div className="text-muted-foreground p-4 absolute top-0">Escribe los accesos y links aquí...</div>}
          ErrorBoundary={LexicalErrorBoundary}
        />
        <HistoryPlugin />
        <OnChangePlugin onChange={handleChange} />
        <InitialContentPlugin content={isEditing ? localValue : value} />
        <EditorRefPlugin setEditorRef={setEditorRef} />
      </LexicalComposer>

      <div className="flex gap-3">
        <button
          onClick={handleSave}
          className="flex-1 bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary-light transition-colors font-medium"
        >
          Guardar
        </button>
        <button
          onClick={() => { setLocalValue(value || ''); setIsEditing(false) }}
          className="flex-1 px-6 py-3 border border-border rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors font-medium"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}