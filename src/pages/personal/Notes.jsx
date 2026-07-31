import { useState, useEffect, useRef, useCallback } from 'react'
import { StickyNote, Plus, Trash2, FileText, Search, Tag, Pencil } from 'lucide-react'
import { fetchNotes, createNote, updateNote, deleteNote } from '@/utils/personalNotes'
import { fetchCategories, createCategory, renameCategory, deleteCategory } from '@/utils/personalNoteCategories'
import NoteEditor from '@/components/NoteEditor'

const PALETTE = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16']

export default function Notes() {
  const [notes, setNotes] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [addingCategory, setAddingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryColor, setNewCategoryColor] = useState(PALETTE[0])
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

  const loadCategories = useCallback(async () => {
    try {
      const data = await fetchCategories()
      setCategories(data)
    } catch (e) {
      console.error(e)
      setCategories([])
    }
  }, [])

  useEffect(() => {
    loadNotes()
  }, [loadNotes])

  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  const categoryById = (id) => categories.find((c) => c.id === id)

  const handleCreate = async () => {
    const category = categoryFilter !== 'all' && categoryFilter !== 'none' ? categoryFilter : null
    const note = await createNote({ title: 'Sin título', content: '', category })
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

  const handleAssignCategory = async (id, categoryId) => {
    try {
      await updateNote(id, { category: categoryId || null })
      setNotes((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, category: categoryId || null, updated: new Date().toISOString() } : n
        )
      )
    } catch (e) {
      console.error(e)
    }
  }

  const handleCreateCategory = async () => {
    const name = newCategoryName.trim()
    if (!name) return
    try {
      const cat = await createCategory(name, newCategoryColor)
      setCategories((prev) => [...prev, cat])
      setNewCategoryName('')
      setAddingCategory(false)
    } catch (e) {
      console.error(e)
    }
  }

  const handleRenameCategory = async (cat) => {
    const name = window.prompt('Nombre de la categoría:', cat.name)
    if (name == null) return
    const trimmed = name.trim()
    if (!trimmed || trimmed === cat.name) return
    try {
      await renameCategory(cat.id, trimmed)
      setCategories((prev) => prev.map((c) => (c.id === cat.id ? { ...c, name: trimmed } : c)))
    } catch (e) {
      console.error(e)
    }
  }

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('¿Eliminar esta categoría? Las notas quedarán sin categoría.')) return
    try {
      await deleteCategory(id)
      setCategories((prev) => prev.filter((c) => c.id !== id))
      setNotes((prev) => prev.map((n) => (n.category === id ? { ...n, category: null } : n)))
      if (categoryFilter === id) setCategoryFilter('all')
    } catch (e) {
      console.error(e)
    }
  }

  const filtered = notes.filter((n) => {
    if (search && !n.title?.toLowerCase().includes(search.toLowerCase())) return false
    if (categoryFilter === 'none') return !n.category
    if (categoryFilter !== 'all') return n.category === categoryFilter
    return true
  })

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

        <div className="px-3 py-2 border-b border-border/50">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <Tag className="w-3 h-3" />
              Categorías
            </span>
            <button
              onClick={() => setAddingCategory(!addingCategory)}
              className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              title="Nueva categoría"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {addingCategory && (
            <div className="mt-2 space-y-2">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreateCategory() }}
                placeholder="Nombre de la categoría..."
                autoFocus
                className="w-full px-2.5 py-1.5 text-xs bg-muted/50 border border-border/50 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50"
              />
              <div className="flex items-center gap-1.5 flex-wrap">
                {PALETTE.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewCategoryColor(color)}
                    className={`w-4 h-4 rounded-full transition-transform ${newCategoryColor === color ? 'ring-2 ring-offset-1 ring-primary scale-110' : ''}`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
              <button
                onClick={handleCreateCategory}
                className="w-full px-2.5 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors"
              >
                Crear categoría
              </button>
            </div>
          )}

          <div className="flex flex-wrap gap-1 mt-2">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-2 py-0.5 rounded-full border text-[11px] transition-colors ${categoryFilter === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'border-border/50 hover:bg-accent'}`}
            >
              Todas
            </button>
            <button
              onClick={() => setCategoryFilter('none')}
              className={`px-2 py-0.5 rounded-full border text-[11px] transition-colors ${categoryFilter === 'none' ? 'bg-primary text-primary-foreground border-primary' : 'border-border/50 hover:bg-accent'}`}
            >
              Sin categoría
            </button>
            {categories.map((cat) => (
              <div
                key={cat.id}
                onClick={() => setCategoryFilter(categoryFilter === cat.id ? 'all' : cat.id)}
                className={`group flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] cursor-pointer transition-colors ${categoryFilter === cat.id ? 'bg-primary text-primary-foreground border-primary' : 'border-border/50 hover:bg-accent'}`}
                title={cat.name}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color || '#10b981' }} />
                <span className="max-w-[80px] truncate">{cat.name}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleRenameCategory(cat) }}
                  className={`shrink-0 opacity-0 group-hover:opacity-100 transition-opacity hover:text-foreground ${categoryFilter === cat.id ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}
                  title="Renombrar"
                >
                  <Pencil className="w-2.5 h-2.5" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat.id) }}
                  className={`shrink-0 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-400 ${categoryFilter === cat.id ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}
                  title="Eliminar"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
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
              <div
                key={note.id}
                onClick={() => handleSelect(note.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleSelect(note.id)
                  }
                }}
                role="button"
                tabIndex={0}
                className={`w-full text-left px-3 py-3 transition-colors cursor-pointer hover:bg-accent/50 focus:outline-none focus-visible:bg-accent/50 ${selectedId === note.id ? 'bg-accent border-l-2 border-l-primary' : ''}`}
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
                    {note.category && categoryById(note.category) && (
                      <span className="inline-flex items-center gap-1 mt-0.5 text-[10px] text-muted-foreground/60">
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: categoryById(note.category).color || '#10b981' }}
                        />
                        {categoryById(note.category).name}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, note.id)}
                    className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
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
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
                <Tag className="w-3 h-3" />
                Categoría
              </span>
              <select
                value={selected.category || ''}
                onChange={(e) => handleAssignCategory(selected.id, e.target.value)}
                className="flex-1 max-w-xs px-3 py-1.5 text-xs bg-background border border-border/50 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Sin categoría</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
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
