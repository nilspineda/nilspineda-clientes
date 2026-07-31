import { useState, useEffect, useRef, useCallback } from 'react'
import { StickyNote, Plus, Trash2, FileText, Search, Calendar } from 'lucide-react'
import { fetchNotes, createNote, updateNote, deleteNote } from '@/utils/personalNotes'
import NoteEditor from '@/components/NoteEditor'

export default function Notes() {
  const [notes, setNotes] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [mobileList, setMobileList] = useState(true)
  const savingRef = useRef(false)

  const selected = notes.find((n) => n.id === selectedId)

  const loadNotes = useCallback(async () => {
    try {
      const data = await fetchNotes()
      setNotes(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadNotes()
  }, [loadNotes])

  const handleCreate = async () => {
    const note = await createNote({ title: 'Sin título', content: '' })
    setNotes((prev) => [note, ...prev])
    setSelectedId(note.id)
    setMobileList(false)
  }

  const handleDelete = async (e, id) => {
    e.stopPropagation()
    if (selectedId === id) setSelectedId(null)
    await deleteNote(id)
    setNotes((prev) => prev.filter((n) => n.id !== id))
  }

  const handleSave = async (id, data) => {
    if (savingRef.current) return
    savingRef.current = true
    try {
      await updateNote(id, data)
      setNotes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, ...data, updated: new Date().toISOString() } : n))
      )
    } catch (e) {
      console.error(e)
    } finally {
      savingRef.current = false
    }
  }

  const handleSelect = (id) => {
    setSelectedId(id)
    setMobileList(false)
  }

  const filtered = notes.filter((n) =>
    n.title?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-0 lg:gap-4">
      <div className={`${mobileList ? 'flex' : 'hidden'} lg:flex w-full lg:w-80 flex-col shrink-0 border border-border/50 rounded-xl bg-card overflow-hidden`}>
        <div className="p-3 border-b border-border/50 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <StickyNote className="w-4 h-4 text-primary" />
              Notas
            </h2>
            <button
              onClick={handleCreate}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Nueva
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-muted/50 border border-border/50 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-border/50">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileText className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm">No hay notas</p>
              <p className="text-xs opacity-60 mt-1">Crea una nueva nota</p>
            </div>
          ) : (
            filtered.map((note) => (
              <button
                key={note.id}
                onClick={() => handleSelect(note.id)}
                className={`w-full text-left px-3 py-3 transition-colors hover:bg-accent/50 ${
                  selectedId === note.id ? 'bg-accent border-l-2 border-l-primary' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {note.title || 'Sin título'}
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-0.5">
                      {new Date(note.updated || note.created).toLocaleDateString('es-CO', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, note.id)}
                    className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className={`${!mobileList ? 'flex' : 'hidden'} lg:flex flex-1 flex-col`}>
        {selected ? (
          <>
            <div className="flex items-center gap-3 mb-3 lg:hidden">
              <button
                onClick={() => setMobileList(true)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Volver
              </button>
            </div>
            <NoteEditor
              key={selected.id}
              note={selected}
              onSave={(data) => handleSave(selected.id, data)}
            />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <FileText className="w-12 h-12 mb-3 opacity-20" />
            <p className="text-sm">Selecciona una nota o crea una nueva</p>
          </div>
        )}
      </div>
    </div>
  )
}
