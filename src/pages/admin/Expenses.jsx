import { useState, useEffect, useCallback, useMemo } from 'react'
import { format, subMonths, addMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Wallet, Plus, Trash2, Pencil, ChevronLeft, ChevronRight,
  Tag, TrendingUp, PiggyBank, Receipt, Search, Save,
  ShoppingCart, Store, Utensils, Car, Home, Zap, Wifi, Shirt, Pill, CreditCard, Gift,
} from 'lucide-react'
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip as ReTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { formatCurrency } from '@/utils/formatUtils'
import {
  fetchCategories, createCategory, updateCategory, deleteCategory,
  fetchExpenses, createExpense, updateExpense, deleteExpense,
  fetchBudgets, setBudget,
  getExpensesForMonth, sumExpenses, groupByCategory, monthlySeries,
} from '@/utils/expenses'

const PALETTE = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16']
const CATEGORY_ICONS = [
  { name: 'ShoppingCart', Icon: ShoppingCart },
  { name: 'Store', Icon: Store },
  { name: 'Utensils', Icon: Utensils },
  { name: 'Car', Icon: Car },
  { name: 'Home', Icon: Home },
  { name: 'Zap', Icon: Zap },
  { name: 'Wifi', Icon: Wifi },
  { name: 'Shirt', Icon: Shirt },
  { name: 'Pill', Icon: Pill },
  { name: 'CreditCard', Icon: CreditCard },
  { name: 'Gift', Icon: Gift },
  { name: 'Tag', Icon: Tag },
]
const iconFor = (name) => CATEGORY_ICONS.find((i) => i.name === name)?.Icon || Tag

export default function Expenses() {
  const [viewDate, setViewDate] = useState(new Date())
  const [expenses, setExpenses] = useState([])
  const [categories, setCategories] = useState([])
  const [budgets, setBudgets] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const [category, setCategory] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [description, setDescription] = useState('')

  const [editing, setEditing] = useState(null)
  const [editCategory, setEditCategory] = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editTime, setEditTime] = useState('')
  const [editDescription, setEditDescription] = useState('')

  const [showCategories, setShowCategories] = useState(false)
  const [catName, setCatName] = useState('')
  const [catColor, setCatColor] = useState(PALETTE[0])
  const [catIcon, setCatIcon] = useState('Tag')
  const [editingCat, setEditingCat] = useState(null)
  const [budgetInput, setBudgetInput] = useState('')

  const monthKey = format(viewDate, 'yyyy-MM')
  const monthLabel = format(viewDate, "MMMM yyyy", { locale: es })

  const loadAll = useCallback(async () => {
    try {
      const [exp, cats, buds] = await Promise.all([
        fetchExpenses(), fetchCategories(), fetchBudgets(),
      ])
      setExpenses(exp)
      setCategories(cats)
      setBudgets(buds)
    } catch (e) {
      console.error(e)
      toast.error('No se pudieron cargar los gastos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  const monthExpenses = useMemo(
    () => getExpensesForMonth(expenses, monthKey),
    [expenses, monthKey],
  )
  const monthTotal = useMemo(() => sumExpenses(monthExpenses), [monthExpenses])
  const budget = useMemo(
    () => budgets.find((b) => b.month === monthKey)?.budget || 0,
    [budgets, monthKey],
  )
  const remaining = budget - monthTotal
  const byCategory = useMemo(
    () => groupByCategory(monthExpenses, categories),
    [monthExpenses, categories],
  )
  const series = useMemo(
    () => monthlySeries(expenses, monthKey),
    [expenses, monthKey],
  )
  const maxCategory = byCategory[0]?.total || 0

  const filtered = monthExpenses
    .filter((e) => {
      const q = search.trim().toLowerCase()
      if (!q) return true
      const cat = e.expand?.category
      return (
        (e.description || '').toLowerCase().includes(q) ||
        (cat?.name || '').toLowerCase().includes(q)
      )
    })
    .sort((a, b) =>
      `${a.expense_date || ''} ${a.expense_time || ''}`.localeCompare(
        `${b.expense_date || ''} ${b.expense_time || ''}`,
      ),
    )

  const resetForm = () => {
    setCategory('')
    setAmount('')
    setDate('')
    setTime('')
    setDescription('')
  }

  const handleCreate = async () => {
    const amt = parseFloat(amount)
    if (!category) return toast.error('Selecciona una categoría')
    if (!amt || amt <= 0) return toast.error('Ingresa un monto válido')
    if (!date) return toast.error('Ingresa la fecha')
    try {
      await createExpense({
        category, amount: amt, expense_date: date,
        expense_time: time || null, description,
      })
      toast.success('Gasto registrado')
      resetForm()
      loadAll()
    } catch (e) {
      console.error(e)
      toast.error('No se pudo registrar el gasto')
    }
  }

  const openEdit = (e) => {
    setEditing(e)
    setEditCategory(e.category || '')
    setEditAmount(String(e.amount ?? ''))
    setEditDate((e.expense_date || '').slice(0, 10))
    setEditTime(e.expense_time || '')
    setEditDescription(e.description || '')
  }

  const handleUpdate = async () => {
    const amt = parseFloat(editAmount)
    if (!editCategory) return toast.error('Selecciona una categoría')
    if (!amt || amt <= 0) return toast.error('Ingresa un monto válido')
    if (!editDate) return toast.error('Ingresa la fecha')
    try {
      await updateExpense(editing.id, {
        category: editCategory, amount: amt, expense_date: editDate,
        expense_time: editTime || null, description: editDescription,
      })
      toast.success('Gasto actualizado')
      setEditing(null)
      loadAll()
    } catch (e) {
      console.error(e)
      toast.error('No se pudo actualizar el gasto')
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteExpense(id)
      toast.success('Gasto eliminado')
      loadAll()
    } catch (e) {
      console.error(e)
      toast.error('No se pudo eliminar el gasto')
    }
  }

  const handleSaveBudget = async () => {
    const val = parseFloat(budgetInput)
    if (Number.isNaN(val) || val < 0) return toast.error('Presupuesto inválido')
    try {
      await setBudget(monthKey, val)
      toast.success('Presupuesto guardado')
      loadAll()
    } catch (e) {
      console.error(e)
      toast.error('No se pudo guardar el presupuesto')
    }
  }

  const openCategoryModal = (cat = null) => {
    setEditingCat(cat)
    setCatName(cat?.name || '')
    setCatColor(cat?.color || PALETTE[0])
    setCatIcon(cat?.icon || 'Tag')
  }

  const handleSaveCategory = async () => {
    if (!catName.trim()) return toast.error('Escribe un nombre')
    try {
      if (editingCat) {
        await updateCategory(editingCat.id, { name: catName.trim(), color: catColor, icon: catIcon })
        toast.success('Categoría actualizada')
      } else {
        await createCategory({ name: catName.trim(), color: catColor, icon: catIcon })
        toast.success('Categoría creada')
      }
      setShowCategories(false)
      loadAll()
    } catch (e) {
      console.error(e)
      toast.error('No se pudo guardar la categoría')
    }
  }

  const handleDeleteCategory = async (id) => {
    try {
      await deleteCategory(id)
      toast.success('Categoría eliminada')
      loadAll()
    } catch (e) {
      console.error(e)
      toast.error('No se pudo eliminar la categoría')
    }
  }

  const catColorOf = (id) =>
    categories.find((c) => c.id === id)?.color || '#64748b'

  const startEditBudget = () => setBudgetInput(String(budget || ''))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setViewDate((d) => subMonths(d, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-2xl font-extrabold capitalize">{monthLabel}</h1>
          <Button variant="ghost" size="icon" onClick={() => setViewDate((d) => addMonths(d, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowCategories(true)}>
          <Tag className="w-4 h-4 mr-1.5" /> Categorías
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
              <Receipt className="w-4 h-4" /> Gastado este mes
            </div>
            <p className="text-2xl font-extrabold">{formatCurrency(monthTotal)}</p>
            <p className="text-xs text-muted-foreground mt-1">{monthExpenses.length} gastos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
              <PiggyBank className="w-4 h-4" /> Presupuesto
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-extrabold">{formatCurrency(budget)}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={startEditBudget}>
                <Pencil className="w-3.5 h-3.5" />
              </Button>
            </div>
            {budgetInput !== '' && (
              <div className="flex gap-1 mt-1">
                <Input
                  type="number"
                  value={budgetInput}
                  onChange={(e) => setBudgetInput(e.target.value)}
                  className="h-7 text-sm"
                />
                <Button size="sm" className="h-7 px-2" onClick={handleSaveBudget}>
                  <Save className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
              <TrendingUp className="w-4 h-4" /> Restante
            </div>
            <p className={cn('text-2xl font-extrabold', remaining < 0 && 'text-destructive')}>
              {formatCurrency(remaining)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {remaining < 0 ? 'Superaste el presupuesto' : 'Disponible este mes'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
              <Wallet className="w-4 h-4" /> Promedio diario
            </div>
            <p className="text-2xl font-extrabold">
              {formatCurrency(viewDate.getDate() ? monthTotal / viewDate.getDate() : 0)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Promedio por día transcurrido</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">¿En qué gastas más?</CardTitle>
          </CardHeader>
          <CardContent>
            {byCategory.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Sin gastos este mes</p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={byCategory}
                      dataKey="total"
                      nameKey="name"
                      innerRadius="55%"
                      outerRadius="80%"
                      paddingAngle={2}
                      label
                    >
                      {byCategory.map((c) => (
                        <Cell key={c.id} fill={c.color} />
                      ))}
                    </Pie>
                    <ReTooltip
                      formatter={(v) => formatCurrency(v)}
                      contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Últimos 12 meses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={series} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <YAxis tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" tickFormatter={(v) => `$${Math.round(v / 1000)}k`} width={44} />
                  <ReTooltip
                    formatter={(v) => formatCurrency(v)}
                    contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8 }}
                  />
                  <Bar dataKey="total" name="Gasto" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top categories breakdown */}
      {byCategory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Detalle por categoría</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {byCategory.map((c) => (
              <div key={c.id} className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ background: c.color }} />
                <span className="text-sm font-medium w-40 truncate">{c.name}</span>
                <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${maxCategory ? (c.total / maxCategory) * 100 : 0}%`, background: c.color }}
                  />
                </div>
                <span className="text-sm font-semibold w-28 text-right">{formatCurrency(c.total)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Register form */}
        <Card className="lg:col-span-1 h-fit">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="w-4 h-4" /> Registrar gasto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Categoría</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: c.color }} />
                        {(() => { const Icon = iconFor(c.icon); return <Icon className="w-4 h-4" /> })()}
                        {c.name}
                      </span>
                    </SelectItem>
                  ))}
                  {categories.length === 0 && (
                    <SelectItem value="none" disabled>Sin categorías</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Monto</Label>
              <Input type="number" min="0" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Fecha</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Hora</Label>
                <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Input placeholder="¿En qué te gastaste?" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <Button className="w-full" onClick={handleCreate}>
              <Plus className="w-4 h-4 mr-1.5" /> Guardar gasto
            </Button>
          </CardContent>
        </Card>

        {/* List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Gastos del mes</CardTitle>
              <div className="relative w-56 max-w-full">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar"
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Cargando...</p>
              ) : filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No hay gastos registrados</p>
              ) : (
                <div className="space-y-2">
                  {filtered.map((e) => (
                    <div
                      key={e.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-muted/30"
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ background: catColorOf(e.category) }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {e.expand?.category?.name || 'Sin categoría'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {e.description || 'Sin descripción'} · {format(new Date(`${e.expense_date}${e.expense_time ? 'T' + e.expense_time : ''}`), 'dd MMM', { locale: es })}{e.expense_time ? ` · ${e.expense_time}` : ''}
                        </p>
                      </div>
                      <span className="text-sm font-bold">{formatCurrency(e.amount)}</span>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(e)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(e.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit expense dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar gasto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Categoría</Label>
              <Select value={editCategory} onValueChange={setEditCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Monto</Label>
              <Input type="number" min="0" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Fecha</Label>
                <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Hora</Label>
                <Input type="time" value={editTime} onChange={(e) => setEditTime(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={handleUpdate}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Categories dialog */}
      <Dialog open={showCategories} onOpenChange={setShowCategories}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Gestionar categorías</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2 rounded-lg border border-border/50 p-3">
              <Label>{editingCat ? 'Editar categoría' : 'Nueva categoría'}</Label>
              <Input
                placeholder="Nombre (ej: Comida, Transporte)"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
              />
              <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                {PALETTE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCatColor(c)}
                    className={cn(
                      'w-6 h-6 rounded-full transition-transform',
                      catColor === c && 'ring-2 ring-offset-2 ring-primary scale-110',
                    )}
                    style={{ background: c }}
                  />
                ))}
              </div>
              <Select value={catIcon} onValueChange={setCatIcon}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_ICONS.map(({ name, Icon }) => (
                    <SelectItem key={name} value={name}>
                      <span className="flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        {name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" className="w-full mt-2" onClick={handleSaveCategory}>
                <Save className="w-3.5 h-3.5 mr-1.5" /> {editingCat ? 'Actualizar' : 'Crear'}
              </Button>
            </div>
            <div className="space-y-2">
              {categories.map((c) => (
                <div key={c.id} className="flex items-center gap-3 rounded-lg border border-border/50 p-2.5">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ background: c.color }} />
                  {(() => { const Icon = iconFor(c.icon); return <Icon className="w-4 h-4 text-muted-foreground shrink-0" /> })()}
                  <span className="text-sm font-medium flex-1">{c.name}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openCategoryModal(c)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteCategory(c.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
              {categories.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Crea tu primera categoría
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}